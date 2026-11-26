"""Servicio de importación para contenido público que el usuario puede descargar."""
import json
from importlib.metadata import version as package_version, PackageNotFoundError
import os
import re
import signal
import subprocess
import tempfile
import threading
import time
from collections import deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs, urlencode
from public_media import fetch_public, PublicFetchError, HTML_TYPES
from tiktok_public import fetch_tiktok_download, TikTokDownloadUnavailable

PORT = int(os.environ.get("PORT", "8080"))
ORIGINS = {
    value.rstrip("/") for value in (
        os.environ.get("ALLOWED_ORIGIN", "https://poldkent.github.io"),
        os.environ.get("RENDER_EXTERNAL_URL", ""),
        f"http://localhost:{PORT}", f"http://127.0.0.1:{PORT}",
    ) if value
}
WEB_ROOT = Path(os.environ.get("WEB_ROOT", str(Path(__file__).resolve().parent.parent)))
STATIC_FILES = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/i18n.js": ("i18n.js", "text/javascript; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
    "/assets/logo.svg": ("assets/logo.svg", "image/svg+xml"),
    "/style.css": ("style.css", "text/css; charset=utf-8"),
    "/vendor/shirtep/local-send.js": ("vendor/shirtep/local-send.js", "text/javascript; charset=utf-8"),
    "/vendor/shirtep/convert.js": ("vendor/shirtep/convert.js", "text/javascript; charset=utf-8"),
    "/vendor/shirtep/LICENSE.md": ("vendor/shirtep/LICENSE.md", "text/plain; charset=utf-8"),
}
MAX_BYTES = 80 * 1024 * 1024
MAX_DURATION = 600
# Sort by the short edge; vertical videos must not be filtered by height.
FORMAT_SELECTOR = "bv*+ba/b"
FORMAT_SORT = "res:480,vcodec:h264,acodec:aac"
SERVICE_VERSION = '2026.11.26.21'
MAX_CLIP_DURATION = 60
MAX_CLIP_BYTES = 16 * 1024 * 1024
try:
    DOWNLOADER_VERSION = package_version('yt-dlp')
except PackageNotFoundError:
    DOWNLOADER_VERSION = None
SLOTS = threading.BoundedSemaphore(1)
LOCK = threading.Lock()
RECENT = deque()
ID = r"[A-Za-z0-9_-]+"

def normalize_url(value):
    if not isinstance(value, str) or len(value) > 2048:
        raise ValueError("Enlace no válido.")
    u = urlsplit(value.strip())
    if u.scheme != "https" or u.username or u.password or u.port not in (None, 443):
        raise ValueError("Solo se admiten enlaces HTTPS públicos.")
    host, path = u.hostname, u.path.rstrip("/")
    if host in ("youtube.com", "www.youtube.com", "m.youtube.com"):
        if path == "/watch":
            video = parse_qs(u.query).get("v", [""])[0]
        elif re.fullmatch(r"/shorts/" + ID, path):
            video = path.split("/")[-1]
        else:
            video = ""
        if re.fullmatch(r"[A-Za-z0-9_-]{11}", video):
            return "https://www.youtube.com/watch?" + urlencode({"v": video})
    if host == "youtu.be" and re.fullmatch(r"/[A-Za-z0-9_-]{11}", path):
        return "https://www.youtube.com/watch?v=" + path[1:]
    if host in ("instagram.com", "www.instagram.com") and re.fullmatch(r"/(?:reel|reels|p|tv)/" + ID, path):
        return "https://www.instagram.com" + path + "/"
    if host in ("tiktok.com", "www.tiktok.com", "m.tiktok.com") and re.fullmatch(r"/@[A-Za-z0-9_.-]+/video/[0-9]+", path):
        return "https://www.tiktok.com" + path
    if host in ("vm.tiktok.com", "vt.tiktok.com") and re.fullmatch(r"/" + ID, path):
        return "https://" + host + path + "/"
    if host in ("tiktok.com", "www.tiktok.com") and re.fullmatch(r"/t/" + ID, path):
        return "https://www.tiktok.com" + path + "/"
    raise ValueError("Usa un enlace individual de TikTok, Instagram Reel o YouTube Short.")

class ImportFailure(ValueError):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code

def classify_download_error(log, returncode=1):
    msg = log.lower().replace("’", "'")
    # Expose only fixed, safe messages; downloader logs may contain URLs or tokens.
    if any(x in msg for x in ("confirm you're not a bot", "confirm you are not a bot", "bot detection", "bot check")):
        return ImportFailure("SOURCE_BOT_CHECK", "YouTube ha bloqueado la descarga desde el servidor y exige una comprobación de acceso. No se puede importar este enlace automáticamente. Si tienes permiso para usar el video, sube el archivo original.")
    if any(x in msg for x in ("private video", "login required", "sign in", "login to", "cookies", "age-restricted", "members-only")):
        return ImportFailure("SOURCE_ACCESS", "La plataforma exige iniciar sesión o concede acceso restringido a este video. Importa un archivo que tengas permiso para utilizar.")
    if "does not pass filter" in msg or "does not pass the filter" in msg or "duration <= 600" in msg:
        return ImportFailure("SOURCE_DURATION", "El video supera 10 minutos, es una transmisión en directo o no cumple el límite de duración.")
    if any(x in msg for x in ("larger than max-filesize", "larger than max", "file size limit", "max-filesize", "file too large")):
        return ImportFailure("SOURCE_SIZE", "El video supera el tamaño permitido para la descarga. Selecciona un archivo más corto o comprimido.")
    if any(x in msg for x in ("http error 429", "too many requests", "http error 403", "forbidden")):
        return ImportFailure("SOURCE_BLOCKED", "La plataforma rechazó la solicitud del servidor (acceso limitado o demasiadas peticiones). Prueba con otro video autorizado o importa el archivo.")
    if any(x in msg for x in ("javascript runtime", "signature solving", "challenge solving", "ejs")):
        return ImportFailure("SOURCE_JS", "El descargador no pudo procesar la respuesta de la plataforma. Requiere revisión de compatibilidad.")
    if any(x in msg for x in ("requested format is not available", "no video formats", "no suitable formats")):
        return ImportFailure("SOURCE_FORMAT", "No se encontró un formato de video con sonido accesible. Puede que la publicación no ofrezca ambos recursos.")
    if any(x in msg for x in ("video unavailable", "not available", "removed", "deleted", "not found")):
        return ImportFailure("SOURCE_UNAVAILABLE", "La publicación no está disponible para el servidor.")
    if returncode < 0:
        return ImportFailure("RESOURCE_LIMIT", "La descarga superó un límite de recursos del servidor.")
    return ImportFailure("DOWNLOAD_FAILED", "No se pudo obtener el video. El servidor no recibió un archivo válido; prueba otro enlace autorizado.")

def run(args, timeout):
    # Bounded output on disk; never expose raw upstream diagnostics.
    with tempfile.TemporaryFile() as log:
        with subprocess.Popen(
            ["prlimit", "--fsize=" + str(MAX_BYTES), "--"] + args,
            stdout=log, stderr=subprocess.STDOUT, start_new_session=True,
        ) as process:
            try:
                rc = process.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait()
                raise
        size = log.seek(0, os.SEEK_END)
        log.seek(max(0, size - 32768))
        return rc, log.read().decode("utf-8", errors="replace")

def fetch_video(url, directory):
    src = str(directory / "source.%(ext)s")
    rc, log = run([
        "yt-dlp", "--ignore-config", "--no-cache-dir", "--no-playlist",
        "--no-progress", "--socket-timeout", "10",
        "--retries", "1", "--fragment-retries", "1", "--max-filesize", "50M",
        "--match-filters", f"duration <= {MAX_DURATION} & !is_live",
        "--js-runtimes", "node",
        "-f", FORMAT_SELECTOR, "-S", FORMAT_SORT,
        "--merge-output-format", "mp4/mkv", "-o", src, "--", url,
    ], 100)
    files = [p for p in directory.glob("source.*") if p.suffix in (".mp4", ".mkv", ".webm", ".mov", ".m4v")]
    if rc or len(files) != 1:
        failure = classify_download_error(log, rc)
        if urlsplit(url).hostname == 'www.tiktok.com' and failure.code in ('SOURCE_FORMAT', 'DOWNLOAD_FAILED'):
            try:
                files = [fetch_tiktok_download(url, directory)]
            except TikTokDownloadUnavailable as error:
                raise ImportFailure(failure.code, str(failure) + ' Alternativa de descarga pública: ' + str(error)) from None
        else:
            raise failure
    if not 0 < files[0].stat().st_size <= MAX_BYTES:
        raise ImportFailure("SOURCE_SIZE", "El archivo descargado está vacío o supera 80 MB.")
    # A compatible original can be remuxed instead of re-encoded.
    probe_rc, probe_log = run([
        "ffprobe", "-v", "error", "-protocol_whitelist", "file,pipe", "-show_entries", "stream=codec_name,codec_type:format=duration",
        "-of", "json", str(files[0]),
    ], 10)
    try:
        probe = json.loads(probe_log) if probe_rc == 0 else {}
        streams = probe["streams"]
        duration = float(probe["format"]["duration"])
        if not 0 < duration <= MAX_DURATION + 1:
            raise ImportFailure("SOURCE_DURATION", "El video supera el máximo de 10 minutos.")
        video_codec = next((s["codec_name"] for s in streams if s["codec_type"] == "video"), None)
        audio_codec = next((s["codec_name"] for s in streams if s["codec_type"] == "audio"), None)
        if not video_codec or not audio_codec:
            raise ImportFailure("SOURCE_NO_TRACK", "El archivo descargado no contiene ambas pistas: video y sonido. Selecciona otro contenido o combina un video con audio en el editor.")
    except ImportFailure:
        raise
    except (KeyError, StopIteration, TypeError, ValueError):
        raise ImportFailure("SOURCE_FORMAT", "El archivo no contiene video y audio compatibles.") from None
    output = directory / "video.mp4"
    base = [
        "ffmpeg", "-nostdin", "-v", "error", "-protocol_whitelist", "file,pipe", "-i", str(files[0]),
        "-map", "0:v:0", "-map", "0:a:0",
    ]
    if video_codec == "h264" and audio_codec == "aac":
        rc, _ = run(base + ["-c", "copy", "-movflags", "+faststart", str(output)], 20)
        if rc == 0 and output.exists() and 0 < output.stat().st_size <= MAX_BYTES:
            return output
        output.unlink(missing_ok=True)
    rc, _ = run(base + [
        "-vf", "scale=480:480:force_original_aspect_ratio=decrease:force_divisible_by=2",
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "25",
        "-maxrate", "800k", "-bufsize", "1600k", "-threads", "2",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k",
        "-movflags", "+faststart", str(output),
    ], 70)
    if rc or not output.exists() or not 0 < output.stat().st_size <= MAX_BYTES:
        raise ImportFailure("CONVERSION_FAILED", "El video se descargó, pero no pudo convertirse a MP4 con audio dentro de los límites del servidor.")
    return output


def convert_clip(source, output):
    # Only accept a browser-generated WebM, not playlists or arbitrary FFmpeg input.
    with source.open("rb") as file:
        if file.read(4) != b"\x1a\x45\xdf\xa3":
            raise ImportFailure("CLIP_FORMAT", "El archivo no es un WebM compatible.")
    rc, _ = run([
        "ffmpeg", "-nostdin", "-v", "error",
        "-protocol_whitelist", "file,pipe", "-f", "matroska",
        "-threads", "2", "-i", str(source),
        "-map", "0:v:0", "-map", "0:a:0", "-t", str(MAX_CLIP_DURATION),
        "-vf", "scale=512:512:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=512:512:(ow-iw)/2:(oh-ih)/2",
        "-c:v", "libx264", "-profile:v", "baseline", "-preset", "veryfast",
        "-pix_fmt", "yuv420p", "-r", "30", "-crf", "23", "-maxrate", "1500k", "-bufsize", "3000k",
        "-threads", "2", "-c:a", "aac", "-b:a", "96k",
        "-movflags", "+faststart", str(output),
    ], 90)
    if rc or not output.exists() or not 0 < output.stat().st_size <= MAX_CLIP_BYTES:
        raise ImportFailure("CLIP_CONVERSION", "No se pudo preparar el MP4 con sonido.")
    return output


class Handler(BaseHTTPRequestHandler):
    def setup(self):
        super().setup()
        self.connection.settimeout(15)

    def cors(self):
        origin = self.headers.get("Origin")
        if origin in ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Vary", "Origin")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")

    def reply(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        route = urlsplit(self.path).path
        if route == "/health":
            self.reply(200, {"ok": True, "version": SERVICE_VERSION, "maxDuration": MAX_DURATION, "downloader": DOWNLOADER_VERSION, "publicMedia": True, "clipMp4": True, "maxClipDuration": MAX_CLIP_DURATION, "tiktokPublicDownload": True})
            return
        asset = STATIC_FILES.get(route)
        if not asset:
            self.reply(404, {"error": "Ruta no encontrada."})
            return
        filename, content_type = asset
        try:
            body = (WEB_ROOT / filename).read_bytes()
        except OSError:
            self.reply(404, {"error": "Archivo no disponible."})
            return
        self.send_response(200)
        self.cors()
        self.send_header("Content-Type", content_type)
        self.send_header("Cache-Control", "no-cache" if route in ("/", "/index.html") else "public, max-age=3600")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            pass

    def do_OPTIONS(self):
        if self.path not in ("/api/import", "/api/media", "/api/clip-mp4") or self.headers.get("Origin") not in ORIGINS:
            self.reply(403, {"error": "Origen no permitido."})
            return
        self.send_response(204)
        self.cors()
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        if self.path not in ("/api/import", "/api/media", "/api/clip-mp4") or self.headers.get("Origin") not in ORIGINS:
            self.reply(403, {"error": "Origen o ruta no permitidos."})
            return
        if self.path == "/api/clip-mp4":
            self.convert_uploaded_clip()
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 4096 or self.headers.get_content_type() != "application/json":
                raise ValueError("Solicitud no válida.")
            payload = json.loads(self.rfile.read(length))
            url = payload.get("url") if isinstance(payload, dict) else None
            if self.path == "/api/import":
                url = normalize_url(url)
            elif not isinstance(url, str) or not url.startswith("https://"):
                raise ValueError()
        except (ValueError, TypeError, TimeoutError):
            self.reply(400, {"error": "Introduce un enlace HTTPS público válido."})
            return
        if not SLOTS.acquire(blocking=False):
            self.reply(429, {"error": "El servicio está ocupado. Reintenta en unos segundos."})
            return
        try:
            with LOCK:
                now = time.monotonic()
                while RECENT and RECENT[0] <= now - 60:
                    RECENT.popleft()
                allowed = len(RECENT) < 4
                if allowed:
                    RECENT.append(now)
            if not allowed:
                self.reply(429, {"error": "Límite temporal de importaciones alcanzado."})
                return
            with tempfile.TemporaryDirectory(prefix="sticker-") as temp:
                try:
                    if self.path == "/api/media":
                        path = Path(temp) / "resource"
                        content_type, final_url = fetch_public(url, path)
                        if content_type in HTML_TYPES:
                            self.reply(200, {"html": path.read_bytes().decode("utf-8", errors="replace"), "url": final_url})
                            return
                    else:
                        path = fetch_video(url, Path(temp))
                        content_type = "video/mp4"
                except subprocess.TimeoutExpired:
                    self.reply(504, {"error": "La descarga o conversión excedió el tiempo disponible."})
                    return
                except PublicFetchError as error:
                    self.reply(422, {"error": str(error), "code": "PUBLIC_RESOURCE"})
                    return
                except ImportFailure as error:
                    print("Importación fallida: " + error.code, flush=True)
                    self.reply(422, {"error": str(error), "code": error.code})
                    return
                except ValueError:
                    self.reply(422, {"error": "El archivo recibido no tiene metadatos compatibles.", "code": "SOURCE_FORMAT"})
                    return
                except OSError:
                    self.reply(503, {"error": "El servicio de descarga no está disponible."})
                    return
                self.send_response(200)
                self.cors()
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Disposition", "attachment")
                self.send_header("Content-Length", str(path.stat().st_size))
                self.end_headers()
                with path.open("rb") as video:
                    while chunk := video.read(65536):
                        self.wfile.write(chunk)
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            pass
        finally:
            SLOTS.release()

    def convert_uploaded_clip(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= MAX_CLIP_BYTES or self.headers.get_content_type() != "video/webm":
                raise ValueError()
        except ValueError:
            self.reply(400, {"error": "Se requiere un WebM de hasta 16 MiB."})
            return
        if not SLOTS.acquire(blocking=False):
            self.reply(429, {"error": "El servicio está ocupado. Reintenta en unos segundos."})
            return
        try:
            with LOCK:
                now = time.monotonic()
                while RECENT and RECENT[0] <= now - 60:
                    RECENT.popleft()
                allowed = len(RECENT) < 4
                if allowed:
                    RECENT.append(now)
            if not allowed:
                self.reply(429, {"error": "Límite temporal alcanzado."})
                return
            with tempfile.TemporaryDirectory(prefix="clip-") as temp:
                source = Path(temp) / "source.webm"
                deadline = time.monotonic() + 30
                with source.open("wb") as file:
                    remaining = length
                    while remaining:
                        if time.monotonic() > deadline:
                            raise TimeoutError()
                        chunk = self.rfile.read1(min(65536, remaining))
                        if not chunk:
                            raise ImportFailure("CLIP_INCOMPLETE", "El clip recibido está incompleto.")
                        file.write(chunk)
                        remaining -= len(chunk)
                output = convert_clip(source, Path(temp) / "sticker.mp4")
                self.send_response(200)
                self.cors()
                self.send_header("Content-Type", "video/mp4")
                self.send_header("Content-Disposition", "attachment")
                self.send_header("Content-Length", str(output.stat().st_size))
                self.end_headers()
                with output.open("rb") as file:
                    while chunk := file.read(65536):
                        self.wfile.write(chunk)
        except ImportFailure as error:
            self.reply(422, {"error": str(error), "code": error.code})
        except subprocess.TimeoutExpired:
            self.reply(504, {"error": "La preparación del MP4 tardó demasiado."})
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            pass
        except OSError:
            self.reply(503, {"error": "No se pudo preparar el MP4."})
        finally:
            SLOTS.release()


if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()

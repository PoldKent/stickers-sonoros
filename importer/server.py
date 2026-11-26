"""Servicio de importación para contenido público que el usuario puede descargar."""
import json
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
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
    "/style.css": ("style.css", "text/css; charset=utf-8"),
    "/vendor/shirtep/convert.js": ("vendor/shirtep/convert.js", "text/javascript; charset=utf-8"),
    "/vendor/shirtep/LICENSE.md": ("vendor/shirtep/LICENSE.md", "text/plain; charset=utf-8"),
}
MAX_BYTES = 80 * 1024 * 1024
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

def run(args, timeout):
    # No shell, no cookies, no user-supplied flags; kill the whole process group on timeout.
    with subprocess.Popen(
        ["prlimit", "--fsize=" + str(MAX_BYTES), "--"] + args,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        start_new_session=True,
    ) as process:
        try:
            return process.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            os.killpg(process.pid, signal.SIGKILL)
            process.wait()
            raise

def fetch_video(url, directory):
    src = str(directory / "source.%(ext)s")
    rc = run([
        "yt-dlp", "--ignore-config", "--no-cache-dir", "--no-playlist",
        "--no-progress", "--no-warnings", "--socket-timeout", "10",
        "--retries", "1", "--fragment-retries", "1", "--max-filesize", "50M",
        "--match-filters", "duration <= 180 & !is_live",
        "--js-runtimes", "node",
        "-f", "bv*[height<=720]+ba/b[height<=720]",
        "--merge-output-format", "mkv", "-o", src, "--", url,
    ], 65)
    files = [p for p in directory.glob("source.*") if p.suffix in (".mp4", ".mkv", ".webm", ".mov", ".m4v")]
    if rc or len(files) != 1 or files[0].stat().st_size > MAX_BYTES:
        raise ValueError("No se pudo descargar el video público. Puede estar bloqueado, requerir acceso, durar más de 3 minutos o superar el límite.")
    output = directory / "video.mp4"
    rc = run([
        "ffmpeg", "-nostdin", "-v", "error", "-i", str(files[0]),
        "-map", "0:v:0", "-map", "0:a:0", "-t", "180",
        "-vf", "scale=720:720:force_original_aspect_ratio=decrease:force_divisible_by=2",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "24",
        "-threads", "2", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k",
        "-movflags", "+faststart", str(output),
    ], 35)
    if rc or not output.exists() or not 0 < output.stat().st_size <= MAX_BYTES:
        raise ValueError("No se pudo convertir a MP4 con sonido.")
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
            self.reply(200, {"ok": True})
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
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        try:
            self.wfile.write(body)
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            pass

    def do_OPTIONS(self):
        if self.path != "/api/import" or self.headers.get("Origin") not in ORIGINS:
            self.reply(403, {"error": "Origen no permitido."})
            return
        self.send_response(204)
        self.cors()
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        if self.path != "/api/import" or self.headers.get("Origin") not in ORIGINS:
            self.reply(403, {"error": "Origen o ruta no permitidos."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 4096 or self.headers.get_content_type() != "application/json":
                raise ValueError("Solicitud no válida.")
            payload = json.loads(self.rfile.read(length))
            url = normalize_url(payload.get("url") if isinstance(payload, dict) else None)
        except (ValueError, TypeError, TimeoutError):
            self.reply(400, {"error": "Introduce un enlace público válido de TikTok, Reels o Shorts."})
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
                    path = fetch_video(url, Path(temp))
                except subprocess.TimeoutExpired:
                    self.reply(504, {"error": "La descarga o conversión excedió el tiempo disponible."})
                    return
                except ValueError as error:
                    self.reply(422, {"error": str(error)})
                    return
                except OSError:
                    self.reply(503, {"error": "El servicio de descarga no está disponible."})
                    return
                self.send_response(200)
                self.cors()
                self.send_header("Content-Type", "video/mp4")
                self.send_header("Content-Length", str(path.stat().st_size))
                self.end_headers()
                with path.open("rb") as video:
                    while chunk := video.read(65536):
                        self.wfile.write(chunk)
        except (BrokenPipeError, ConnectionResetError, TimeoutError):
            pass
        finally:
            SLOTS.release()

if __name__ == "__main__":
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()

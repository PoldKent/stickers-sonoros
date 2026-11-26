"""First-party public TikTok download addresses; no third-party service or login."""
import json
import re
from html.parser import HTMLParser
from urllib.parse import urlsplit
from public_media import fetch_public, PublicFetchError, HTML_TYPES

class TikTokDownloadUnavailable(ValueError):
    pass

class PublicationData(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.inside = False
        self.seen = False
        self.parts = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "script" and attrs.get("id") == "__UNIVERSAL_DATA_FOR_REHYDRATION__" and attrs.get("type") == "application/json":
            if self.seen:
                raise TikTokDownloadUnavailable("Datos de publicación ambiguos.")
            self.seen = self.inside = True

    def handle_endtag(self, tag):
        if tag == "script":
            self.inside = False

    def handle_data(self, data):
        if self.inside:
            self.parts.append(data)

def publication_host(host):
    return host == "www.tiktok.com"

def media_host(host):
    return any(host == suffix or host.endswith("." + suffix)
               for suffix in ("tiktokcdn.com", "tiktokcdn-us.com", "tiktokv.com"))

def download_address(html, post_id):
    parser = PublicationData()
    parser.feed(html)
    try:
        data = json.loads("".join(parser.parts))
        detail = data["__DEFAULT_SCOPE__"]["webapp.video-detail"]
        if detail.get("statusCode", 0) != 0 or detail.get("statusMsg"):
            raise TikTokDownloadUnavailable("Publicación no disponible.")
        item = detail["itemInfo"]["itemStruct"]
        if str(item.get("id")) != post_id or any(item.get(k) for k in ("privateItem", "secret", "isContentClassified", "isPrivate")):
            raise TikTokDownloadUnavailable("Publicación no disponible para descarga pública.")
        control = item.get("itemControl") or {}
        if control.get("canDownload") is False or control.get("can_download") is False:
            raise TikTokDownloadUnavailable("La publicación no permite descargar el vídeo.")
        video = item["video"]
        address = video.get("downloadAddr")
        # Do not use playback addresses as a substitute for an absent download URL.
        if not isinstance(address, str) or not address:
            raise TikTokDownloadUnavailable("La publicación no ofrece una dirección de descarga.")
        url = urlsplit(address)
        if url.scheme != "https" or not media_host(url.hostname or "") or url.username or url.password or url.port not in (None,443):
            raise TikTokDownloadUnavailable("Dirección de descarga no admitida.")
        return address
    except (KeyError, TypeError, AttributeError, ValueError) as error:
        if isinstance(error, TikTokDownloadUnavailable):
            raise
        raise TikTokDownloadUnavailable("No se encontraron datos públicos de descarga.") from None

def fetch_tiktok_download(url, directory):
    parsed = urlsplit(url)
    match = re.fullmatch(r"/@[A-Za-z0-9_.-]+/video/([0-9]+)", parsed.path)
    if not match or not publication_host(parsed.hostname or ""):
        raise TikTokDownloadUnavailable("Se necesita un enlace completo de TikTok.")
    page = directory / "tiktok-page.html"
    output = directory / "tiktok-public.mp4"
    try:
        kind, final = fetch_public(url, page, host_policy=publication_host, allowed_types=HTML_TYPES, timeout=15)
        if urlsplit(final).path.rstrip("/") != parsed.path:
            raise TikTokDownloadUnavailable("La publicación cambió durante la consulta.")
        address = download_address(page.read_text(encoding="utf-8", errors="replace"), match.group(1))
        fetch_public(address, output, host_policy=media_host, allowed_types={"video/mp4"}, max_bytes=50*1024*1024, timeout=30)
        with output.open("rb") as file:
            if file.read(8)[4:8] != b"ftyp":
                raise TikTokDownloadUnavailable("El recurso no es un MP4 válido.")
        return output
    except PublicFetchError:
        raise TikTokDownloadUnavailable("TikTok no ofreció un archivo público accesible.") from None
    finally:
        page.unlink(missing_ok=True)

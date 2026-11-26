"""Bounded public HTTPS fetcher. No cookies, auth, proxies or private IP access."""
import http.client
import ipaddress
import socket
import ssl
import time
from urllib.parse import urlsplit, urljoin

HTML_LIMIT = 2 * 1024 * 1024
MEDIA_LIMIT = 80 * 1024 * 1024
MEDIA_TYPES = frozenset({
    "video/mp4", "video/webm", "video/quicktime", "video/x-m4v",
    "audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/aac", "audio/ogg",
    "audio/wav", "audio/x-wav", "audio/webm", "audio/flac", "audio/opus",
    "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
})
HTML_TYPES = {"text/html", "application/xhtml+xml"}
class PublicFetchError(ValueError):
    pass

def public_target(value, host_policy=None):
    if not isinstance(value, str) or not 0 < len(value) <= 4096:
        raise PublicFetchError("Enlace no válido.")
    if any(ord(c) < 33 or ord(c) == 127 for c in value) or "\\" in value:
        raise PublicFetchError("Enlace no válido.")
    try:
        u = urlsplit(value)
        host = u.hostname
        if u.scheme != "https" or not host or u.username or u.password or u.port not in (443,None):
            raise ValueError()
        host = host.encode("idna").decode("ascii")
        if host.endswith("."):
            host = host[:-1]
        # Restricted platforms use their own importer, not this fallback.
        if host_policy is not None and not host_policy(host.lower()):
            raise PublicFetchError("Dominio no permitido para esta descarga.")
        if host_policy is None and any(host.lower() == site or host.lower().endswith("."+site) for site in ("youtube.com","youtu.be","instagram.com","tiktok.com")):
            raise PublicFetchError("Esta plataforma requiere su importador específico.")
        # Do not accept bare IPs or internal hostnames.
        if "." not in host or ":" in host:
            raise ValueError()
        try:
            ipaddress.ip_address(host)
        except ValueError:
            pass
        else:
            raise ValueError()
        if host.lower().endswith((".local",".internal",".localhost",".test",".invalid",".onion")):
            raise ValueError()
    except (ValueError, UnicodeError):
        raise PublicFetchError("Solo se admiten URLs HTTPS de sitios públicos.") from None
    try:
        addresses = {item[4][0] for item in socket.getaddrinfo(host,443,type=socket.SOCK_STREAM)}
        if not addresses or any(not ipaddress.ip_address(ip).is_global or ipaddress.ip_address(ip).is_multicast for ip in addresses):
            raise PublicFetchError("La dirección no pertenece a una red pública.")
    except socket.gaierror:
        raise PublicFetchError("No se pudo encontrar el sitio.") from None
    return u, host, sorted(addresses)

class PinnedHTTPS(http.client.HTTPSConnection):
    def __init__(self, host, ip, timeout):
        super().__init__(host, port=443, timeout=timeout, context=ssl.create_default_context())
        self.pinned_ip = ip
    def connect(self):
        sock = socket.create_connection((self.pinned_ip,443),self.timeout)
        try:
            self.sock = self._context.wrap_socket(sock,server_hostname=self.host)
        except BaseException:
            sock.close()
            raise

def fetch_public(value, output, *, host_policy=None, allowed_types=None, max_bytes=None, timeout=65):
    deadline = time.monotonic()+timeout
    for _ in range(5):
        u, host, addresses = public_target(value, host_policy)
        remaining = deadline-time.monotonic()
        if remaining <= 0:
            raise PublicFetchError("Tiempo de descarga agotado.")
        connection = PinnedHTTPS(host,addresses[0],min(10,remaining))
        try:
            path = u.path or "/"
            if u.query:
                path += "?" + u.query
            connection.request("GET",path,headers={
                "User-Agent":"StickersSonoros/1.0 public media reader",
                "Accept":"video/*, audio/*, image/*, text/html, application/xhtml+xml",
                "Accept-Encoding":"identity",
                "Connection":"close",
            })
            response = connection.getresponse()
            if response.status in (301,302,303,307,308):
                location = response.getheader("Location")
                if not location:
                    raise PublicFetchError("Redirección sin destino.")
                value = urljoin(value,location)
                continue
            if response.status != 200:
                raise PublicFetchError("El sitio no permite acceder al recurso público (HTTP %d)." % response.status)
            if response.getheader("Content-Encoding","identity").lower() != "identity":
                raise PublicFetchError("El recurso utiliza una codificación no admitida.")
            content_type = response.getheader("Content-Type","").split(";")[0].strip().lower()
            if content_type not in MEDIA_TYPES and content_type not in HTML_TYPES:
                raise PublicFetchError("El enlace no ofrece un formato multimedia o HTML compatible.")
            if allowed_types is not None and content_type not in allowed_types:
                raise PublicFetchError("Tipo de contenido no admitido para esta descarga.")
            maximum = HTML_LIMIT if content_type in HTML_TYPES else MEDIA_LIMIT
            if max_bytes is not None:
                maximum = min(maximum, max_bytes)
            length = response.getheader("Content-Length")
            if length and (not length.isdecimal() or int(length)>maximum):
                raise PublicFetchError("El recurso supera el tamaño permitido.")
            size = 0
            with output.open("wb") as file:
                while True:
                    if time.monotonic()>deadline:
                        raise PublicFetchError("Tiempo de descarga agotado.")
                    chunk = response.read1(65536)
                    if not chunk:
                        break
                    size += len(chunk)
                    if size > maximum:
                        raise PublicFetchError("El recurso supera el tamaño permitido.")
                    file.write(chunk)
            if not size or (length and size!=int(length)):
                raise PublicFetchError("El recurso está vacío o incompleto.")
            return content_type,value
        except (OSError,http.client.HTTPException,UnicodeError) as error:
            raise PublicFetchError("No se pudo establecer una conexión HTTPS válida con el recurso.") from error
        finally:
            connection.close()
    raise PublicFetchError("Demasiadas redirecciones.")

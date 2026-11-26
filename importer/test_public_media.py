import unittest
from unittest.mock import patch
from public_media import public_target, PublicFetchError, fetch_public
from tempfile import TemporaryDirectory
from pathlib import Path
from unittest.mock import MagicMock

class PublicTargets(unittest.TestCase):
    @patch("public_media.socket.getaddrinfo", return_value=[(2,1,6,"",("93.184.216.34",443))])
    def test_public(self, dns):
        u, host, ips = public_target("https://example.org/path?x=1")
        self.assertEqual(host,"example.org")
        self.assertEqual(ips,["93.184.216.34"])
    def test_invalid(self):
        for url in ("http://example.org","https://127.0.0.1/","https://[::1]/","https://foo.internal","https://user@example.org","https://example.org:123","https://example.org\\@localhost","https://example.org/\r\nx"):
            with self.subTest(url=url), self.assertRaises(PublicFetchError):
                public_target(url)
    def test_private_dns(self):
        for ip in ("127.0.0.1","10.0.0.1","169.254.169.254","::1","fc00::1","100.64.0.1","224.0.0.1"):
            with patch("public_media.socket.getaddrinfo",return_value=[(2,1,6,"",(ip,443))]), self.assertRaises(PublicFetchError):
                public_target("https://example.org/")
    @patch("public_media.socket.getaddrinfo",return_value=[(2,1,6,"",("93.184.216.34",443)),(2,1,6,"",("10.1.1.1",443))])
    def test_mixed_dns(self, dns):
        with self.assertRaises(PublicFetchError):
            public_target("https://example.org/")

class FetchTests(unittest.TestCase):
    @patch("public_media.PinnedHTTPS")
    @patch("public_media.socket.getaddrinfo", return_value=[(2,1,6,"",("93.184.216.34",443))])
    def test_redirect_to_private(self, dns, connection):
        response=connection.return_value.getresponse.return_value
        response.status=302
        response.getheader.return_value="https://127.0.0.1/secret"
        with TemporaryDirectory() as d, self.assertRaises(PublicFetchError):
            fetch_public("https://example.org/",Path(d)/"result")
        self.assertEqual(connection.call_count,1)

    @patch("public_media.PinnedHTTPS")
    @patch("public_media.socket.getaddrinfo", return_value=[(2,1,6,"",("93.184.216.34",443))])
    def test_media_download(self, dns, connection):
        response=connection.return_value.getresponse.return_value
        response.status=200
        headers={"Content-Type":"image/png","Content-Length":"4"}
        response.getheader.side_effect=lambda name,default=None: headers.get(name,default)
        response.read1.side_effect=[b"test",b""]
        with TemporaryDirectory() as d:
            path=Path(d)/"result"
            kind,url=fetch_public("https://example.org/image.png",path)
            self.assertEqual(kind,"image/png")
            self.assertEqual(path.read_bytes(),b"test")
            self.assertEqual(url,"https://example.org/image.png")

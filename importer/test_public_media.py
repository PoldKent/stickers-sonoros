import unittest
from unittest.mock import patch
from public_media import public_target, PublicFetchError

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

"""HTTP contract tests for the importer; no external network or account."""
import json
import re
import sys
import threading
import unittest
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "importer"))
from server import Handler, ORIGINS, LOCK, RECENT, SERVICE_VERSION, STATIC_FILES, OFFICIAL_WEB

class ImportHTTP(unittest.TestCase):
    def setUp(self):
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.origin = "http://127.0.0.1:" + str(self.server.server_port)
        ORIGINS.add(self.origin)
        with LOCK:
            RECENT.clear()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        ORIGINS.discard(self.origin)

    def request(self, method, path, body=None, headers=None):
        conn = HTTPConnection("127.0.0.1", self.server.server_port, timeout=15)
        try:
            conn.request(method, path, body=body, headers=headers or {})
            response = conn.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            conn.close()

    def post(self, path, url, origin=None):
        return self.request("POST", path, json.dumps({"url": url}),
            {"Origin": origin or self.origin, "Content-Type": "application/json"})

    def test_static_and_version(self):
        status, headers, body = self.request("GET", "/health", headers={"Origin": self.origin})
        self.assertEqual(status, 200)
        info = json.loads(body)
        self.assertEqual(info["version"], SERVICE_VERSION)
        self.assertTrue(info["publicMedia"] and info["tiktokPublicDownload"])
        self.assertNotIn("clipMp4", info)
        self.assertEqual(headers["Access-Control-Allow-Origin"], self.origin)
        for route, (_, mime) in STATIC_FILES.items():
            with self.subTest(route=route):
                status, headers, body = self.request("GET", route + "?v=1")
                self.assertEqual(status, 200)
                self.assertEqual(headers["Content-Type"], mime)
                self.assertTrue(body)
                self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
                self.assertEqual(headers["Cache-Control"], "no-cache" if route in ("/", "/index.html") else "public, max-age=3600")
                if route == "/":
                    self.assertEqual(re.search(rb'data-version="([^"]+)"', body).group(1).decode(), SERVICE_VERSION)

    @patch("server.API_ONLY", True)
    def test_production_redirects_and_noindex(self):
        for method in ("GET", "HEAD"):
            for route in ("/", "/index.html?v=1", "/stickers-sonoros/", "/stickers-sonoros/index.html"):
                with self.subTest(method=method, route=route):
                    code, headers, body = self.request(method, route)
                    self.assertEqual(code, 308)
                    self.assertEqual(headers["Location"], OFFICIAL_WEB)
                    self.assertEqual(headers["X-Robots-Tag"], "noindex, nofollow")
                    self.assertEqual(body, b"")
            for route in STATIC_FILES.keys() - {"/", "/index.html"}:
                code, headers, _ = self.request(method, route)
                self.assertEqual(code, 404)
                self.assertIn("noindex", headers["X-Robots-Tag"])
        code, headers, body = self.request("GET", "/robots.txt")
        self.assertEqual(code, 200)
        self.assertIn(b"Allow: /", body)
        code, headers, body = self.request("GET", "/health", headers={"Origin": "https://poldkent.github.io"})
        self.assertEqual(code, 200)
        self.assertEqual(headers["Access-Control-Allow-Origin"], "https://poldkent.github.io")
        self.assertIn("noindex", headers["X-Robots-Tag"])
        self.assertEqual(json.loads(body)["version"], SERVICE_VERSION)
        for path in ("/api/import", "/api/media"):
            code, headers, _ = self.request("OPTIONS", path, headers={"Origin": "https://poldkent.github.io"})
            self.assertEqual(code, 204)
            self.assertEqual(headers["Access-Control-Allow-Origin"], "https://poldkent.github.io")
            self.assertIn("noindex", headers["X-Robots-Tag"])

    def test_removed_and_restricted_routes(self):
        for method in ("POST", "OPTIONS"):
            code, _, _ = self.request(method, "/api/clip-mp4", headers={"Origin": self.origin})
            self.assertEqual(code, 403)
        self.assertEqual(self.request("GET", "/importer/server.py")[0], 404)
        self.assertEqual(self.request("GET", "/../Dockerfile")[0], 404)
        self.assertEqual(self.post("/api/media", "https://example.com/file", "https://unauthorized.example")[0], 403)
        self.assertEqual(self.post("/api/import", "https://127.0.0.1/video.mp4")[0], 400)

    @patch("server.API_ONLY", True)
    @patch("server.fetch_public")
    def test_public_media(self, fetch):
        def fixture(url, path):
            path.write_bytes(b"media-fixture")
            return "video/mp4", url
        fetch.side_effect = fixture
        code, headers, _ = self.request("OPTIONS", "/api/media", headers={"Origin": self.origin})
        self.assertEqual(code, 204)
        self.assertEqual(headers["Access-Control-Allow-Origin"], self.origin)
        code, headers, body = self.post("/api/media", "https://example.com/media.mp4")
        self.assertEqual((code, body), (200, b"media-fixture"))
        self.assertEqual(headers["Content-Type"], "video/mp4")
        self.assertEqual(headers["Access-Control-Allow-Origin"], self.origin)

    @patch("server.API_ONLY", True)
    @patch("server.fetch_video")
    def test_social_import(self, fetch):
        def fixture(url, directory):
            self.assertEqual(url, "https://www.tiktok.com/@example/video/12345")
            output = directory / "video.mp4"
            output.write_bytes(b"social-fixture")
            return output
        fetch.side_effect = fixture
        code, headers, body = self.post("/api/import", "https://www.tiktok.com/@example/video/12345?share=1")
        self.assertEqual((code, body), (200, b"social-fixture"))
        self.assertEqual(headers["Content-Type"], "video/mp4")

if __name__ == "__main__":
    unittest.main()

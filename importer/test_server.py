import unittest
from server import normalize_url

class Links(unittest.TestCase):
    def test_allowed(self):
        for url in (
            "https://www.youtube.com/shorts/dQw4w9WgXcQ?si=abc",
            "https://youtu.be/dQw4w9WgXcQ",
            "https://www.instagram.com/reel/Abc_123/",
            "https://www.tiktok.com/@example/video/12345",
            "https://vm.tiktok.com/Zabc/",
        ):
            self.assertTrue(normalize_url(url).startswith("https://"))

    def test_rejected(self):
        for url in (
            "http://www.youtube.com/shorts/dQw4w9WgXcQ",
            "https://127.0.0.1/video.mp4",
            "https://www.youtube.com.evil.test/shorts/dQw4w9WgXcQ",
            "https://www.youtube.com/redirect?q=https://127.0.0.1",
            "https://www.instagram.com:8080/reel/abc",
            "https://foo@www.instagram.com/reel/abc",
            "https://www.youtube.com/playlist?list=abc",
        ):
            with self.subTest(url=url), self.assertRaises(ValueError):
                normalize_url(url)

if __name__ == "__main__":
    unittest.main()

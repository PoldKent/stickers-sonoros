import unittest
from server import normalize_url, classify_download_error

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

class Diagnostics(unittest.TestCase):
    def test_errors(self):
        for message, code in (
            ("Sign in to confirm you’re not a bot", "SOURCE_BOT_CHECK"),
            ("Private video", "SOURCE_ACCESS"),
            ("does not pass filter", "SOURCE_DURATION"),
            ("File is larger than max-filesize", "SOURCE_SIZE"),
            ("HTTP Error 429: Too Many Requests", "SOURCE_BLOCKED"),
            ("No supported JavaScript runtime", "SOURCE_JS"),
            ("Video unavailable", "SOURCE_UNAVAILABLE"),
            ("Requested format is not available", "SOURCE_FORMAT"),
        ):
            with self.subTest(code=code):
                self.assertEqual(classify_download_error(message).code, code)
    def test_no_secrets(self):
        error = classify_download_error("unknown error token=private")
        self.assertNotIn("private", str(error))

if __name__ == "__main__":
    unittest.main()

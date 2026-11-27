import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

import server
from youtube_alternate import acquire

URL = "https://www.youtube.com/watch?v=abcdefghijk"

class AlternateTests(unittest.TestCase):
    def test_public_progressive_file(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "alternate.mp4"
            stream = Mock(resolution="360p", filesize=10)
            stream.download.side_effect = lambda **kwargs: target.write_bytes(b"fixture")
            yt = Mock(vid_info={"playabilityStatus": {"status": "OK"}, "videoDetails": {}})
            yt.streams.filter.return_value = [stream]
            factory = Mock(return_value=yt)
            acquire(URL, target, factory)
            self.assertEqual(target.read_bytes(), b"fixture")
            factory.assert_called_once_with(URL, use_oauth=False, allow_oauth_cache=False)

    def test_restricted_source(self):
        yt = Mock(vid_info={"playabilityStatus": {"status": "LOGIN_REQUIRED"}})
        with self.assertRaises(ValueError):
            acquire(URL, Path("unused.mp4"), Mock(return_value=yt))
        yt.streams.filter.assert_not_called()

    @patch("server.ALTERNATE_VERSION", "11.3.0")
    @patch("server.fetch_youtube_alternate")
    @patch("server.run", return_value=(1, "Sign in to confirm you're not a bot"))
    def test_access_check_is_preserved(self, run, alternate):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(server.ImportFailure) as error:
                server.fetch_video(URL, Path(directory))
            self.assertEqual(error.exception.code, "SOURCE_BOT_CHECK")
        alternate.assert_not_called()

    @patch("server.ALTERNATE_VERSION", "11.3.0")
    @patch("server.fetch_youtube_alternate", return_value=None)
    @patch("server.run", return_value=(1, "Requested format is not available"))
    def test_format_failure_uses_alternate(self, run, alternate):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(server.ImportFailure) as error:
                server.fetch_video(URL, Path(directory))
            self.assertEqual(error.exception.code, "SOURCE_FORMAT")
            alternate.assert_called_once_with(URL, Path(directory))

    @patch("server.YOUTUBE_ENGINE", "pytubefix")
    @patch("server.ALTERNATE_VERSION", "11.3.0")
    @patch("server.fetch_youtube_alternate", return_value=None)
    @patch("server.run")
    def test_independent_engine_does_not_retry_denied_source(self, run, alternate):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaises(server.ImportFailure):
                server.fetch_video(URL, Path(directory))
        run.assert_not_called()

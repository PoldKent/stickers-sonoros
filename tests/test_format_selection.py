"""Exercise yt-dlp's real format selector without fetching any media."""
import sys
import unittest
from pathlib import Path
from yt_dlp import YoutubeDL

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "importer"))
from server import FORMAT_SELECTOR, FORMAT_SORT

def fmt(fid, width, height, vcodec, acodec, ext):
    item = {"format_id": fid, "url": "https://example.invalid/" + fid + "." + ext,
            "ext": ext, "vcodec": vcodec, "acodec": acodec, "protocol": "https"}
    if width is not None:
        item.update(width=width, height=height)
    return item

def select(formats):
    with YoutubeDL({"quiet": True, "no_warnings": True, "simulate": True,
                    "format": FORMAT_SELECTOR, "format_sort": FORMAT_SORT.split(",")}) as ydl:
        return ydl.process_ie_result({"id": "fixture", "title": "fixture",
            "webpage_url": "https://example.invalid/video", "duration": 2,
            "formats": formats}, download=False)

class Selection(unittest.TestCase):
    def test_portrait_combined(self):
        info = select([fmt("portrait",480,854,"avc1.64001f","mp4a.40.2","mp4")])
        self.assertEqual(info["format_id"], "portrait")

    def test_portrait_above_preference(self):
        info = select([fmt("portrait",720,1280,"avc1.64001f","mp4a.40.2","mp4")])
        self.assertEqual(info["format_id"], "portrait")

    def test_separate_tracks(self):
        info = select([fmt("video",480,854,"vp9","none","webm"),
                       fmt("audio",None,None,"none","opus","webm")])
        self.assertEqual({f["format_id"] for f in info["requested_formats"]}, {"video","audio"})

if __name__ == "__main__":
    unittest.main()

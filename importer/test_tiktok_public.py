import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from public_media import PublicFetchError, public_target
from tiktok_public import download_address, fetch_tiktok_download, TikTokDownloadUnavailable
from server import fetch_video, ImportFailure

URL = "https://www.tiktok.com/@example/video/123"
MEDIA = "https://v1.tiktokcdn.com/example.mp4"
def fixture(**changes):
    item = {"id":"123", "video":{"downloadAddr":MEDIA}, "itemControl":{"canDownload":True}}
    item.update(changes)
    data = {"__DEFAULT_SCOPE__":{"webapp.video-detail":{"statusCode":0,"itemInfo":{"itemStruct":item}}}}
    return '<script type="application/json" id="__UNIVERSAL_DATA_FOR_REHYDRATION__">'+json.dumps(data)+'</script>'

class PublicTikTok(unittest.TestCase):
    def test_download_address(self):
        self.assertEqual(download_address(fixture(),"123"),MEDIA)

    def test_reject_unavailable(self):
        for html in (fixture(privateItem=True),fixture(isContentClassified=True),
                     fixture(itemControl={"canDownload":False}),
                     fixture(video={"playAddr":MEDIA}),
                     fixture(video={"downloadAddr":"https://tiktokcdn.com.attacker.example/file"}),
                     fixture(id="124"),"<html>login</html>"):
            with self.subTest(html=html), self.assertRaises(TikTokDownloadUnavailable):
                download_address(html,"123")

    @patch("tiktok_public.fetch_public")
    def test_media(self, fetch):
        def request(url,path,**options):
            self.assertTrue(options["host_policy"](url.split("/")[2]))
            if url == URL:
                path.write_text(fixture(),encoding="utf-8")
                return "text/html",URL
            self.assertEqual(url,MEDIA)
            self.assertEqual(options["allowed_types"],{"video/mp4"})
            path.write_bytes(b"\0\0\0\x18ftypmp42")
            return "video/mp4",MEDIA
        fetch.side_effect=request
        with TemporaryDirectory() as temp:
            self.assertTrue(fetch_tiktok_download(URL,Path(temp)).is_file())
            self.assertEqual(fetch.call_count,2)

    @patch("public_media.socket.getaddrinfo")
    def test_host_policy_before_dns(self, dns):
        with self.assertRaises(PublicFetchError):
            public_target("https://www.tiktok.com/video",lambda host: False)
        dns.assert_not_called()

    @patch("server.fetch_tiktok_download")
    @patch("server.run",return_value=(1,"HTTP Error 403: Forbidden"))
    def test_no_fallback_for_access_denial(self, run, fetch):
        with TemporaryDirectory() as temp, self.assertRaises(ImportFailure) as caught:
            fetch_video(URL,Path(temp))
        self.assertEqual(caught.exception.code,"SOURCE_BLOCKED")
        fetch.assert_not_called()

    @patch("server.fetch_tiktok_download")
    @patch("server.run")
    def test_fallback_then_conversion(self, run, fetch):
        with TemporaryDirectory() as temp:
            folder=Path(temp)
            original=folder/"tiktok-public.mp4"
            original.write_bytes(b"\0\0\0\x18ftypmp42")
            fetch.return_value=original
            def invoke(args, timeout):
                if args[0]=="yt-dlp":
                    return 1,"Requested format is not available"
                if args[0]=="ffprobe":
                    self.assertEqual(args[-1],str(original))
                    return 0,json.dumps({"streams":[{"codec_type":"video","codec_name":"h264"},{"codec_type":"audio","codec_name":"aac"}],"format":{"duration":"45"}})
                Path(args[-1]).write_bytes(b"converted")
                return 0,""
            run.side_effect=invoke
            self.assertEqual(fetch_video(URL,folder).read_bytes(),b"converted")
            fetch.assert_called_once_with(URL,folder)

if __name__ == "__main__":
    unittest.main()

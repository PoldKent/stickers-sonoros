"""Exercise the actual HTTP conversion endpoint with a generated, authorized clip."""
import json
import os
import subprocess
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer

sys.path.insert(0,str(Path(__file__).resolve().parent.parent / "importer"))
from server import Handler, ORIGINS, LOCK, RECENT

class ClipIntegration(unittest.TestCase):
    def setUp(self):
        self.server=ThreadingHTTPServer(("127.0.0.1",0),Handler)
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True)
        self.thread.start()
        self.origin="http://127.0.0.1:"+str(self.server.server_port)
        ORIGINS.add(self.origin)
        with LOCK:
            RECENT.clear()
    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        ORIGINS.discard(self.origin)
    def request(self, method, path, body=None, headers=None):
        conn=HTTPConnection("127.0.0.1",self.server.server_port,timeout=45)
        try:
            conn.request(method,path,body=body,headers=headers or {})
            res=conn.getresponse()
            return res.status,dict(res.getheaders()),res.read()
        finally:
            conn.close()
    def test_mp4(self):
        with tempfile.TemporaryDirectory() as tmp:
            src=Path(tmp)/"tone.webm"
            dst=Path(tmp)/"sticker.mp4"
            subprocess.run(["ffmpeg","-v","error","-f","lavfi","-i","color=c=blue:s=128x128:r=15:d=1","-f","lavfi","-i","sine=frequency=440:sample_rate=48000:duration=1","-c:v","libvpx","-c:a","libopus","-shortest",str(src)],check=True,timeout=30)
            code,headers,_=self.request("OPTIONS","/api/clip-mp4",headers={"Origin":self.origin})
            self.assertEqual(code,204)
            self.assertEqual(headers["Access-Control-Allow-Origin"],self.origin)
            code,headers,body=self.request("POST","/api/clip-mp4",src.read_bytes(),{"Origin":self.origin,"Content-Type":"video/webm"})
            self.assertEqual(code,200,body[:500])
            self.assertEqual(headers["Content-Type"],"video/mp4")
            dst.write_bytes(body)
            info=json.loads(subprocess.check_output(["ffprobe","-v","error","-show_entries","stream=codec_name,codec_type,width,height:format=duration","-of","json",str(dst)],timeout=15))
            video=next(s for s in info["streams"] if s["codec_type"]=="video")
            audio=next(s for s in info["streams"] if s["codec_type"]=="audio")
            self.assertEqual((video["codec_name"],video["width"],video["height"]),("h264",512,512))
            self.assertEqual(audio["codec_name"],"aac")
            self.assertTrue(0<float(info["format"]["duration"])<=10.1)
    def test_reject_invalid(self):
        code,_,body=self.request("POST","/api/clip-mp4",b"not a webm",{"Origin":self.origin,"Content-Type":"video/webm"})
        self.assertEqual(code,422)
        self.assertEqual(json.loads(body)["code"],"CLIP_FORMAT")
        code,_,_=self.request("POST","/api/clip-mp4",b"not a webm",{"Origin":"https://unauthorized.example","Content-Type":"video/webm"})
        self.assertEqual(code,403)
if __name__=="__main__":
    unittest.main()

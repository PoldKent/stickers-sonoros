"""Independent, anonymous importer for accessible single YouTube videos."""
import re
import sys
from pathlib import Path

MAX_SOURCE_BYTES = 50 * 1024 * 1024
URL_PATTERN = r"https://www\.youtube\.com/watch\?v=[A-Za-z0-9_-]{11}"

def acquire(url, output, youtube_factory=None):
    if not re.fullmatch(URL_PATTERN, url):
        raise ValueError("Invalid canonical YouTube URL")
    if youtube_factory is None:
        from pytubefix import YouTube
        youtube_factory = YouTube
    yt = youtube_factory(url, use_oauth=False, allow_oauth_cache=False)
    info = yt.vid_info
    details = info.get("videoDetails", {})
    if (info.get("playabilityStatus", {}).get("status") != "OK"
            or details.get("isPrivate") or details.get("isLive")):
        raise ValueError("Source not available for anonymous playback")
    streams = yt.streams.filter(progressive=True, file_extension="mp4")
    candidates = []
    for stream in streams:
        if stream.resolution and re.fullmatch(r"\d+p", stream.resolution):
            resolution = int(stream.resolution[:-1])
            if resolution <= 720:
                candidates.append((abs(resolution - 480), -resolution, stream))
    for _, _, stream in sorted(candidates, key=lambda row: row[:2]):
        if 0 < stream.filesize <= MAX_SOURCE_BYTES:
            stream.download(output_path=str(output.parent), filename=output.name,
                            skip_existing=False, timeout=10, max_retries=0)
            if output.is_file() and 0 < output.stat().st_size <= MAX_SOURCE_BYTES:
                return
            raise ValueError("Invalid downloaded file")
    raise ValueError("No suitable progressive MP4")

def main():
    try:
        acquire(sys.argv[1], Path(sys.argv[2]))
        return 0
    except Exception as error:
        # Never print upstream messages, signed URLs or session data.
        print("Alternate importer: " + type(error).__name__, file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())

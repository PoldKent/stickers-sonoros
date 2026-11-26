# Stickers Sonoros

![Stickers Sonoros — brand identity](docs/images/brand.svg)

**Create sound stickers for WhatsApp from your browser.**  
Video, image or GIF + audio · up to 60 seconds · Español / English.

[**Open app**](https://poldkent.github.io/stickers-sonoros/) · [Render server](https://stickers-sonoros.onrender.com/) · [README en español](README.md) · [❤️ Support the project](SUPPORT.md#english)

[![Automated checks](https://github.com/PoldKent/stickers-sonoros/actions/workflows/smoke.yml/badge.svg)](https://github.com/PoldKent/stickers-sonoros/actions/workflows/smoke.yml)

![Illustrative desktop and phone editor layout](docs/images/interface.svg)

[Real screenshots from the latest verified build](https://github.com/PoldKent/stickers-sonoros/actions/runs/45852351963#artifacts) (temporary CI artifacts).

## How it works

![Workflow: import, edit, create and send](docs/images/workflow.svg)

1. Paste a public HTTPS media link or choose a local file.
2. Preview the selection, set start and end (up to 60 seconds), and adjust framing, position or zoom.
3. Select **Create sound sticker**. The editor produces a video and, when supported, a package containing linked WebP and Ogg/Opus files.
4. Save the sound sticker package and use the WhatsApp Web bookmark as described below.

## Features

- Direct video, image and audio imports; public media detection on supported pages.
- Self-hosted yt-dlp importer and a fallback for public TikTok download addresses.
- Square 512 × 512 editor, playback preview, frame extraction and image/GIF with sound.
- Initial selection up to 30 seconds; maximum 60 seconds. Quality adapts to the converter's 1 MB WebP and 1 MB Ogg limits.
- Responsive phone, tablet and desktop layouts with a persistent Spanish/English setting.
- Local editing and generation without installing applications or browser extensions.
- MP4 or WebM depending on browser capabilities; optional server-side WebM-to-MP4 conversion.

## Send to WhatsApp

### Desktop (WhatsApp Web)

1. Save `sticker.sonoro.json` from the editor.
2. Once, show the bookmarks bar (Ctrl + Shift + B) and save **Send sound sticker** from the app.
3. Open WhatsApp Web and sign in. Use your own chat for the first compatibility test.
4. Click the bookmark, choose the saved file and confirm the recipient.
5. If sound compatibility is offered, you may enable it temporarily. Check playback in the chat.

The bookmark uses an unofficial integration adapted from Shirtep inside your browser session. It does not upload your session to our server or permanently change account settings. Existing packages remain compatible. Replace old bookmarks to receive language and duration updates. **Do not attach the JSON file directly to a chat.**

### Android and iPhone

Import, edit and generate in a supported browser. Save the video to your gallery and use WhatsApp's sticker editor if your account offers sound. Sharing MP4 alone does not create a sound sticker. Bookmark-based sending is designed for desktop WhatsApp Web; native mobile sending and Safari codec support are not guaranteed.

## Status and compatibility

| Feature | Verification |
|---|---|
| Native sound sticker to own chat | User-confirmed real send in .12 |
| TikTok import | User-confirmed 27.14-second clip in .18 |
| 60-second package and send | Actual package generation and simulated send in CI; real 60-second send unverified |
| Mobile layout and language | Chromium tests at 320, 390, 740 and 1024 px; not physical device tests |
| Universal social media import | Not guaranteed; depends on source |
| Sending to every WhatsApp account | Not guaranteed; depends on client and server |

Updated Chrome or Edge is recommended for WebCodecs, WebP and Opus. Animated GIFs need ImageDecoder. Only download material you are authorized to use. If access is restricted, use an authorized original file.

## Development and deployment

**Static editor:** run `python -m http.server 8000` at the repository root and visit `http://localhost:8000`. Use the full service for social links and server conversion.

```sh
docker build -t stickers-sonoros .
docker run --rm -p 8080:8080 stickers-sonoros
```

Visit `http://localhost:8080`. The root Dockerfile is canonical; the compatibility Dockerfile also uses the repository root as build context.

- GitHub Pages serves the frontend from `main`; Render's URL is configured in `index.html`.
- Render uses `render.yaml`, Docker and the free plan, with deployments after checks pass. If needed, use **Manual sync** in the Blueprint and **Manual Deploy** in the service.
- `/health` reports the service version, capabilities and yt-dlp version. Free instances may sleep.

| Route | Purpose |
|---|---|
| GET `/health` | Status and capabilities |
| POST `/api/import` | Supported public social video |
| POST `/api/media` | Public HTTPS resource or inert HTML |
| POST `/api/clip-mp4` | Optional edited WebM clip conversion |

## Tests

```sh
node --check app.js
node --check i18n.js
python -m unittest discover -s importer -p 'test_*.py'
python tests/test_clip_http.py
python tests/test_format_selection.py
```

For browser tests, install Playwright and Chromium in the development environment, run the static server on port 8000 and execute `node tests/smoke.mjs`. Integration tests need FFmpeg; format-selection tests need yt-dlp. See [CI runs](https://github.com/PoldKent/stickers-sonoros/actions/workflows/smoke.yml) and [live service diagnostics](https://github.com/PoldKent/stickers-sonoros/actions/workflows/render-diagnostic.yml). README images are illustrative diagrams; actual Chromium screenshots are attached as CI artifacts when generated.

## Privacy and limits

File processing is local by default. The importer accesses the supplied public URL and removes temporary files after responding. Optional MP4 conversion uploads only the edited clip. The service limits size, time and concurrency; its HTTPS reader validates domains, public DNS and TLS. CORS is not authentication or a replacement for network egress restrictions and infrastructure isolation. Do not store secrets in the public importer. See [audit and security notes](docs/AUDIT.md).

## ❤️ Support the project

To voluntarily support noncommercial maintenance, see [USDC or BBTC donation instructions on Ethereum (ERC-20)](SUPPORT.md#english). Do not send native BTC, other tokens or use other networks. The app does not sell features, require payment or automate transfers.

## Credits and license

The converter and adapted publishing mechanism come from [Shirtep/WA-audio-stickers, commit 25f7909](https://github.com/Shirtep/WA-audio-stickers/tree/25f790945134f395c4bed4f0deea380ac3a2b778). The original [copyright notice and PolyForm Noncommercial 1.0.0 license](vendor/shirtep/LICENSE.md) are retained. No commercial-use rights or official affiliation with WhatsApp, TikTok or Binance are implied. Confirm with the rights holder any use or funding that could constitute commercial exploitation.

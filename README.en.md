# Stickers Sonoros

![Stickers Sonoros — brand identity](docs/images/brand.svg)

**Create sound stickers for WhatsApp from your browser.**  
Video, image or GIF + audio · no fixed duration limit · Español / English.

[**Official website**](https://poldkent.github.io/stickers-sonoros/) · [README en español](README.md) · [❤️ Support the project](SUPPORT.md#english)

[![Automated checks](https://github.com/PoldKent/stickers-sonoros/actions/workflows/smoke.yml/badge.svg)](https://github.com/PoldKent/stickers-sonoros/actions/workflows/smoke.yml)

![Illustrative desktop and phone editor layout](docs/images/interface.svg)

[Real screenshots from interface checks](https://github.com/PoldKent/stickers-sonoros/actions/workflows/smoke.yml) (temporary artifacts per run).

## How it works

![Workflow: import, edit, create and send](docs/images/workflow.svg)

1. Paste a public HTTPS media link or choose a local file.
2. Preview the selection, set start and end (no fixed duration limit), and adjust framing, position or zoom.
3. Select **Create sound sticker**. The editor locally creates a package containing linked WebP and Ogg/Opus files when the browser supports the required codecs.
4. Follow the four sending steps under the preview. The editor's only download is `original-name.sonoro.json`.

## Sticker signature

Optionally enter your name or nickname (up to 40 characters). Every sticker contains **Creado en Stickers Sonoros** as its EXIF pack name and the app URL in its publisher field, alongside your signature if provided. No text is painted on the image and the audio SHA-256 linkage is preserved. Recipients may see this public attribution. WhatsApp determines how fields are displayed and whether the URL is clickable. No app-store links are impersonated.

## Precision framing

Position controls use pixels of the 512 × 512 canvas, with 0.1 px steps; zoom uses 0.01% steps. Drag the media or slider to softly snap to its center or actual canvas edges, depending on framing mode and zoom. Continue dragging to release the snap, or enter exact numbers or use arrow keys to bypass it. **Center** resets position only. Temporary guides are not part of the sticker. Rotate media 90° left or right, 180°, or select 0°, 90°, 180° or 270°. Magnetic alignment adapts to orientation and rotation is applied to the actual exported sticker. Zoom and screen-space position are preserved when rotating; use **Center** as needed.

## Sticker quality

**Extended quality (default):** allows up to 4,000,000 combined WebP and Ogg bytes (no separate audio cap in extended mode), with higher initial quality and capture FPS for short clips. Compatible is optional and limits each component to 1 MB. WhatsApp acceptance of images over 1 MB is unverified; the upstream converter warns of HTTP 413. Replace the bookmark to try larger packages, first in your own chat. If rejected, use Compatible. Base64 JSON is larger than the original media.

The default **Maximum sharpness** mode prioritizes resolution (512 px target; adaptive resolution), with a minimum **9 FPS** sampling and encoding rate for animations, including long clips. Static or low-motion sources do not gain artificial distinct frames. All profiles maintain at least 9 FPS; if the budget cannot be met, export fails. **Balanced** and **Maximum smoothness** offer other tradeoffs. Output depends on content and the selected size limit; HD is not guaranteed for every clip. Shorten the selection or use frame + audio if needed. Actual resolution and FPS appear in the result.

If TikTok import fails, [SnapTik](https://snaptik.fi/) is offered as an external manual alternative: download authorized content only, then select the local file. Links are not automatically sent to that service and its API is not integrated.

## Features

- Direct video, image and audio imports; public media detection on supported pages.
- Self-hosted yt-dlp importer and a fallback for public TikTok download addresses.
- Square 512 × 512 editor, playback preview, frame extraction and image/GIF with sound.
- Full source selected initially; adjustable trimming with no fixed duration limit. Quality adapts to the converter's compatible 1 MB per component or extended 4 MB combined limit.
- Responsive phone, tablet and desktop layouts with a persistent Spanish/English setting.
- Local editing and generation without installing applications or browser extensions.

## Send to WhatsApp

### Desktop (WhatsApp Web)

1. **Save your sticker.** Click **Save sound sticker** to download `original-name.sonoro.json`. Do not open it or attach it to a chat.
2. **Set up the send button (first time only).** Show the bookmarks bar with Ctrl + Shift + B (Mac: ⌘ + Shift + B) and drag the app's **Send sound sticker** link onto it. If dragging is unavailable, click **Copy bookmark address**, create a bookmark named Send sound sticker, and paste the address into its URL field. Skip this step if you already have the bookmark.
3. **Open the WhatsApp chat.** Click **Open WhatsApp Web**, sign in and open the recipient's chat. For the first test, use your own chat.
4. **Choose the file and send.** In WhatsApp Web, click the bookmark, choose the file from step 1 and click **Send sticker with sound**. If Enable sound compatibility is offered, check it before sending. Confirm the recipient and check playback.

The bookmark uses an unofficial integration adapted from Shirtep inside your browser session. It does not upload your session to our server or permanently change account settings. Existing packages remain compatible. Replace old bookmarks to receive language and duration updates. **Do not attach the JSON file directly to a chat.**

### Android and iPhone

Import, edit and save the `.sonoro.json` file in a supported mobile browser. Transfer it to your computer and follow the four WhatsApp Web steps. Native sending from Android or iPhone is not implemented.

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

**Static editor:** run `python -m http.server 8000` at the repository root and visit `http://localhost:8000`. Use the full service for social links.

```sh
docker build --target local-editor -t stickers-sonoros .
docker run --rm -p 8080:8080 stickers-sonoros
```

Visit `http://localhost:8080`. The root Dockerfile is the only build file.

- GitHub Pages is the only official website and serves the frontend from `main`. Its canonical URL is also included in sticker EXIF attribution.
- Render exclusively hosts the supporting API configured in `index.html`; its root permanently redirects to the official website (HTTP 308). It does not serve the editor or its assets. Responses carry `X-Robots-Tag: noindex, nofollow`.
- Render uses `render.yaml`, the production Docker image (without frontend files) and the free plan, with deployments after checks pass. If needed, use **Manual sync** in the Blueprint and **Manual Deploy** in the service.
- `/health` reports the service version, capabilities and yt-dlp version. Free instances may sleep.

| Route | Purpose |
|---|---|
| GET/HEAD `/` | Permanent redirect to the official website |
| GET `/health` | Status and capabilities |
| POST `/api/import` | Supported public social video |
| POST `/api/media` | Public HTTPS resource or inert HTML |

## Tests

```sh
node --check app.js
node --check i18n.js
python -m unittest discover -s importer -p 'test_*.py'
python tests/test_http.py
python tests/test_format_selection.py
```

For browser tests, install Playwright and Chromium in the development environment, run the static server on port 8000 and execute `node tests/smoke.mjs`. Browser tests use FFmpeg to create media fixtures; format-selection tests need yt-dlp. See [CI runs](https://github.com/PoldKent/stickers-sonoros/actions/workflows/smoke.yml) and [live service diagnostics](https://github.com/PoldKent/stickers-sonoros/actions/workflows/render-diagnostic.yml). README images are illustrative diagrams; actual Chromium screenshots are attached as CI artifacts when generated.

## Privacy and limits

File processing is local by default. The importer accesses the supplied public URL and removes temporary files after responding. Edited clips are not uploaded to the server. The service limits size, time and concurrency; its HTTPS reader validates domains, public DNS and TLS. CORS is not authentication or a replacement for network egress restrictions and infrastructure isolation. Do not store secrets in the public importer. See [audit and security notes](docs/AUDIT.md).

## ❤️ Support the project

To voluntarily support noncommercial maintenance, see [USDC or BBTC donation instructions on Ethereum (ERC-20)](SUPPORT.md#english). Do not send native BTC, other tokens or use other networks. The app does not sell features, require payment or automate transfers.

## Credits and license

The converter and adapted publishing mechanism come from [Shirtep/WA-audio-stickers, commit 25f7909](https://github.com/Shirtep/WA-audio-stickers/tree/25f790945134f395c4bed4f0deea380ac3a2b778). The original [copyright notice and PolyForm Noncommercial 1.0.0 license](vendor/shirtep/LICENSE.md) are retained. No commercial-use rights or official affiliation with WhatsApp, TikTok or Binance are implied. Confirm with the rights holder any use or funding that could constitute commercial exploitation.

## Mobile research

See [mobile sending without WhatsApp Web](docs/MOBILE.md). Direct sound sticker sending from Android/iOS is not implemented; the verified desktop flow remains available.

### Timeline

The bar under the preview shows current position and total duration. Inspect frames, play from the cursor inside the selection and mark its start and end.

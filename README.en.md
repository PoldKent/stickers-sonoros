# Stickers Sonoros

![Stickers Sonoros](docs/images/brand.svg)

**Create and send sound stickers from your phone or computer.**

[**Open the official site**](https://poldkent.github.io/stickers-sonoros/) · [Español](README.md) · [Mobile guide](docs/MOBILE.md#english) · [Support](SUPPORT.md#english)

[![Checks](https://github.com/PoldKent/stickers-sonoros/actions/workflows/smoke.yml/badge.svg)](https://github.com/PoldKent/stickers-sonoros/actions/workflows/smoke.yml) [![Production](https://github.com/PoldKent/stickers-sonoros/actions/workflows/render-diagnostic.yml/badge.svg)](https://github.com/PoldKent/stickers-sonoros/actions/workflows/render-diagnostic.yml)

**Current code version: 2026.11.27.55.** The operator confirmed first .49 self-chat delivery. [.49 checks](https://github.com/PoldKent/stickers-sonoros/actions/runs/45941677357), [publication](https://github.com/PoldKent/stickers-sonoros/actions/runs/45941676942) and [importer diagnostic](https://github.com/PoldKent/stickers-sonoros/actions/runs/45941827328) passed. See current runs for .55. All four screens show concise actions and expandable help. Automated checks cover desktop Chromium and touch layouts at 320–1024 px in Spanish and English; actual iOS/Android devices need separate validation. A warning appears if native Opus or WebP encoding is unavailable. This is not an independent security audit.

## Four steps

![Four-step workflow](docs/images/workflow.svg)

1. **Import:** select video, image or GIF and audio, or paste a supported public HTTPS media link.
2. **Edit:** adjust trim, framing, zoom, position and rotation; use the full source if desired.
3. **Create:** select quality (automatic 1 MB combined limit), add an optional signature and generate the sticker.
4. **Send:** connect WhatsApp and confirm sending to your own chat. Desktop also offers WhatsApp Web under “Other ways to send”.

Editing is local; public links use the separate importer API. Try the built-in example if you have no media. Navigation retains the project; changing media or settings invalidates the previous result.

## Send from your phone

No computer, software installation or administrator key is needed. In Send choose **Get started**, enter your own international number, consent to linking and complete Turnstile. Open WhatsApp **Linked devices → Link a device → Link with phone number** and enter the code shown by the website. Return, choose **Send to my own chat** and confirm. Disconnect and check Linked devices when finished.

For an existing package, open [Send saved sticker](https://poldkent.github.io/stickers-sonoros/mobile.html). WhatsApp cannot import this JSON directly as a sticker; do not attach it to the chat.

## Send from a computer

WhatsApp App is the default and uses the same individual flow as mobile. For WhatsApp Web, expand “Other ways to send” in Send, download the package, install or update the bookmarklet in your favorites, open WhatsApp Web and the desired chat, run the bookmarklet, select the JSON and confirm the recipient. The bookmarklet works within the browser without extensions. It attempts native sound delivery without a checkbox or a preliminary creation-flag block; it does not override WhatsApp internals. If the client rejects the send or does not confirm sound, check the chat before retrying and use self-send as an alternative. Update older bookmarks.

## Quality and formats

| Feature | Limit |
|---|---|
| Combined WebP + Ogg/Opus | 1 MB (1,000,000 bytes) |
| Maximum resolution | 512 × 512 |
| Animation | ≥9 FPS |
| Duration | No fixed cap |

The converter adapts resolution and compression to the budget without recording intermediate video. Base64 makes the JSON larger. Memory, codecs, input size (80 MiB) and processing time guards apply. If media cannot fit at 9 FPS, shorten the selection or use a still image. The extended mode was retired after operator-reported failures. Both the updated bookmarklet and individual sender reject combined media above 1 MB. Recreate oversized older packages from the original media. WhatsApp may still reject files for other reasons. Optional signature (40 characters) and official URL are embedded in EXIF, not drawn onto the image; SHA-256 links the audio.

## Privacy and security

- We do not ask for WhatsApp passwords, PINs or SMS codes. Linking is authorized inside WhatsApp.
- Turnstile limits automation; a random per-session key stays in browser memory. The server verifies linked identity and only permits sending to its own number.
- We do not request full history or provide an inbox. **Linking grants a server-hosted device potential access to messages.** This is not a guarantee of absolute confidentiality. The unofficial transport may cause restrictions; an owned secondary account is recommended.
- Temporary sessions last up to 15 minutes and five sends, with two concurrent beta sessions. Device logout and temporary credential removal are best effort; check Linked devices manually. No automatic retry after uncertain delivery.
- Editing is local; the package is transmitted only when sending is confirmed. Remote imports use a separate API. No sticker catalog is stored.

See the [mobile guide](docs/MOBILE.md), [bridge setup](experiments/mobile-bridge/README.md) and [technical audit](docs/AUDIT.md). Automated isolation checks do not replace real simultaneous tests with different accounts or an independent audit.

## Development and deployment

| Service | Responsibility |
|---|---|
| [GitHub Pages](https://poldkent.github.io/stickers-sonoros/) | Sole official site |
| [Render importer](https://stickers-sonoros.onrender.com/health) | API `/api/media`, `/api/import`, `/health` |
| [Render Bridge](https://stickers-sonoros-bridge.onrender.com/health) | Individual `/v2` API and `/health` |

Render roots redirect to the official site. The importer uses the root Dockerfile; the bridge uses `experiments/mobile-bridge/Dockerfile.web`. Turnstile secrets belong in Render, never GitHub. Free services may sleep.

```sh
python -m http.server 8000
# In another terminal with FFmpeg, Playwright and Chromium installed:
node tests/smoke.mjs
node --test experiments/mobile-bridge/*.test.mjs
python -m unittest discover -s importer -p 'test_*.py'
python tests/test_http.py
python tests/test_format_selection.py
```

Format selection tests require yt-dlp. For full local development, run `docker build --target local-editor -t stickers-sonoros .` and `docker run --rm -p 8080:8080 stickers-sonoros`. The actual bridge restricts requests to the official origin. Production probes check versions, redirects, CORS and unauthenticated access; they do not link accounts. A real social import requires an authorized public URL for the optional probe. [CI history](https://github.com/PoldKent/stickers-sonoros/actions).

## Credits and license

Import only authorized content. Converter and bookmarklet adapted from [Shirtep/WA-audio-stickers (25f7909)](https://github.com/Shirtep/WA-audio-stickers/tree/25f790945134f395c4bed4f0deea380ac3a2b778), under [PolyForm Noncommercial 1.0.0](vendor/shirtep/LICENSE.md). Experimental bridge based on Baileys and [wa-sound-sticker](https://github.com/alkhrzmy/wa-sound-sticker). This is not an official WhatsApp product. No additional commercial rights are granted; consult the rights holder for commercial uses. Voluntary noncommercial maintenance support: [SUPPORT.md](SUPPORT.md#english).

FROM denoland/deno:bin-2.9.7 AS deno
FROM node:22-bookworm-slim AS js
FROM python:3.12-slim-bookworm AS service
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg util-linux libstdc++6 ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=js /usr/local/bin/node /usr/local/bin/node
# Deno is the preferred yt-dlp runtime; Node remains available.
COPY --from=deno /deno /usr/local/bin/deno
ARG DOWNLOADER_BUILD=2026-11-27
RUN echo "Downloader build ${DOWNLOADER_BUILD}" && pip install --no-cache-dir --upgrade --pre "yt-dlp[default]" && yt-dlp --version && node --version && deno --version && python -m pip check && python -c "from importlib.metadata import version; print('yt-dlp-ejs', version('yt-dlp-ejs'))" && ffmpeg -version
RUN useradd --create-home --uid 10001 app
WORKDIR /app
COPY importer/server.py importer/public_media.py importer/tiktok_public.py ./importer/
USER app
ENV PORT=8080 PYTHONUNBUFFERED=1 WEB_ROOT=/app
EXPOSE 8080
CMD ["python", "importer/server.py"]

# Optional full editor for local development only.
FROM service AS local-editor
COPY index.html app.js i18n.js style.css mobile.html mobile.js mobile.css self-send.js self-send.css package.js ./
COPY assets/ ./assets/
COPY vendor/shirtep/ ./vendor/shirtep/
ENV API_ONLY=0

# Default production image contains only the API.
FROM service AS production
ENV API_ONLY=1

FROM node:22-bookworm-slim AS js
FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg util-linux libstdc++6 ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=js /usr/local/bin/node /usr/local/bin/node
RUN pip install --no-cache-dir "yt-dlp[default]"
RUN useradd --create-home --uid 10001 app
WORKDIR /app
COPY importer/server.py importer/public_media.py ./importer/
COPY index.html app.js style.css ./
COPY vendor/shirtep/ ./vendor/shirtep/
USER app
ENV PORT=8080 PYTHONUNBUFFERED=1 WEB_ROOT=/app
EXPOSE 8080
CMD ["python", "importer/server.py"]

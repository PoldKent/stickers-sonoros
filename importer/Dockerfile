FROM node:22-bookworm-slim AS js
FROM python:3.12-slim-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg util-linux libstdc++6 ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=js /usr/local/bin/node /usr/local/bin/node
RUN pip install --no-cache-dir "yt-dlp[default]"
RUN useradd --create-home --uid 10001 app
WORKDIR /app
COPY server.py .
USER app
ENV PORT=8080 PYTHONUNBUFFERED=1
EXPOSE 8080
CMD ["python", "server.py"]

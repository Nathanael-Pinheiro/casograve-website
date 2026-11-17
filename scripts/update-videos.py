"""Update the long-form YouTube cache. A failed request never replaces the last good file."""
import argparse
from datetime import datetime
import json
from pathlib import Path
import re
import sys
import time
import urllib.request
from urllib.parse import parse_qs, urlsplit
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
NS = {
    "a": "http://www.w3.org/2005/Atom",
    "yt": "http://www.youtube.com/xml/schemas/2015",
}
MAX_BYTES = 2 * 1024 * 1024
ID = re.compile(r"[A-Za-z0-9_-]{11}")


def watch_url(entry, video_id):
    for link in entry.findall("a:link", NS):
        url = link.get("href", "")
        try:
            parts = urlsplit(url)
            accepted = parts.scheme == "https" and parts.netloc in ("www.youtube.com", "youtube.com")
        except ValueError:
            continue
        if accepted and parts.path == "/watch" and parse_qs(parts.query).get("v") == [video_id]:
            return f"https://www.youtube.com/watch?v={video_id}"
    return None


def parse_feed(xml, channel_id, playlist_id):
    if len(xml) > MAX_BYTES or b"<!DOCTYPE" in xml.upper():
        raise ValueError("Formato ou tamanho inesperado do RSS.")
    feed = ElementTree.fromstring(xml)
    if feed.tag != f"{{{NS['a']}}}feed":
        raise ValueError("O conteúdo recebido não é um feed Atom.")
    if feed.findtext("yt:playlistId", namespaces=NS) != playlist_id:
        raise ValueError("O feed recebido não é o da playlist de vídeos longos.")
    videos = {}
    for entry in feed.findall("a:entry", NS):
        if entry.findtext("yt:channelId", namespaces=NS) != channel_id:
            raise ValueError("O feed contém vídeos de outro canal.")
        video_id = entry.findtext("yt:videoId", default="", namespaces=NS)
        title = entry.findtext("a:title", default="", namespaces=NS).strip()
        date = entry.findtext("a:published", default="", namespaces=NS)
        if not ID.fullmatch(video_id) or not title:
            continue
        url = watch_url(entry, video_id)
        if not url:
            continue
        published = None
        if date:
            try:
                published = datetime.fromisoformat(date.replace("Z", "+00:00"))
                if published.tzinfo is None:
                    published = None
            except ValueError:
                pass
        videos.setdefault(video_id, (published, {
            "id": video_id, "title": title, "url": url,
            "publishedAt": published.isoformat() if published else None,
        }))
    if not videos:
        raise ValueError("O feed não retornou publicações válidas.")
    ordered = sorted(videos.values(), key=lambda item: item[0].timestamp() if item[0] else float("-inf"), reverse=True)
    return {"channelId": channel_id, "videos": [video for _, video in ordered[:6]]}


def fetch_feed(playlist_id):
    url = f"https://www.youtube.com/feeds/videos.xml?playlist_id={playlist_id}"
    request = urllib.request.Request(url, headers={"User-Agent": "CasoGrave-RSS/1.0", "Accept": "application/atom+xml"})
    last_error = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=35) as response:
                return response.read(MAX_BYTES + 1)
        except (OSError, ValueError) as error:
            last_error = error
            if attempt < 2:
                time.sleep(3 * (attempt + 1))
    raise last_error


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--feed-file", type=Path, help="Ler uma cópia local do RSS.")
    parser.add_argument("--output", type=Path, default=DATA / "videos.json")
    args = parser.parse_args()
    try:
        channel_id = json.loads((DATA / "site.json").read_text(encoding="utf-8"))["channelId"]
        if not re.fullmatch(r"UC[A-Za-z0-9_-]{22}", channel_id):
            raise ValueError("ID de canal inválido.")
        # YouTube's Videos playlist excludes Shorts and has its own RSS window.
        playlist_id = "UULF" + channel_id[2:]
        xml = args.feed_file.read_bytes() if args.feed_file else fetch_feed(playlist_id)
        payload = parse_feed(xml, channel_id, playlist_id)
        result = (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
        if args.output.exists() and args.output.read_bytes() == result:
            print("RSS sem alterações.")
            return 0
        args.output.parent.mkdir(parents=True, exist_ok=True)
        pending = args.output.with_suffix(args.output.suffix + ".tmp")
        pending.write_bytes(result)
        pending.replace(args.output)
        print(f"Cache atualizado: {len(payload['videos'])} publicações.")
    except (OSError, ValueError, ElementTree.ParseError) as error:
        print(f"Falha ao atualizar o RSS; o cache anterior foi preservado. {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

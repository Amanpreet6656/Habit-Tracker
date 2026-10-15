import os
import re
import glob
import html
import tempfile
import httpx
from typing import Dict, Any, List, Optional
import yt_dlp

def extract_video_id(url_or_id: str) -> Optional[str]:
    """Extract 11-character YouTube video ID from various URL formats."""
    text = url_or_id.strip()
    if re.match(r'^[a-zA-Z0-9_-]{11}$', text):
        return text
    
    patterns = [
        r'(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/|\/live\/)([a-zA-Z0-9_-]{11})',
        r'[\?&]v=([a-zA-Z0-9_-]{11})',
        r'youtu\.be\/([a-zA-Z0-9_-]{11})',
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return match.group(1)
    return None

async def fetch_video_metadata(video_id: str) -> Dict[str, Any]:
    """Fetch video metadata using YouTube's fast public oEmbed endpoint."""
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    oembed_url = f"https://www.youtube.com/oembed?url={video_url}&format=json"
    
    metadata = {
        "video_id": video_id,
        "video_url": video_url,
        "title": "YouTube Video",
        "author": "Unknown Creator",
        "author_url": "",
        "thumbnail_url": f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
    }
    
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(oembed_url)
            if resp.status_code == 200:
                data = resp.json()
                metadata["title"] = data.get("title", metadata["title"])
                metadata["author"] = data.get("author_name", metadata["author"])
                metadata["author_url"] = data.get("author_url", "")
                if data.get("thumbnail_url"):
                    metadata["thumbnail_url"] = data.get("thumbnail_url")
    except Exception:
        # Fallback thumbnail
        metadata["thumbnail_url"] = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
        
    return metadata

def parse_vtt_content(vtt_text: str):
    """
    Parse WebVTT content into clean continuous text and timestamped segments.
    Cleans tags and deduplicates scrolling caption lines.
    """
    lines = vtt_text.splitlines()
    raw_segments = []
    
    current_time_str = "00:00"
    current_seconds = 0
    time_regex = re.compile(r'(\d{2}:\d{2}(?::\d{2})?(?:\.\d{3})?)\s*-->\s*(\d{2}:\d{2}(?::\d{2})?(?:\.\d{3})?)')
    
    def time_to_seconds(t_str: str) -> int:
        parts = t_str.split(':')
        if len(parts) == 2:
            m = int(parts[0])
            s = float(parts[1])
            return int(m * 60 + s)
        elif len(parts) == 3:
            h = int(parts[0])
            m = int(parts[1])
            s = float(parts[2])
            return int(h * 3600 + m * 60 + s)
        return 0

    def format_time_display(seconds: int) -> str:
        h = seconds // 3600
        m = (seconds % 3600) // 60
        s = seconds % 60
        if h > 0:
            return f"{h:02d}:{m:02d}:{s:02d}"
        return f"{m:02d}:{s:02d}"

    cleaned_text_lines: List[str] = []
    segments: List[Dict[str, Any]] = []
    
    current_segment_text = []
    seg_start_sec = 0

    for line in lines:
        line = line.strip()
        if not line or line.startswith('WEBVTT') or line.startswith('Kind:') or line.startswith('Language:'):
            continue
        
        time_match = time_regex.search(line)
        if time_match:
            start_raw = time_match.group(1)
            sec = time_to_seconds(start_raw)
            # If we accumulated segment lines and more than 15-20 seconds have passed, commit segment
            if current_segment_text and (sec - seg_start_sec >= 20):
                seg_text = " ".join(current_segment_text).strip()
                if seg_text:
                    segments.append({
                        "time": format_time_display(seg_start_sec),
                        "seconds": seg_start_sec,
                        "text": seg_text
                    })
                current_segment_text = []
                seg_start_sec = sec
            elif not current_segment_text:
                seg_start_sec = sec
            continue

        # Clean tags like <00:00:07.720><c> or </c>
        cleaned = re.sub(r'<[^>]+>', '', line)
        cleaned = html.unescape(cleaned).strip()
        
        # Deduplicate consecutive lines from live/scrolling captions
        if cleaned:
            if not cleaned_text_lines or cleaned_text_lines[-1] != cleaned:
                cleaned_text_lines.append(cleaned)
                if not current_segment_text or current_segment_text[-1] != cleaned:
                    current_segment_text.append(cleaned)

    # Flush last segment
    if current_segment_text:
        seg_text = " ".join(current_segment_text).strip()
        if seg_text:
            segments.append({
                "time": format_time_display(seg_start_sec),
                "seconds": seg_start_sec,
                "text": seg_text
            })

    full_text = " ".join(cleaned_text_lines)
    # Clean multiple spaces
    full_text = re.sub(r'\s+', ' ', full_text).strip()
    
    return full_text, segments

def extract_transcript(video_id: str) -> Dict[str, Any]:
    """
    Extract transcript for a video using yt-dlp.
    Returns dictionary with full_text, segments, word_count, and language.
    """
    video_url = f"https://www.youtube.com/watch?v={video_id}"
    
    with tempfile.TemporaryDirectory() as tmpdir:
        sub_base = os.path.join(tmpdir, "sub")
        
        # First attempt: English captions (manual + auto)
        ydl_opts_en = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
            'subtitleslangs': ['en', 'en-US', 'en-GB'],
            'subtitlesformat': 'vtt',
            'outtmpl': sub_base,
            'ignoreerrors': True,
            'quiet': True,
            'no_warnings': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts_en) as ydl:
            ydl.download([video_url])
            
        vtt_files = glob.glob(os.path.join(tmpdir, "*.vtt"))
        
        # If no English, fallback to any available language
        if not vtt_files:
            ydl_opts_all = {
                'skip_download': True,
                'writesubtitles': True,
                'writeautomaticsub': True,
                'subtitleslangs': ['all'],
                'subtitlesformat': 'vtt',
                'outtmpl': sub_base,
                'ignoreerrors': True,
                'quiet': True,
                'no_warnings': True,
            }
            with yt_dlp.YoutubeDL(ydl_opts_all) as ydl:
                ydl.download([video_url])
            vtt_files = glob.glob(os.path.join(tmpdir, "*.vtt"))

        if not vtt_files:
            raise ValueError(
                "No captions or subtitles found for this video. "
                "Please verify that this video has subtitles or auto-captions enabled on YouTube."
            )

        # Pick the largest/best VTT file
        vtt_files.sort(key=lambda f: os.path.getsize(f), reverse=True)
        chosen_file = vtt_files[0]
        
        with open(chosen_file, "r", encoding="utf-8", errors="replace") as f:
            vtt_raw = f.read()
            
        full_text, segments = parse_vtt_content(vtt_raw)
        
        if not full_text:
            raise ValueError("Transcript file was empty or could not be decoded.")

        words = full_text.split()
        word_count = len(words)
        
        # Estimated reading time (average 200 words per minute)
        reading_time_mins = max(1, round(word_count / 200))
        
        return {
            "full_text": full_text,
            "segments": segments,
            "word_count": word_count,
            "reading_time_mins": reading_time_mins,
            "file_name": os.path.basename(chosen_file)
        }

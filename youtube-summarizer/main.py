import os
import uvicorn
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from services.youtube import extract_video_id, fetch_video_metadata, extract_transcript
from services.summarizer import generate_summary

# Load environment variables from .env
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

app = FastAPI(
    title="YouTube Video Summarizer API",
    description="Extract transcripts and generate AI summaries of YouTube videos using Gemini",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request models
class VideoInfoRequest(BaseModel):
    url: str = Field(..., description="YouTube video URL or Video ID")

class SummarizeRequest(BaseModel):
    url: str = Field(..., description="YouTube video URL or Video ID")
    api_key: Optional[str] = Field(None, description="Optional Google Gemini API key")
    summary_type: str = Field("standard", description="tldr, standard, or detailed")
    language: str = Field("English", description="Target language for the summary")
    model: Optional[str] = Field(None, description="Optional model override")

# Mount static files
static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
async def serve_index():
    index_file = static_dir / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="Frontend index.html not found")
    return FileResponse(index_file)

@app.get("/api/status")
async def get_server_status():
    server_key = os.getenv("GEMINI_API_KEY", "").strip()
    is_valid_server_key = bool(server_key and server_key != "your_gemini_api_key_here")
    return {
        "status": "online",
        "has_server_gemini_key": is_valid_server_key,
        "default_models": ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
    }

@app.post("/api/video-info")
async def get_video_info(req: VideoInfoRequest):
    video_id = extract_video_id(req.url)
    if not video_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid YouTube URL. Please provide a valid YouTube watch link, shortlink, or video ID."
        )
    
    metadata = await fetch_video_metadata(video_id)
    return {
        "success": True,
        "video_id": video_id,
        "metadata": metadata
    }

@app.post("/api/summarize")
async def summarize_video(req: SummarizeRequest):
    video_id = extract_video_id(req.url)
    if not video_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid YouTube URL. Please provide a valid YouTube watch link, shortlink, or video ID."
        )
    
    # 1. Check API Key availability first to avoid unnecessary transcript downloads
    effective_key = req.api_key or os.getenv("GEMINI_API_KEY")
    if not effective_key or effective_key.strip() == "" or effective_key.strip() == "your_gemini_api_key_here":
        raise HTTPException(
            status_code=401,
            detail="Google Gemini API key not found. Please click Settings (or the status button in the top right) to enter your free Gemini API key."
        )

    # 2. Fetch metadata (fast oEmbed)
    metadata = await fetch_video_metadata(video_id)
    
    # 3. Extract transcript in worker thread to keep event loop responsive
    import asyncio
    try:
        transcript_data = await asyncio.to_thread(extract_transcript, video_id)
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch video transcript: {str(e)}"
        )
    
    full_transcript = transcript_data["full_text"]
    
    # 3. Generate summary with Gemini AI
    try:
        summary_result = await generate_summary(
            transcript=full_transcript,
            title=metadata["title"],
            author=metadata["author"],
            api_key=req.api_key,
            summary_type=req.summary_type,
            language=req.language,
            model_override=req.model
        )
    except ValueError as ve:
        # Missing API key
        raise HTTPException(status_code=401, detail=str(ve))
    except RuntimeError as re:
        # Gemini API error
        raise HTTPException(status_code=502, detail=str(re))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error while generating summary: {str(e)}")

    return {
        "success": True,
        "video_id": video_id,
        "metadata": metadata,
        "stats": {
            "word_count": transcript_data["word_count"],
            "reading_time_mins": transcript_data["reading_time_mins"],
            "segments_count": len(transcript_data["segments"]),
        },
        "summary": summary_result["summary"],
        "model_used": summary_result["model_used"],
        "segments": transcript_data["segments"]
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"Starting YouTube Summarizer server at http://127.0.0.1:{port}")
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)

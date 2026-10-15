import os
import httpx
from typing import Dict, Any, Optional

DEFAULT_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
]

def build_prompt(
    title: str,
    author: str,
    transcript: str,
    summary_type: str = "standard",
    language: str = "English"
) -> str:
    """Build a structured prompt tailored for YouTube video transcript summarization."""
    
    type_instructions = {
        "tldr": """
Generate a concise, professional executive briefing:
## Core Takeaway
State the primary thesis, argument, or conclusion of the video in 1-2 clear, authoritative sentences.

## Key Highlights
- Highlight 1: The central revelation or core insight.
- Highlight 2: Critical evidence, mechanism, or methodology discussed.
- Highlight 3: Notable result, implication, or outcome.
- Highlight 4: Practical lesson or strategic recommendation.

## Bottom Line
A direct synthesis of what the viewer should retain or do with this information.
""",
        "standard": """
Generate an executive-level summary and structured briefing:

## Executive Summary
A comprehensive 2-3 paragraph overview describing the video's thesis, the creator's central argument, the context, and the ultimate conclusion.

## Key Takeaways
Provide 4 to 6 concise, high-value bullet points summarizing the most critical points.

## Core Themes & Detailed Breakdown
Group the content into 3 to 5 logical sections or chronological chapters:
### [Section / Theme Title]
Thorough explanation of the concepts, examples, arguments, and evidence presented.

### [Section / Theme Title]
Thorough explanation of the concepts, examples, arguments, and evidence presented.

### [Section / Theme Title]
Thorough explanation of the concepts, examples, arguments, and evidence presented.

## Practical Applications & Takeaways
Actionable steps, rules of thumb, or key takeaways for the viewer.

## Notable Quotations
Direct or paraphrased key quotes from the speaker that capture essential insights.
""",
        "detailed": """
Generate a comprehensive study and analysis document:

## Executive Overview
A detailed analysis of the video's background, thesis, and overarching objective.

## Major Findings & Core Arguments
- Provide 6 to 8 substantive takeaways highlighting critical data, claims, or demonstrations.

## In-Depth Section Analysis
Provide an extensive, granular breakdown of every topic covered in the video, with clear subheadings, specific examples, and conceptual nuances.

## Implementation & Action Items
Step-by-step practical recommendations or actionable frameworks outlined by the speaker.

## Key Discussion & Review Points
3-4 thoughtful questions and analytical answers exploring subtle or complex aspects of the subject.
"""
    }

    instruction = type_instructions.get(summary_type, type_instructions["standard"])
    
    return f"""You are an elite research assistant and content analyst.
Analyze the following YouTube video transcript and produce a high quality, beautifully formatted Markdown summary.

Video Title: {title}
Creator / Channel: {author}
Target Language: {language} (Ensure the entire summary is written in {language})

Structure and style instructions:
{instruction}

Formatting rules:
- Use clean GitHub-flavored Markdown.
- Use bolding and emojis strategically for readability.
- Be objective, accurate, and faithful to what was actually said in the transcript.
- Do NOT hallucinate or extrapolate beyond the transcript.

--- TRANSCRIPT BEGINS ---
{transcript}
--- TRANSCRIPT ENDS ---
"""

async def generate_summary(
    transcript: str,
    title: str,
    author: str,
    api_key: Optional[str] = None,
    summary_type: str = "standard",
    language: str = "English",
    model_override: Optional[str] = None
) -> Dict[str, Any]:
    """
    Call Google Gemini API using async httpx to summarize the video transcript.
    Tries primary model and gracefully falls back if needed.
    """
    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key or key.strip() == "" or key.strip() == "your_gemini_api_key_here":
        raise ValueError(
            "Google Gemini API key not found. Please enter your Gemini API key in the settings "
            "or set GEMINI_API_KEY in the .env file. You can get a free key at https://aistudio.google.com/app/apikey"
        )

    key = key.strip()
    prompt = build_prompt(title, author, transcript, summary_type, language)

    # Models to try
    models_to_try = [model_override] if model_override else []
    for m in DEFAULT_MODELS:
        if m not in models_to_try:
            models_to_try.append(m)

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 4096
        }
    }

    last_error = None
    async with httpx.AsyncClient(timeout=60.0) as client:
        for model in models_to_try:
            endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
            try:
                resp = await client.post(endpoint, json=payload)
                
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        if parts and "text" in parts[0]:
                            summary_text = parts[0]["text"]
                            return {
                                "summary": summary_text,
                                "model_used": model,
                                "status": "success"
                            }
                
                # Check specific error statuses
                if resp.status_code == 400:
                    err_msg = resp.json().get("error", {}).get("message", "Invalid request")
                    last_error = f"Gemini API Error (400): {err_msg}"
                elif resp.status_code == 403:
                    last_error = "Invalid Gemini API key. Please check your key at https://aistudio.google.com/app/apikey"
                    break # Key is invalid, no need to retry models
                elif resp.status_code == 429:
                    last_error = "Gemini API rate limit exceeded. Please wait a minute or try again."
                else:
                    last_error = f"Gemini API returned status {resp.status_code}: {resp.text[:200]}"
                    
            except httpx.RequestError as e:
                last_error = f"Network connection error to Gemini API: {str(e)}"

    raise RuntimeError(last_error or "Failed to generate summary with Gemini API.")

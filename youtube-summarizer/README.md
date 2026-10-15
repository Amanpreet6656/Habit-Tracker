# 🎥 TubeBrief AI — YouTube Video Summarizer

> Turn hour-long YouTube videos, podcasts, conference talks, and tutorials into executive summaries, key takeaways, and action items in seconds. Powered by Google Gemini AI.

---

## ✨ Features

- ⚡ **Instant Summaries**: Paste any YouTube link (full URL, `youtu.be`, `/shorts/`, `/embed/`, or video ID).
- 🧠 **Google Gemini Powered**: Uses Google Gemini 2.5 Flash / 2.0 Flash / 1.5 Flash for high-speed, insightful summaries.
- 🎯 **Multiple Summary Modes**:
  - **⚡ Quick TL;DR**: 1-2 sentence core verdict + punchy highlight bullets.
  - **📌 Executive Summary**: High-level overview, key themes, detailed section breakdown, takeaways, and notable quotes.
  - **📚 In-Depth Breakdown**: Comprehensive notes, section-by-section analysis, and Q&A review.
- 🌍 **Multi-Language Support**: Summarize videos into English, Spanish, French, German, Hindi, Japanese, Portuguese, Chinese, and more.
- 📜 **Full Searchable Transcript**: View full timestamped transcripts with live search filtering.
- 📋 **1-Click Export**: Copy formatted markdown to clipboard or download as a `.md` document.
- 🔒 **Flexible API Key Configuration**:
  - Configure once in `.env` OR
  - Enter your key directly in the web UI Settings (saved securely in your browser's private local storage).

---

## 🚀 Quick Start

### 1. Launching via `run.bat` (Easiest for Windows)
Simply double-click `run.bat` inside the `youtube-summarizer` folder. It will check dependencies, launch the server, and open `http://localhost:8000` in your default browser.

### 2. Manual Terminal Launch

1. Navigate to the project directory:
   ```powershell
   cd "youtube-summarizer"
   ```

2. (Optional) Configure your Google Gemini API key:
   - Copy `.env.example` to `.env`:
     ```powershell
     copy .env.example .env
     ```
   - Open `.env` and add your Gemini API key:
     ```env
     GEMINI_API_KEY=AIzaSy...
     ```
   *(Note: You can also enter your key directly on the website UI without creating a `.env` file!)*

   > 💡 **Don't have a Gemini API key?** You can get a free key in under 30 seconds at [Google AI Studio](https://aistudio.google.com/app/apikey).

3. Start the FastAPI server:
   ```powershell
   python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```

4. Open your browser and visit:
   ```
   http://127.0.0.1:8000
   ```

---

## 🛠️ Project Structure

```
youtube-summarizer/
├── main.py                  # FastAPI application backend
├── services/
│   ├── __init__.py
│   ├── youtube.py           # Video metadata & resilient subtitle extraction
│   └── summarizer.py        # Gemini API client & structured prompt builder
├── static/
│   ├── index.html           # Modern responsive web UI
│   ├── app.js               # Client JavaScript & state management
│   └── style.css            # Custom typography, animations & styling
├── requirements.txt         # Python dependencies
├── .env.example             # Environment template
├── run.bat                  # One-click Windows runner
└── README.md                # Documentation
```

---

## 📋 Requirements
- Python 3.9 or higher
- Internet connection
- Free Google Gemini API Key

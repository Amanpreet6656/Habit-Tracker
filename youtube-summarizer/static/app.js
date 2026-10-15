// Professional YouTube Summarizer Client

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // State
  let state = {
    selectedSummaryType: "standard",
    serverHasKey: false,
    localKey: localStorage.getItem("gemini_api_key") || "",
    selectedModel: localStorage.getItem("gemini_model") || "gemini-2.5-flash",
    currentSummaryMarkdown: "",
    currentVideoTitle: "youtube-summary",
    transcriptSegments: [],
  };

  // DOM Elements
  const videoUrlInput = document.getElementById("videoUrl");
  const pasteBtn = document.getElementById("pasteBtn");
  const clearBtn = document.getElementById("clearBtn");
  const summarizeForm = document.getElementById("summarizeForm");
  const submitBtn = document.getElementById("submitBtn");
  const submitBtnText = document.getElementById("submitBtnText");
  const languageSelect = document.getElementById("languageSelect");

  const apiKeyStatusBtn = document.getElementById("apiKeyStatusBtn");
  const apiKeyDot = document.getElementById("apiKeyDot");
  const apiKeyLabel = document.getElementById("apiKeyLabel");

  const settingsModal = document.getElementById("settingsModal");
  const openSettingsBtn = document.getElementById("openSettingsBtn");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  const geminiKeyInput = document.getElementById("geminiKeyInput");
  const toggleKeyVisibility = document.getElementById("toggleKeyVisibility");
  const modelSelect = document.getElementById("modelSelect");
  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  const clearApiKeyBtn = document.getElementById("clearApiKeyBtn");

  const videoPreviewCard = document.getElementById("videoPreviewCard");
  const videoThumbnail = document.getElementById("videoThumbnail");
  const previewAuthor = document.getElementById("previewAuthor");
  const previewTitle = document.getElementById("previewTitle");
  const previewExternalLink = document.getElementById("previewExternalLink");

  const loadingCard = document.getElementById("loadingCard");
  const loadingTitle = document.getElementById("loadingTitle");
  const loadingSubtext = document.getElementById("loadingSubtext");

  const errorCard = document.getElementById("errorCard");
  const errorMessage = document.getElementById("errorMessage");
  const errorAction = document.getElementById("errorAction");
  const errorActionBtn = document.getElementById("errorActionBtn");

  const resultsCard = document.getElementById("resultsCard");
  const statWordCount = document.getElementById("statWordCount");
  const statReadTime = document.getElementById("statReadTime");
  const statModel = document.getElementById("statModel");
  const summaryMarkdown = document.getElementById("summaryMarkdown");
  const copySummaryBtn = document.getElementById("copySummaryBtn");
  const copyBtnText = document.getElementById("copyBtnText");
  const downloadMarkdownBtn = document.getElementById("downloadMarkdownBtn");

  const tabSummaryBtn = document.getElementById("tabSummaryBtn");
  const tabTranscriptBtn = document.getElementById("tabTranscriptBtn");
  const tabSummaryContent = document.getElementById("tabSummaryContent");
  const tabTranscriptContent = document.getElementById("tabTranscriptContent");
  const transcriptSearch = document.getElementById("transcriptSearch");
  const transcriptContainer = document.getElementById("transcriptContainer");

  // Load Initial Settings
  geminiKeyInput.value = state.localKey;
  modelSelect.value = state.selectedModel;

  // Check Server Status
  async function checkServerStatus() {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const data = await res.json();
        state.serverHasKey = data.has_server_gemini_key;
      }
    } catch (e) {
      console.warn("Could not check server status", e);
    }
    updateApiKeyStatusUI();
  }

  function updateApiKeyStatusUI() {
    const hasKey = state.serverHasKey || (state.localKey && state.localKey.trim().length > 0);
    if (hasKey) {
      apiKeyDot.className = "w-2 h-2 rounded-full bg-emerald-400";
      apiKeyLabel.textContent = state.localKey ? "Custom Key Set" : "Server Key Active";
      apiKeyStatusBtn.className = "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 hover:border-zinc-700 transition cursor-pointer";
    } else {
      apiKeyDot.className = "w-2 h-2 rounded-full bg-amber-400";
      apiKeyLabel.textContent = "Enter Gemini Key";
      apiKeyStatusBtn.className = "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-900 border border-amber-800/60 text-amber-300 hover:border-amber-700 transition cursor-pointer";
    }
  }

  // Toast Notification System
  function showToast(message, type = "info") {
    const toastContainer = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    const styles = {
      success: "bg-zinc-900 border-zinc-700 text-zinc-100",
      error: "bg-red-950/80 border-red-800 text-red-200",
      info: "bg-zinc-900 border-zinc-700 text-zinc-200",
    };
    
    toast.className = `toast pointer-events-auto flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-medium shadow-md ${styles[type] || styles.info}`;
    toast.innerHTML = `<span>${message}</span>`;
    
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.2s";
      setTimeout(() => toast.remove(), 200);
    }, 2800);
  }

  // Video URL Input Handlers
  let previewDebounce = null;
  videoUrlInput.addEventListener("input", () => {
    const val = videoUrlInput.value.trim();
    clearBtn.classList.toggle("hidden", val.length === 0);
    
    clearTimeout(previewDebounce);
    if (val.length > 5) {
      previewDebounce = setTimeout(() => fetchQuickPreview(val), 400);
    } else {
      videoPreviewCard.classList.add("hidden");
    }
  });

  pasteBtn.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        videoUrlInput.value = text.trim();
        clearBtn.classList.remove("hidden");
        fetchQuickPreview(text.trim());
      }
    } catch (e) {
      videoUrlInput.focus();
      showToast("Press Ctrl+V to paste", "info");
    }
  });

  clearBtn.addEventListener("click", () => {
    videoUrlInput.value = "";
    clearBtn.classList.add("hidden");
    videoPreviewCard.classList.add("hidden");
    videoUrlInput.focus();
  });

  // Example Link Chips
  document.querySelectorAll(".sample-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const url = chip.getAttribute("data-url");
      videoUrlInput.value = url;
      clearBtn.classList.remove("hidden");
      fetchQuickPreview(url);
    });
  });

  // Mode Segmented Buttons
  document.querySelectorAll(".summary-type-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".summary-type-btn").forEach((b) => {
        b.classList.remove("active", "bg-zinc-800", "text-zinc-100", "font-medium", "border", "border-zinc-700/60", "shadow-sm");
        b.classList.add("text-zinc-400");
      });
      btn.classList.add("active", "bg-zinc-800", "text-zinc-100", "font-medium", "border", "border-zinc-700/60", "shadow-sm");
      btn.classList.remove("text-zinc-400");
      state.selectedSummaryType = btn.getAttribute("data-type");
    });
  });

  // Quick Preview Fetcher
  async function fetchQuickPreview(url) {
    try {
      const res = await fetch("/api/video-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const data = await res.json();
        const meta = data.metadata;
        videoThumbnail.src = meta.thumbnail_url;
        previewAuthor.textContent = meta.author || "YouTube Video";
        previewTitle.textContent = meta.title || "Video";
        previewExternalLink.href = meta.video_url;
        videoPreviewCard.classList.remove("hidden");
        if (window.lucide) window.lucide.createIcons();
      }
    } catch (e) {
      // preview error ignored
    }
  }

  // Form Submit Handler
  summarizeForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = videoUrlInput.value.trim();
    if (!url) {
      showToast("Please enter a valid YouTube link", "error");
      return;
    }

    // Check key availability
    const hasKey = state.serverHasKey || (state.localKey && state.localKey.trim().length > 0);
    if (!hasKey) {
      openModal();
      showToast("Please configure your Gemini API Key", "info");
      return;
    }

    startLoading();

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url,
          api_key: state.localKey ? state.localKey.trim() : null,
          summary_type: state.selectedSummaryType,
          language: languageSelect.value,
          model: state.selectedModel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Failed to generate video summary.");
      }

      displayResults(data);
    } catch (err) {
      displayError(err.message);
    } finally {
      stopLoading();
    }
  });

  function startLoading() {
    errorCard.classList.add("hidden");
    resultsCard.classList.add("hidden");
    loadingCard.classList.remove("hidden");
    submitBtn.disabled = true;
    submitBtnText.textContent = "Processing...";
    loadingCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function stopLoading() {
    loadingCard.classList.add("hidden");
    submitBtn.disabled = false;
    submitBtnText.textContent = "Generate Summary";
  }

  function displayError(msg) {
    errorCard.classList.remove("hidden");
    errorMessage.textContent = msg;

    if (msg.toLowerCase().includes("api key")) {
      errorAction.classList.remove("hidden");
      errorActionBtn.onclick = openModal;
    } else {
      errorAction.classList.add("hidden");
    }

    if (window.lucide) window.lucide.createIcons();
    errorCard.scrollIntoView({ behavior: "smooth" });
  }

  function displayResults(data) {
    state.currentSummaryMarkdown = data.summary;
    state.currentVideoTitle = data.metadata.title || "youtube-summary";
    state.transcriptSegments = data.segments || [];

    // Metadata & Stats
    videoThumbnail.src = data.metadata.thumbnail_url;
    previewAuthor.textContent = data.metadata.author;
    previewTitle.textContent = data.metadata.title;
    previewExternalLink.href = data.metadata.video_url;
    videoPreviewCard.classList.remove("hidden");

    statWordCount.textContent = (data.stats.word_count || 0).toLocaleString();
    statReadTime.textContent = data.stats.reading_time_mins || 1;
    statModel.textContent = data.model_used || "Gemini";

    // Render Markdown
    if (window.marked && window.DOMPurify) {
      summaryMarkdown.innerHTML = DOMPurify.sanitize(marked.parse(data.summary));
    } else {
      summaryMarkdown.innerText = data.summary;
    }

    // Populate Transcript
    renderTranscript(state.transcriptSegments);

    // Switch to Summary Tab
    selectTab("summary");

    resultsCard.classList.remove("hidden");
    if (window.lucide) window.lucide.createIcons();
    resultsCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Render Transcript Segments
  function renderTranscript(segments, filter = "") {
    transcriptContainer.innerHTML = "";
    const filterLower = filter.toLowerCase();

    const filtered = filterLower
      ? segments.filter((s) => s.text.toLowerCase().includes(filterLower))
      : segments;

    if (filtered.length === 0) {
      transcriptContainer.innerHTML = `
        <div class="text-center py-6 text-zinc-500 text-xs font-sans">
          No matching transcript lines found.
        </div>
      `;
      return;
    }

    filtered.forEach((seg) => {
      const item = document.createElement("div");
      item.className = "py-1.5 flex items-start gap-2.5 hover:bg-zinc-800/40 px-2 rounded transition";
      item.innerHTML = `
        <span class="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[11px] shrink-0 border border-zinc-700/60 select-none">${seg.time}</span>
        <span class="text-zinc-300 text-xs leading-relaxed font-sans">${seg.text}</span>
      `;
      transcriptContainer.appendChild(item);
    });
  }

  // Transcript Search Filter
  transcriptSearch.addEventListener("input", (e) => {
    renderTranscript(state.transcriptSegments, e.target.value.trim());
  });

  // Tab Switching
  function selectTab(tab) {
    if (tab === "summary") {
      tabSummaryBtn.className = "tab-btn active px-4 py-2.5 font-medium border-b-2 border-blue-500 text-zinc-100 flex items-center gap-2 transition";
      tabTranscriptBtn.className = "tab-btn px-4 py-2.5 font-medium border-b-2 border-transparent text-zinc-400 hover:text-zinc-200 flex items-center gap-2 transition";
      tabSummaryContent.classList.remove("hidden");
      tabTranscriptContent.classList.add("hidden");
    } else {
      tabTranscriptBtn.className = "tab-btn active px-4 py-2.5 font-medium border-b-2 border-blue-500 text-zinc-100 flex items-center gap-2 transition";
      tabSummaryBtn.className = "tab-btn px-4 py-2.5 font-medium border-b-2 border-transparent text-zinc-400 hover:text-zinc-200 flex items-center gap-2 transition";
      tabTranscriptContent.classList.remove("hidden");
      tabSummaryContent.classList.add("hidden");
    }
  }

  tabSummaryBtn.addEventListener("click", () => selectTab("summary"));
  tabTranscriptBtn.addEventListener("click", () => selectTab("transcript"));

  // Copy Summary Handler
  copySummaryBtn.addEventListener("click", async () => {
    if (!state.currentSummaryMarkdown) return;
    try {
      await navigator.clipboard.writeText(state.currentSummaryMarkdown);
      copyBtnText.textContent = "Copied";
      showToast("Copied markdown to clipboard", "success");
      setTimeout(() => (copyBtnText.textContent = "Copy"), 2000);
    } catch (e) {
      showToast("Unable to copy to clipboard", "error");
    }
  });

  // Download Markdown Handler
  downloadMarkdownBtn.addEventListener("click", () => {
    if (!state.currentSummaryMarkdown) return;
    const blob = new Blob([state.currentSummaryMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const sanitizedTitle = state.currentVideoTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    link.href = url;
    link.download = `${sanitizedTitle}-summary.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Downloaded markdown summary", "success");
  });

  // Settings Modal Handlers
  function openModal() {
    geminiKeyInput.value = state.localKey;
    modelSelect.value = state.selectedModel;
    settingsModal.classList.remove("hidden");
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => geminiKeyInput.focus(), 100);
  }

  function closeModal() {
    settingsModal.classList.add("hidden");
  }

  openSettingsBtn.addEventListener("click", openModal);
  apiKeyStatusBtn.addEventListener("click", openModal);
  closeSettingsBtn.addEventListener("click", closeModal);

  // Close modal when clicking outside
  settingsModal.addEventListener("click", (e) => {
    if (e.target === settingsModal) closeModal();
  });

  // Toggle API Key visibility
  toggleKeyVisibility.addEventListener("click", () => {
    const isPass = geminiKeyInput.type === "password";
    geminiKeyInput.type = isPass ? "text" : "password";
  });

  // Save Settings
  saveSettingsBtn.addEventListener("click", () => {
    const key = geminiKeyInput.value.trim();
    const model = modelSelect.value;

    state.localKey = key;
    state.selectedModel = model;

    localStorage.setItem("gemini_api_key", key);
    localStorage.setItem("gemini_model", model);

    updateApiKeyStatusUI();
    closeModal();
    showToast("Settings saved", "success");
  });

  // Clear Key
  clearApiKeyBtn.addEventListener("click", () => {
    geminiKeyInput.value = "";
    state.localKey = "";
    localStorage.removeItem("gemini_api_key");
    updateApiKeyStatusUI();
    showToast("API key removed", "info");
  });

  // Initial status check
  checkServerStatus();
});

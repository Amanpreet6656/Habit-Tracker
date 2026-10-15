/**
 * Notion-Style Habit Tracker & Analytics Engine
 * Zero History Clean-Slate Architecture (Pure Vanilla JS & SVG)
 */

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // STORAGE KEYS (Fresh namespace ensures ZERO leftover demo history)
  // -------------------------------------------------------------------------
  const STORAGE_KEY_HABITS = 'notion_habits_v4_clean';
  const STORAGE_KEY_HISTORY = 'notion_history_v4_clean';
  const STORAGE_KEY_THEME = 'notion_theme_v4_pref';
  const STORAGE_KEY_SFX = 'notion_sfx_v4_pref';

  const CIRCLE_RADIUS = 76;
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~477.52

  // -------------------------------------------------------------------------
  // SUBTLE AUDIO FEEDBACK (Notion-style soft tap)
  // -------------------------------------------------------------------------
  let audioCtx = null;
  let sfxEnabled = true;

  function initAudio() {
    if (!audioCtx && (window.AudioContext || window.webkitAudioContext)) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSoftTap(isChecking = true) {
    if (!sfxEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      const now = audioCtx.currentTime;

      if (isChecking) {
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.03);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      } else {
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(280, now + 0.03);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.03);
      }
    } catch (e) {}
  }

  // -------------------------------------------------------------------------
  // DATE HELPERS
  // -------------------------------------------------------------------------
  function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getTodayKey() {
    return formatDateKey(new Date());
  }

  function formatHumanDate(date) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  // -------------------------------------------------------------------------
  // INITIAL CLEAN STATE (ZERO HISTORY)
  // -------------------------------------------------------------------------
  const DEFAULT_CLEAN_HABITS = [
    {
      id: 'h1',
      title: 'Morning Hydration (1L water)',
      category: 'Health',
      accent: 'health',
      description: 'Start fresh before checking notifications',
      streak: 0,
      completedToday: false
    },
    {
      id: 'h2',
      title: '30-Min Workout & Movement',
      category: 'Fitness',
      accent: 'fitness',
      description: 'Cardio, strength, or stretching',
      streak: 0,
      completedToday: false
    },
    {
      id: 'h3',
      title: 'Deep Focus Sprint (60 mins)',
      category: 'Focus',
      accent: 'focus',
      description: 'Uninterrupted creative or engineering work',
      streak: 0,
      completedToday: false
    },
    {
      id: 'h4',
      title: 'Read 20 Pages Non-Fiction',
      category: 'Mindset',
      accent: 'mindset',
      description: 'Books, essays, or research',
      streak: 0,
      completedToday: false
    }
  ];

  // ZERO HISTORY: Starts completely empty
  function getZeroHistory() {
    return {};
  }

  // -------------------------------------------------------------------------
  // APP STATE
  // -------------------------------------------------------------------------
  let state = {
    theme: 'light',
    activeFilter: 'all',
    habits: [],
    history: {}
  };

  function loadState() {
    state.theme = localStorage.getItem(STORAGE_KEY_THEME) || 'light';

    const savedSfx = localStorage.getItem(STORAGE_KEY_SFX);
    sfxEnabled = savedSfx !== null ? savedSfx === 'true' : true;

    // Load habits or clean default templates
    const savedHabits = localStorage.getItem(STORAGE_KEY_HABITS);
    if (savedHabits) {
      try {
        state.habits = JSON.parse(savedHabits);
      } catch (e) {
        state.habits = JSON.parse(JSON.stringify(DEFAULT_CLEAN_HABITS));
      }
    } else {
      state.habits = JSON.parse(JSON.stringify(DEFAULT_CLEAN_HABITS));
    }

    // Load history or ZERO history
    const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (savedHistory) {
      try {
        state.history = JSON.parse(savedHistory);
      } catch (e) {
        state.history = getZeroHistory();
      }
    } else {
      state.history = getZeroHistory();
    }

    syncTodayHistory();
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY_HABITS, JSON.stringify(state.habits));
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(state.history));
  }

  function syncTodayHistory() {
    const todayKey = getTodayKey();
    const total = state.habits.length;
    const completed = state.habits.filter(h => h.completedToday).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (completed > 0) {
      state.history[todayKey] = { completed, total, pct };
    } else {
      // If 0 habits completed today, keep it clean or at 0
      state.history[todayKey] = { completed: 0, total, pct: 0 };
    }
  }

  // -------------------------------------------------------------------------
  // NOTION THEME ENGINE
  // -------------------------------------------------------------------------
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY_THEME, theme);

    const themeCheckbox = document.getElementById('theme-checkbox');
    const thumbIcon = document.getElementById('theme-thumb-icon');

    if (themeCheckbox) {
      themeCheckbox.checked = theme === 'dark';
    }
    if (thumbIcon) {
      thumbIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }

    renderWeeklyBarChart();
  }

  function setupThemeToggle() {
    const themeCheckbox = document.getElementById('theme-checkbox');
    if (!themeCheckbox) return;

    themeCheckbox.addEventListener('change', (e) => {
      const newTheme = e.target.checked ? 'dark' : 'light';
      playSoftTap(true);
      applyTheme(newTheme);
    });

    applyTheme(state.theme);
  }

  function setupSoundToggle() {
    const btn = document.getElementById('sound-toggle-btn');
    const icon = document.getElementById('sound-icon');
    if (!btn) return;

    function updateLabel() {
      if (icon) icon.textContent = sfxEnabled ? '🔊' : '🔇';
      const labelText = btn.querySelector('.btn-label-text');
      if (labelText) labelText.textContent = `Sound: ${sfxEnabled ? 'On' : 'Off'}`;
    }

    btn.addEventListener('click', () => {
      sfxEnabled = !sfxEnabled;
      localStorage.setItem(STORAGE_KEY_SFX, String(sfxEnabled));
      if (sfxEnabled) playSoftTap(true);
      updateLabel();
    });

    updateLabel();
  }

  // -------------------------------------------------------------------------
  // NOTION PROGRESS RING & LINEAR BAR
  // -------------------------------------------------------------------------
  function updateProgressRingAndBar() {
    const total = state.habits.length;
    const completed = state.habits.filter(h => h.completedToday).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // SVG Circular Progress Ring
    const ringCircle = document.getElementById('progress-ring-circle');
    const ringPctText = document.getElementById('ring-pct-text');
    const ringStatusLabel = document.getElementById('ring-status-label');

    if (ringCircle) {
      const offset = CIRCLE_CIRCUMFERENCE - (CIRCLE_CIRCUMFERENCE * pct) / 100;
      ringCircle.style.strokeDashoffset = offset;

      if (pct === 100) {
        ringCircle.style.stroke = 'var(--accent-success)';
      } else if (pct >= 50) {
        ringCircle.style.stroke = 'var(--accent-primary)';
      } else {
        ringCircle.style.stroke = 'var(--accent-primary)';
      }
    }

    if (ringPctText) {
      ringPctText.textContent = `${pct}%`;
    }

    if (ringStatusLabel) {
      if (pct === 100) ringStatusLabel.textContent = 'All Completed 🎉';
      else if (pct >= 75) ringStatusLabel.textContent = 'Almost Done ✨';
      else if (pct >= 50) ringStatusLabel.textContent = 'Halfway ⚡';
      else if (pct > 0) ringStatusLabel.textContent = 'In Progress';
      else ringStatusLabel.textContent = 'Ready to Start';
    }

    // Linear Progress Bar
    const linearFill = document.getElementById('linear-fill-bar');
    const fractionText = document.getElementById('progress-fraction-text');
    const motivationCallout = document.getElementById('status-motivation-callout');

    if (linearFill) {
      linearFill.style.width = `${pct}%`;
    }
    if (fractionText) {
      fractionText.textContent = `${completed} / ${total} completed`;
    }
    if (motivationCallout) {
      if (pct === 100) {
        motivationCallout.textContent = '🎉 All daily targets checked off! Great work today.';
      } else if (pct >= 50) {
        motivationCallout.textContent = `✨ ${completed} of ${total} habits finished. Keep the momentum going!`;
      } else if (completed > 0) {
        motivationCallout.textContent = `⚡ Good start! Check off your remaining habits as you go.`;
      } else {
        motivationCallout.textContent = '💡 Check off habits above to build your daily progress.';
      }
    }

    // Top Metric Boxes
    const statTodayPct = document.getElementById('stat-today-pct');
    const statTodayFraction = document.getElementById('stat-today-fraction');
    const statMiniBar = document.getElementById('stat-mini-bar');
    const completionStatusBadge = document.getElementById('completion-status-badge');

    if (statTodayPct) statTodayPct.textContent = `${pct}%`;
    if (statTodayFraction) statTodayFraction.textContent = `${completed} / ${total} done`;
    if (statMiniBar) statMiniBar.style.width = `${pct}%`;
    if (completionStatusBadge) {
      completionStatusBadge.textContent = pct === 100 ? 'Completed' : 'Today';
    }

    // Calculate all-time check-ins count from history
    let totalCheckins = 0;
    Object.values(state.history).forEach(h => {
      if (h && h.completed) totalCheckins += h.completed;
    });

    const statTotalCompletions = document.getElementById('stat-total-completions');
    if (statTotalCompletions) statTotalCompletions.textContent = totalCheckins;
  }

  // -------------------------------------------------------------------------
  // NOTION WEEKLY BAR CHART (PURE SVG)
  // -------------------------------------------------------------------------
  function renderWeeklyBarChart() {
    const container = document.getElementById('weekly-barchart-container');
    if (!container) return;

    const today = new Date();
    const currentDayOfWeek = today.getDay();
    const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekData = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = formatDateKey(d);
      const isToday = key === getTodayKey();
      const hist = state.history[key] || { completed: 0, total: state.habits.length, pct: 0 };

      weekData.push({
        dayName: weekDays[i],
        date: d,
        dateKey: key,
        pct: hist.pct,
        completed: hist.completed,
        total: hist.total,
        isToday: isToday
      });
    }

    const svgWidth = 600;
    const svgHeight = 220;
    const padding = { top: 20, right: 20, bottom: 30, left: 45 };
    const chartW = svgWidth - padding.left - padding.right;
    const chartH = svgHeight - padding.top - padding.bottom;

    const targetY = padding.top + chartH * (1 - 0.80);

    let svgHtml = `<svg class="neo-chart-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet" aria-label="Weekly habit completion chart">`;

    // Horizontal Grid Lines
    [0, 25, 50, 75, 100].forEach(tier => {
      const y = padding.top + chartH * (1 - tier / 100);
      svgHtml += `
        <line x1="${padding.left}" y1="${y}" x2="${svgWidth - padding.right}" y2="${y}" class="chart-grid-line" />
        <text x="${padding.left - 8}" y="${y + 3}" text-anchor="end" class="chart-axis-label">${tier}%</text>
      `;
    });

    // 80% Target Line
    svgHtml += `
      <line x1="${padding.left}" y1="${targetY}" x2="${svgWidth - padding.right}" y2="${targetY}" class="chart-target-line" />
    `;

    // Baseline Axis
    svgHtml += `
      <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${svgWidth - padding.right}" y2="${padding.top + chartH}" class="chart-axis-line" />
    `;

    // Render Bars
    const barSlotWidth = chartW / 7;
    const barWidth = 32;

    weekData.forEach((day, index) => {
      const slotCenter = padding.left + index * barSlotWidth + barSlotWidth / 2;
      const barX = slotCenter - barWidth / 2;
      const barHeight = Math.max(day.pct > 0 ? 4 : 0, (day.pct / 100) * chartH);
      const barY = padding.top + chartH - barHeight;

      const barFill = day.isToday 
        ? 'var(--accent-primary)' 
        : (day.pct >= 80 ? 'var(--accent-success)' : 'var(--chart-bar-bg)');

      svgHtml += `
        <g class="chart-bar-group" data-day="${day.dayName}" data-pct="${day.pct}" data-completed="${day.completed}" data-total="${day.total}" data-date="${formatHumanDate(day.date)}" tabindex="0">
          <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" rx="4" ry="4" class="chart-bar-rect" style="fill: ${barFill};" />
          ${day.pct > 0 ? `<text x="${slotCenter}" y="${barY - 6}" class="chart-bar-value-badge">${day.pct}%</text>` : ''}
          <text x="${slotCenter}" y="${padding.top + chartH + 18}" class="chart-day-label ${day.isToday ? 'chart-day-today' : ''}">
            ${day.dayName}${day.isToday ? ' •' : ''}
          </text>
        </g>
      `;
    });

    svgHtml += `</svg>`;
    container.innerHTML = svgHtml;

    setupBarChartTooltips(container);

    // Weekly average
    const avgPct = Math.round(weekData.reduce((acc, d) => acc + d.pct, 0) / 7);
    const statWeeklyAvg = document.getElementById('stat-weekly-avg');
    if (statWeeklyAvg) statWeeklyAvg.textContent = `${avgPct}%`;
  }

  function setupBarChartTooltips(container) {
    const tooltip = document.getElementById('chart-tooltip');
    if (!tooltip) return;

    container.querySelectorAll('.chart-bar-group').forEach(group => {
      const showTooltip = () => {
        const day = group.getAttribute('data-day');
        const pct = group.getAttribute('data-pct');
        const completed = group.getAttribute('data-completed');
        const total = group.getAttribute('data-total');
        const date = group.getAttribute('data-date');

        tooltip.innerHTML = `<strong>${day}, ${date}</strong>\n${completed} of ${total} habits completed (${pct}%)`;
        tooltip.classList.add('is-visible');

        const rect = group.getBoundingClientRect();
        tooltip.style.left = `${Math.min(window.innerWidth - 180, Math.max(10, rect.left + rect.width / 2 - 80))}px`;
        tooltip.style.top = `${rect.top - 48}px`;
      };

      const hideTooltip = () => tooltip.classList.remove('is-visible');

      group.addEventListener('mouseenter', showTooltip);
      group.addEventListener('focus', showTooltip);
      group.addEventListener('mouseleave', hideTooltip);
      group.addEventListener('blur', hideTooltip);
    });
  }

  // -------------------------------------------------------------------------
  // NOTION STREAK HEATMAP (ZERO HISTORY STARTER)
  // -------------------------------------------------------------------------
  function renderHeatmapMatrix() {
    const board = document.getElementById('heatmap-board');
    if (!board) return;

    board.innerHTML = '';

    const today = new Date();
    const todayKey = getTodayKey();

    const totalWeeks = 14;
    const currentDayOfWeek = today.getDay();
    const dayIndexMon0 = (currentDayOfWeek + 6) % 7; 
    
    const daysBackToStartMon = (totalWeeks - 1) * 7 + dayIndexMon0;
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysBackToStartMon);

    // Day Labels Column
    const labelsCol = document.createElement('div');
    labelsCol.className = 'heatmap-day-labels-col';
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(label => {
      const lbl = document.createElement('div');
      lbl.className = 'heatmap-day-label';
      lbl.textContent = label;
      labelsCol.appendChild(lbl);
    });
    board.appendChild(labelsCol);

    let activeDaysCount = 0;
    let runningDate = new Date(startDate);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let lastRenderedMonth = -1;

    for (let w = 0; w < totalWeeks; w++) {
      const weekCol = document.createElement('div');
      weekCol.className = 'heatmap-week-col';

      const monthHeader = document.createElement('div');
      monthHeader.className = 'heatmap-month-header';
      
      const currentMonth = runningDate.getMonth();
      if (currentMonth !== lastRenderedMonth) {
        monthHeader.textContent = monthNames[currentMonth];
        lastRenderedMonth = currentMonth;
      } else {
        monthHeader.innerHTML = '&nbsp;';
      }
      weekCol.appendChild(monthHeader);

      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(runningDate);
        const cellKey = formatDateKey(cellDate);
        const isFuture = cellDate > today;
        const isToday = cellKey === todayKey;

        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';

        if (isFuture) {
          cell.style.visibility = 'hidden';
        } else {
          // Zero history: if not in history, completion is 0
          const hist = state.history[cellKey] || { completed: 0, total: state.habits.length, pct: 0 };
          const pct = hist.pct;

          let lvl = 0;
          if (pct > 75) lvl = 4;
          else if (pct > 50) lvl = 3;
          else if (pct > 25) lvl = 2;
          else if (pct > 0) lvl = 1;

          cell.classList.add(`lvl-${lvl}`);

          if (isToday) {
            cell.classList.add('is-today');
          }

          if (hist.completed > 0) {
            activeDaysCount++;
          }

          cell.setAttribute('data-date', formatHumanDate(cellDate));
          cell.setAttribute('data-pct', `${pct}%`);
          cell.setAttribute('data-completed', hist.completed);
          cell.setAttribute('data-total', hist.total);

          setupHeatmapCellTooltip(cell);
        }

        weekCol.appendChild(cell);
        runningDate.setDate(runningDate.getDate() + 1);
      }

      board.appendChild(weekCol);
    }

    // Live streak calculation
    let checkDate = new Date(today);
    let streakLive = 0;
    while (true) {
      const k = formatDateKey(checkDate);
      const h = state.history[k];
      if (h && h.completed > 0) {
        streakLive++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const heatmapDaysPill = document.getElementById('heatmap-active-days-count');
    if (heatmapDaysPill) heatmapDaysPill.textContent = activeDaysCount;

    const statStreak = document.getElementById('stat-current-streak');
    if (statStreak) statStreak.textContent = streakLive;

    const statBestStreak = document.getElementById('stat-best-streak');
    if (statBestStreak) statBestStreak.textContent = `${streakLive} Days`;
  }

  function setupHeatmapCellTooltip(cell) {
    const tooltip = document.getElementById('chart-tooltip');
    if (!tooltip) return;

    cell.addEventListener('mouseenter', () => {
      const date = cell.getAttribute('data-date');
      const pct = cell.getAttribute('data-pct');
      const completed = cell.getAttribute('data-completed');
      const total = cell.getAttribute('data-total');

      tooltip.innerHTML = `<strong>${date}</strong>\n${completed} of ${total} habits completed (${pct})`;
      tooltip.classList.add('is-visible');

      const rect = cell.getBoundingClientRect();
      tooltip.style.left = `${Math.min(window.innerWidth - 180, Math.max(10, rect.left - 60))}px`;
      tooltip.style.top = `${rect.top - 48}px`;
    });

    cell.addEventListener('mouseleave', () => {
      tooltip.classList.remove('is-visible');
    });
  }

  // -------------------------------------------------------------------------
  // HABITS CHECKLIST RENDERING
  // -------------------------------------------------------------------------
  function renderHabitsList() {
    const container = document.getElementById('habits-list');
    if (!container) return;

    container.innerHTML = '';

    const filtered = state.habits.filter(h => {
      if (state.activeFilter === 'all') return true;
      return h.category.toLowerCase() === state.activeFilter.toLowerCase();
    });

    const countAll = document.getElementById('count-all');
    if (countAll) countAll.textContent = state.habits.length;

    const statActiveHabits = document.getElementById('stat-active-habits-count');
    if (statActiveHabits) statActiveHabits.textContent = `${state.habits.length} habits`;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="notion-empty-state">
          No habits registered in this category. Click "+ New Habit" to create one.
        </div>
      `;
      return;
    }

    filtered.forEach(habit => {
      const itemRow = document.createElement('div');
      itemRow.className = `habit-row-item ${habit.completedToday ? 'is-completed' : ''}`;
      itemRow.setAttribute('data-id', habit.id);

      const tagClass = `tag-${habit.category.toLowerCase()}`;

      itemRow.innerHTML = `
        <div class="habit-left-group">
          <!-- SPEC 1: Notion Custom Checkbox -->
          <label class="neo-checkbox-container" title="Toggle habit">
            <input type="checkbox" class="neo-checkbox-input" ${habit.completedToday ? 'checked' : ''} data-id="${habit.id}">
            <div class="neo-checkbox-custom">
              <svg class="neo-check-icon" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          </label>

          <div class="habit-info">
            <div class="habit-name">${escapeHtml(habit.title)}</div>
            <div class="habit-sub-meta">
              <span class="habit-tag ${tagClass}">${habit.category}</span>
              <span>${escapeHtml(habit.description || '')}</span>
            </div>
          </div>
        </div>

        <div class="habit-actions-group">
          <div class="habit-streak-badge" title="Consistency streak">
            🔥 ${habit.streak}d
          </div>
          <button class="habit-delete-btn" data-id="${habit.id}" title="Delete habit" aria-label="Delete habit">
            ✕
          </button>
        </div>
      `;

      const checkbox = itemRow.querySelector('.neo-checkbox-input');
      checkbox.addEventListener('change', (e) => {
        handleHabitToggle(habit.id, e.target.checked);
      });

      const deleteBtn = itemRow.querySelector('.habit-delete-btn');
      deleteBtn.addEventListener('click', () => {
        handleHabitDelete(habit.id);
      });

      container.appendChild(itemRow);
    });
  }

  function handleHabitToggle(habitId, isCompleted) {
    playSoftTap(isCompleted);

    const habit = state.habits.find(h => h.id === habitId);
    if (!habit) return;

    habit.completedToday = isCompleted;
    if (isCompleted) {
      habit.streak += 1;
    } else {
      habit.streak = Math.max(0, habit.streak - 1);
    }

    syncTodayHistory();
    saveState();

    renderHabitsList();
    updateProgressRingAndBar();
    renderWeeklyBarChart();
    renderHeatmapMatrix();
  }

  function handleHabitDelete(habitId) {
    if (!confirm('Delete this habit?')) return;
    playSoftTap(false);

    state.habits = state.habits.filter(h => h.id !== habitId);
    syncTodayHistory();
    saveState();

    renderHabitsList();
    updateProgressRingAndBar();
    renderWeeklyBarChart();
    renderHeatmapMatrix();
  }

  function setupCategoryFilters() {
    const filterTabs = document.querySelectorAll('.notion-filter-pill');
    filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        playSoftTap(true);
        filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeFilter = tab.getAttribute('data-filter');
        renderHabitsList();
      });
    });
  }

  // -------------------------------------------------------------------------
  // NOTION MODAL DIALOG
  // -------------------------------------------------------------------------
  function setupModal() {
    const modal = document.getElementById('add-habit-modal');
    const openBtn = document.getElementById('open-add-habit-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    const cancelBtn = document.getElementById('cancel-modal-btn');
    const form = document.getElementById('new-habit-form');

    if (!modal || !openBtn) return;

    const openModal = () => {
      playSoftTap(true);
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      const input = document.getElementById('habit-name-input');
      if (input) input.focus();
    };

    const closeModal = () => {
      playSoftTap(false);
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      if (form) form.reset();
    };

    openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const titleInput = document.getElementById('habit-name-input');
        const catSelect = document.getElementById('habit-category-select');
        const descInput = document.getElementById('habit-desc-input');

        const title = titleInput.value.trim();
        if (!title) return;

        const category = catSelect ? catSelect.value : 'Focus';

        const newHabit = {
          id: 'h_' + Date.now(),
          title: title,
          category: category,
          accent: category.toLowerCase(),
          description: descInput ? descInput.value.trim() : '',
          streak: 0,
          completedToday: false
        };

        state.habits.push(newHabit);
        syncTodayHistory();
        saveState();

        playSoftTap(true);
        closeModal();

        renderHabitsList();
        updateProgressRingAndBar();
        renderWeeklyBarChart();
        renderHeatmapMatrix();
      });
    }
  }

  // -------------------------------------------------------------------------
  // CLEAN SLATE RESET / ZERO HISTORY CONTROLS
  // -------------------------------------------------------------------------
  function setupZeroHistoryControls() {
    const clearBtn = document.getElementById('reset-demo-data-btn');
    if (!clearBtn) return;

    clearBtn.addEventListener('click', () => {
      if (!confirm('Reset all tracking data and start fresh with zero history?')) return;
      playSoftTap(true);

      // Reset habits to fresh uncompleted state
      state.habits.forEach(h => {
        h.completedToday = false;
        h.streak = 0;
      });

      // Clear all history
      state.history = getZeroHistory();
      saveState();

      renderHabitsList();
      updateProgressRingAndBar();
      renderWeeklyBarChart();
      renderHeatmapMatrix();
    });
  }

  function updateDateHeader() {
    const dateText = document.getElementById('header-date-text');
    if (dateText) {
      dateText.textContent = formatHumanDate(new Date());
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // -------------------------------------------------------------------------
  // INITIALIZATION
  // -------------------------------------------------------------------------
  function init() {
    loadState();
    updateDateHeader();
    setupThemeToggle();
    setupSoundToggle();
    setupCategoryFilters();
    setupModal();
    setupZeroHistoryControls();

    renderHabitsList();
    updateProgressRingAndBar();
    renderWeeklyBarChart();
    renderHeatmapMatrix();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

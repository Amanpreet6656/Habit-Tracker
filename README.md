# 🎯 Habit Tracker — Notion Workspace Edition

A distraction-free, Notion-styled daily habit tracker and visual analytics dashboard configured with **zero prior history** so you can start tracking with a completely clean slate.

---

## 🖤 Notion Aesthetic & Workspace Design

- **Authentic Notion Palette**:
  - **Light Mode**: Pure `#FFFFFF` background, `#F7F6F3` secondary surfaces, `#E9E9E7` borders, `#37352F` primary text, and `#787774` muted text.
  - **Dark Mode**: Pitch-comfortable `#191919` dark canvas, `#202020` elevated surfaces, `#2E2E2E` borders, and `#E6E6E6` primary text.
- **Notion UI Components**:
  - **Breadcrumb Navigation**: `Workspace / 🎯 Personal / Habit Tracker`
  - **Hero Header**: Page icon (`🎯`), title, and description.
  - **Callout Block**: Clean `💡` callout note for workspace guidance.
  - **Database Property Tags**: Pastel color chips for categories (Blue for Fitness, Purple for Focus, Green for Health, Yellow for Mindset).
  - **Custom Notion Checkboxes**: 18px rounded square checkboxes with animated checkmarks and subtle strikethrough effect.
  - **Notion-Style Theme Switch**: Sleek pill toggle switch for Light ⇄ Dark switching.

---

## ⚡ Zero History Clean-Slate Architecture

- **Fresh Start**: No fake 90-day history. All past days start at 0% / empty.
- **Real-Time Organic Growth**:
  - Daily progress ring and linear progress bar start at 0% today.
  - As you check off habits, today's metrics, weekly bar chart, and heatmap matrix update dynamically.
  - Streaks and all-time check-in stats reflect only your actual logged activity.
- **Reset Option**: Use the `↺ Reset to Zero` button anytime to clear logged history and return to a fresh slate.

---

## 📊 Analytics Features (Zero Dependencies)

1. **Today's Completion**: Circular progress ring & Notion-style database progress bar.
2. **Weekly Habit Bar Chart**: Pure SVG bar chart with rounded tops, gridlines, and an 80% target line.
3. **Consistency Heatmap**: 14-week (98-day) block matrix that fills in organically as you build your habits.
4. **Soft Audio Feedback**: Subtle sine wave tap upon checking or unchecking habits (toggleable).

---

## 💻 How to Run

Open [**`index.html`**](file:///c:/Users/amanp/Downloads/habit%20tracker/index.html) in your browser:
```powershell
python -m http.server 8000
```
Then visit `http://localhost:8000`.

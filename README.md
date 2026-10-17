# Habit Tracker: Notion Workspace Edition

A daily habit tracking dashboard and visual analytics interface built with a Notion-inspired design system. The application initializes with a strictly empty dataset to ensure tracking metrics reflect only actual user input.

## Design System and UI Components

The application interface replicates the Notion workspace aesthetic, utilizing a precise color palette and structural components:

* **Light Mode:** `#FFFFFF` background, `#F7F6F3` secondary surfaces, `#E9E9E7` borders, `#37352F` primary text, and `#787774` muted text.
* **Dark Mode:** `#191919` canvas, `#202020` elevated surfaces, `#2E2E2E` borders, and `#E6E6E6` primary text.
* **Core Components:**
  * Structural navigation via workspace breadcrumbs.
  * Standardized page headers and callout blocks for contextual guidance.
  * Database property tags for habit categorization (Fitness, Focus, Health, and Mindset).
  * Custom 18px rounded square checkboxes featuring state-based strikethrough formatting.
  * Standard toggle switch for Light and Dark theme selection.

## Data Architecture and Analytics

The application operates on a zero-history architecture, requiring no external dependencies for data visualization. 

* **State Initialization:** All historical datasets start empty. Streaks and all-time check-in statistics calculate dynamically based on active daily logging.
* **Daily Metrics:** Real-time computation displayed via a circular progress ring and a linear database progress bar.
* **Weekly Aggregation:** Rendered via a native SVG bar chart incorporating axis gridlines and a static 80% target threshold line.
* **Long-Term Consistency:** A 14-week (98-day) chronological heatmap matrix that populates proportionally to logged activity.
* **Interactive Feedback:** Synthesized sine wave auditory confirmation on checkbox state changes, with user toggle functionality.
* **Data Management:** A hard reset function allows the user to clear all logged history arrays and return the interface to a base state.

## Local Execution

To run the application locally, initialize a local web server in the project directory:

```bash
python -m http.server 8000

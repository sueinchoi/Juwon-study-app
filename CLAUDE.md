# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Juwon's Word Adventure** — a child-friendly English vocabulary learning app for young Korean-speaking learners (ages 7-9). Full-stack web app with vanilla JavaScript frontend and Node.js/Express backend. The backend proxies Claude API calls for AI-powered features (spelling hints, sentence review, etc.).

## Running the App

```bash
cd server && npm install && npm start
# Serves on http://localhost:3000
```

The Express server serves static files from the project root and provides a single API endpoint (`POST /api/claude`) that proxies requests to the Anthropic Claude API. Requires `ANTHROPIC_API_KEY` in `.env` at project root.

No build step, bundler, test suite, or linter is configured.

## Architecture

### Module System

All frontend JS modules use the **Revealing Module Pattern (IIFE)**:
```javascript
const ModuleName = (() => {
  // private state
  return { publicMethods };
})();
```

Modules are loaded via `<script>` tags in `index.html` and communicate through their public APIs. Entry point: `DOMContentLoaded` → `App.init()`.

### Key Modules (js/)

- **app.js** — Main controller: screen navigation (DOM visibility toggling via `data-screen`), settings (parent-locked with math question), daily streak tracking, utilities (feedback display, celebration confetti, text-to-speech)
- **words.js** — Word CRUD + localStorage persistence (`jw_words`). Also exports `ProgressData` for shared progress state (`jw_progress`)
- **ai.js** — Claude API integration with 3-tier fallback: built-in dictionary (165+ words) → API call → morphological guessing. Functions: `getWordInfo()`, `getSpellingHint()`, `getSentenceExample()`, `getSentenceStarter()`, `reviewSentence()`, `getFallbackPOS()`
- **spelling.js** — Spelling game with practice (hints allowed) and test (scored) modes
- **partsOfSpeech.js** — Parts of speech quiz (noun/verb/adjective/adverb) with learn screen
- **sentences.js** — Sentence writing game with validation (word inclusion, capitalization, punctuation, length) and AI review
- **progress.js** — Badge system (13 badges), per-word star visualization, overall mastery percentage

### Data Model

Word objects stored in localStorage:
```javascript
{ id, word, meaning, pos, example, dateAdded }
```

Star system: 3 stars max per category (Spelling, Parts of Speech, Sentences) = 9 stars max per word. Mastery = 3 stars in all three categories.

Storage keys: `jw_words`, `jw_progress`, `jw_streak`, `jw_settings`

### Backend (server/)

Express server (`server.js`) with three responsibilities:
1. Static file serving from project root
2. CORS middleware
3. `POST /api/claude` — proxies to `https://api.anthropic.com/v1/messages` using `claude-sonnet-4-5-20250929`, max 300 tokens

## Code Conventions

- **IIFE module pattern** for all frontend modules — maintain this pattern
- camelCase for variables/functions, PascalCase for modules, UPPERCASE for constants
- Semicolons required, 2-space indentation
- Section comments use `// ===== SECTION NAME =====` format
- HTML rendering via template literals in JS (no templating library)
- All game modules follow consistent structure: `reset()` → `start()` → `show()` → `check()` → `results()`
- Child-friendly UI: large buttons, colorful design, emoji in UI, encouraging feedback messages
- Bilingual: UI labels in Korean, learning content in English

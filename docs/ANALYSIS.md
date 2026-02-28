# Agentex Chrome Extension — Comprehensive Analysis

*Generated: 2026-02-27*

---

## 1. Project Overview

**Agentex** is a Chrome Manifest V3 extension that automates resume tailoring for job descriptions using AI. Users upload a LaTeX resume, paste a job description, optionally provide a "knowledge base" of additional experience, and the AI rewrites the resume to maximize ATS (Applicant Tracking System) compatibility.

| Attribute | Value |
|-----------|-------|
| **Version** | 3.0 |
| **Format** | Chrome Extension (Manifest V3, Side Panel) |
| **AI Providers** | Google Gemini (primary), Anthropic Claude (optional) |
| **File Format** | LaTeX (.tex) only |
| **Backend** | Node.js/Express on Render.com for PDF compilation |
| **License** | MIT |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────┐
│              Chrome Extension (Client)           │
│  ┌───────────┐ ┌──────────────┐ ┌─────────────┐ │
│  │  UI Layer │→│Service Layer │→│Storage Layer │ │
│  │(sidepanel)│ │ (AIService)  │ │(chrome.stor.)│ │
│  └───────────┘ └──────────────┘ └─────────────┘ │
└────────────────────┬────────────────┬────────────┘
                     │                │
         ┌───────────┘                └──────────┐
         ▼                                       ▼
  ┌──────────────┐                     ┌─────────────────┐
  │  Gemini API  │                     │  LaTeX Server   │
  │ /Claude API  │                     │ (Render.com)    │
  └──────────────┘                     └─────────────────┘
```

### Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `sidepanel.js` | 791 | Main UI controller — file upload, generate, preview, settings |
| `ai-service.js` | 573 | AI provider abstraction with guardrails & validation |
| `config.js` | 97 | Centralized config (API keys, models, guardrail params) |
| `gemini-prompts.js` | 270 | Multi-agent prompt pipeline (5 specialized prompts) |
| `server.js` | 467 | Express server for LaTeX→PDF compilation |
| `serverManager.js` | 357 | Client-side server API wrapper |
| `file-handler.js` | 116 | LaTeX file validation and reading |
| `background.js` | 44 | Service worker — side panel & context menu |
| `sidepanel.html` | 333 | Main UI markup |
| `style.css` | ~800 | Full styling |
| `manifest.json` | 57 | Extension manifest |

---

## 3. Core Features

### ✅ What Works Well

1. **Guardrails System** — Content inventory, fabrication detection, length validation, protected sections, corrective retry loop
2. **Multi-Agent Pipeline** — 5-step prompt chain (analysis → projects → skills → experience → polish) for thorough optimization
3. **Knowledge Base** — Users can supply extra projects/experience for the AI to draw from
4. **User Instructions** — Focus areas, preserve content, custom instructions
5. **Session Persistence** — State saved to `chrome.storage.local` across sessions
6. **Dual Provider** — Gemini + Claude support with easy switching
7. **LaTeX Integrity** — Structure validation ensures `\documentclass`, `\begin{document}`, `\end{document}` survive
8. **PDF Preview** — Server-side LaTeX compilation with in-panel viewing

---

## 4. Limitations & Issues

### 🔴 Critical

| # | Issue | Impact |
|---|-------|--------|
| 1 | **Gemini 2.0 Flash is DEPRECATED** | Model will stop working. Must upgrade to `gemini-2.5-flash` or `gemini-3-flash-preview` |
| 2 | **Hardcoded API key in `config.js`** | Security vulnerability — key exposed in public repo |
| 3 | **`gemini-prompts.js` uses ES module `export`** but is loaded as a regular `<script>` tag | Module exports never actually work in extension context; prompts are only used via `window.GeminiPrompts` fallback |

### 🟡 Moderate

| # | Issue | Impact |
|---|-------|--------|
| 4 | **No download button in UI** | `sidepanel.html` has no download button for tailored `.tex` or PDF |
| 5 | **Multi-agent pipeline not connected** | `gemini-prompts.js` defines 5 prompts but `ai-service.js` only uses single-pass mode |
| 6 | **Stale DOCX/Groq references in docs** | `API.md`, `TROUBLESHOOTING.md`, `SECURITY.md`, `ARCHITECTURE.md` reference removed features |
| 7 | **Claude API CORS issue** | Anthropic blocks direct browser API calls; Claude requires a proxy server |
| 8 | **No rate limiting** | Multiple rapid clicks on Generate can fire parallel AI requests |
| 9 | **Remote server dependency** | PDF compilation depends on `agentex.onrender.com` which may cold-start slowly |

### 🟢 Minor

| # | Issue | Impact |
|---|-------|--------|
| 10 | **Content inventory regex is basic** | Only matches `\textbf{}` for skills; misses other LaTeX patterns |
| 11 | **Similarity check is Jaccard only** | Word-level Jaccard is crude; could use cosine or edit distance |
| 12 | **No automated tests** | Zero unit/integration/e2e tests |
| 13 | **`strictMode`, `preserveEducation`, `preserveContact` settings** saved but not wired into AI prompts |
| 14 | **Version mismatch** | Manifest says v3.0, CHANGELOG says v2.1, docs say v2.0 |

---

## 5. Feature Gap Analysis (vs. Goal)

**Goal: Automate resume tailoring for job descriptions**

| Feature | Status | Gap |
|---------|--------|-----|
| Upload LaTeX resume | ✅ Working | — |
| Paste job description | ✅ Working | — |
| AI tailors resume | ✅ Working (single-pass) | Multi-agent pipeline not connected |
| Knowledge base for projects | ✅ Working | — |
| Guardrails prevent fabrication | ✅ Working | Could be stronger |
| PDF preview | ✅ Working | Depends on remote server |
| Download tailored resume | ❌ Missing | No download button in UI |
| Multiple format support | ❌ LaTeX only | No PDF/DOCX input support |
| Job scraping from browser tab | ❌ Missing | Could auto-extract JD from active tab |
| Batch tailoring | ❌ Missing | One job at a time |
| Resume scoring/comparison | ❌ Missing | No before/after metrics |
| Template library | ❌ Missing | Users must bring their own .tex |

---

## 6. Gemini API Status (as of Feb 2026)

| Model | Status | Notes |
|-------|--------|-------|
| `gemini-2.0-flash` | **⛔ Deprecated** | Currently used by Agentex |
| `gemini-2.5-flash` | ✅ Stable (GA) | Best price-performance for reasoning |
| `gemini-2.5-flash-lite` | ✅ Stable | Fastest, cheapest |
| `gemini-3-flash-preview` | 🟡 Preview | Frontier performance |
| `gemini-3.1-pro-preview` | 🟡 Preview | Most intelligent |

**Recommendation**: Upgrade to `gemini-2.5-flash` for stability, with option to select `gemini-3-flash-preview` in the UI.

### REST API Format (unchanged)
```
POST https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent
Header: x-goog-api-key: $API_KEY  (or ?key= query param)
Body: { "contents": [{ "parts": [{ "text": "..." }] }] }
```

---

## 7. Security Assessment

| Finding | Severity | Recommendation |
|---------|----------|----------------|
| Hardcoded API key in `config.js` | 🔴 Critical | Remove and revoke immediately |
| API key sent as query parameter | 🟡 Medium | Use `x-goog-api-key` header instead |
| No CSP for external fonts | 🟢 Low | Fonts loaded from Google CDN |
| Claude API called directly from browser | 🟡 Medium | Won't work due to CORS; needs proxy |
| Server CORS allows `<all_urls>` in manifest | 🟡 Medium | Restrict to needed origins |

---

## 8. Recommendations Priority List

1. **Upgrade Gemini model** → `gemini-2.5-flash` (immediate)
2. **Remove hardcoded API key** from `config.js` (immediate)
3. **Add download functionality** — download `.tex` and compiled PDF buttons
4. **Connect multi-agent pipeline** — wire up `gemini-prompts.js` as an option
5. **Add job scraping** — content script to extract JD from active browser tab
6. **Wire guardrail settings** — connect `strictMode`, `preserveEducation`, etc. to prompts
7. **Add automated tests** — at least for guardrail validation logic
8. **Clean up stale docs** — remove DOCX/Groq references
9. **Add resume scoring** — show keyword match % before/after
10. **Support more input formats** — PDF parsing, Google Docs import

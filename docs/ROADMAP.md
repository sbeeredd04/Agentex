# Agentex — Architecture Analysis, Improvements & Roadmap

*Version: 5.1 | Last Updated: March 2026*

---

## Table of Contents

1. [Architecture Analysis](#architecture-analysis)
2. [Current Strengths](#current-strengths)
3. [Identified Weaknesses](#identified-weaknesses)
4. [Recent Improvements (v5.1)](#recent-improvements-v51)
5. [Short-Term Plan (v5.2–v5.5)](#short-term-plan-v52v55)
6. [Medium-Term Plan (v6.0)](#medium-term-plan-v60)
7. [Long-Term Vision (v7.0+)](#long-term-vision-v70)
8. [Technical Debt](#technical-debt)
9. [Performance Budget](#performance-budget)

---

## Architecture Analysis

### Component Map

```
┌─────────────────────────────────────────────────────────────────┐
│  Chrome Extension (Manifest V3)                                 │
│                                                                 │
│  Content Script Layer          Side Panel Layer                  │
│  ┌──────────────────┐         ┌──────────────────────────┐     │
│  │ content-panel.js │         │ sidepanel.js             │     │
│  │ Shadow DOM panel  │         │ Config, upload, model    │     │
│  │ ├─ JD input      │         │ ├─ API keys              │     │
│  │ ├─ Model select  │◄──sync──┤ ├─ Knowledge Base        │     │
│  │ ├─ Generate btn  │         │ ├─ Focus areas (opt-in)  │     │
│  │ ├─ Output tabs   │         │ ├─ Guardrails            │     │
│  │ └─ PDF viewer    │         │ └─ One-page toggle       │     │
│  └────────┬─────────┘         └────────────┬─────────────┘     │
│           │ chrome.runtime.sendMessage      │                   │
│           ▼                                 ▼                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │                  background.js (Service Worker)         │     │
│  │  ├─ Message router                                      │     │
│  │  ├─ Panel state (session storage)                       │     │
│  │  ├─ PDF cache (in-memory, SHA-256 keyed)               │     │
│  │  └─ AI service lifecycle                                │     │
│  └────────┬───────────────────────────┬───────────────────┘     │
│           │                           │                         │
│           ▼                           ▼                         │
│  ┌─────────────────┐      ┌───────────────────┐               │
│  │ ai-service.js   │      │ config.js          │               │
│  │ Expert prompt    │      │ 18 models, 4 APIs  │               │
│  │ Guardrails       │      │ Server URL (auto)  │               │
│  │ Validation       │      └───────────────────┘               │
│  │ Fallback chain   │                                           │
│  └────────┬─────────┘                                           │
└───────────┼─────────────────────────────────────────────────────┘
            │
  ┌─────────┴──────────────────────────────────┐
  │              External Services              │
  ├─────────────────┬──────────────────────────┤
  │  AI Providers   │  LaTeX Server            │
  │  ├─ Gemini API  │  ├─ localhost:3000 (dev) │
  │  ├─ Claude API  │  └─ api.agentex (prod)   │
  │  ├─ Groq API    │     ├─ pdflatex          │
  │  └─ OpenRouter  │     └─ Docker + nginx    │
  └─────────────────┴──────────────────────────┘
```

### Data Flow: Generate → PDF

```
User pastes JD ─► content-panel.js ─► GENERATE_RESUME message
                                          │
              background.js ──────────────┤
              │ 1. Load settings          │
              │ 2. Build focusAreas[]     │
              │ 3. Check summary opt-in   │
              │ 4. Forward to AI service  │
              ▼                           │
          ai-service.js                   │
          │ validate → inventory          │
          │ → expert prompt               │
          │ → call AI (+ fallback)        │
          │ → clean → validate            │
          ▼                               │
      tailoredLatex ◄─────────────────────┘
              │
              ├─► storage.local (persisted)
              ├─► content-panel (showOutput)
              │
      User clicks PDF tab
              │
              ▼
      COMPILE_PDF message ──► background.js
              │
              ├─ SHA-256 hash(latex)
              ├─ Cache hit? → return cached pdfBase64
              └─ Cache miss? → fetch server → cache → return
```

### Storage Map

| Key | Store | Purpose | Lifetime |
|-----|-------|---------|----------|
| `enabledTabs` | session | Panel tab IDs | SW restart |
| `selectedModel` | local | `provider:modelId` | Permanent |
| `resumeLatex` | local | Base resume .tex | Permanent |
| `tailoredLatex` | local | Last generated output | Permanent |
| `knowledgeBase` | local | Extra projects/skills | Permanent |
| `*ApiKey` | local | API keys (4 providers) | Permanent |
| `focus*`, `preserve*` | local | Checkboxes state | Permanent |
| `onePageResume` | local | 1-page guardrail toggle | Permanent |
| `customInstructions` | local | Free-text instructions | Permanent |
| `guardrailRules` | local | Hard rules (line-based) | Permanent |
| `downloadName` | local | Output filename | Permanent |
| `darkMode` | local | Theme toggle | Permanent |

---

## Current Strengths

1. **Multi-provider AI** — 18 models across 4 providers with auto-fallback
2. **Expert prompt engineering** — Recruiter + ATS perspective, STAR/XYZ format
3. **Shadow DOM isolation** — Floating panel never breaks host page
4. **Zero build tools** — Plain JS, instantly hackable
5. **PDF caching** — SHA-256 keyed, avoids redundant server calls
6. **Guardrails** — Fabrication detection, protected sections, length limits
7. **Panel persistence** — Survives page reloads via session storage
8. **Bidirectional sync** — Model changes reflect instantly across all surfaces

---

## Identified Weaknesses

### Critical

| Issue | Impact | Root Cause |
|-------|--------|------------|
| Single-prompt architecture | Quality ceiling | No section-level agents yet |
| No streaming | Perceived latency | All providers support streaming |
| No retry queue | Lost work on network error | Generation isn't resumable |
| Cold-start PDF server | 30s+ first compile on Render | Free-tier spin-down |

### Moderate

| Issue | Impact | Root Cause |
|-------|--------|------------|
| No diff view | Can't see what changed | Only char count comparison |
| No version history | Can't undo/compare runs | Only last output saved |
| Large prompt size | Token cost | Full resume + full JD sent |
| No ATS score | User can't verify quality | No keyword matching |

### Minor

| Issue | Impact | Root Cause |
|-------|--------|------------|
| No i18n | English-only | Hardcoded strings |
| No keyboard shortcuts | Accessibility | Only mouse interactions |
| No analytics dashboard | No usage insights | Basic tracking only |

---

## Recent Improvements (v5.1)

| Feature | Files Changed | Impact |
|---------|---------------|--------|
| PDF compile cache | background.js | Eliminates redundant server calls |
| Panel persistence | background.js, content-panel.js | Panel survives reloads |
| Model sync | content-panel.js | Real-time header updates |
| Summary opt-in | ai-service.js, background.js, sidepanel | No unwanted summaries |
| Format preservation | ai-service.js | AI only changes content, not structure |
| 1-page guardrail | sidepanel, ai-service.js | Force single-page output |
| Guardrail sync | sidepanel.js | guard-* ↔ preserve-* bidirectional |
| Resume persistence | content-panel.js | Output restored after reload |

---

## Short-Term Plan (v5.2–v5.5)

### v5.2 — Hierarchical Multi-Agent Orchestration

**Goal**: Replace single-prompt with phased agent pipeline for higher quality.

```
Phase 1: JD Analysis Agent
  → Structured JSON: role, skills, keywords, requirements

Phase 2: Section Agents (parallel)
  → Skills Agent (ATS keyword matching)
  → Experience Agent (STAR rewrite)
  → Summary Agent (opt-in only)
  → Projects Agent (KB swap)

Phase 3: Orchestrator
  → Assembly with format preservation
  → Final validation pass
```

**Impact**: Higher quality output, better keyword targeting, section-focused optimization.

### v5.3 — Streaming & Progress

- **Streaming responses** from all providers (Gemini SSE, Claude streaming)
- **Real-time LaTeX preview** as tokens arrive
- **Phase-level progress** (analyzing JD... optimizing skills... assembling...)

### v5.4 — Semantic Diff & Version History

- **Side-by-side diff** view with red/green highlighting
- **Version history** — store last 5 generations
- **Rollback** to any previous version
- **ATS keyword match score** — percentage of JD keywords present

### v5.5 — Offline & Reliability

- **Request queue** — retry failed generations automatically
- **Offline detection** — graceful degradation with cached models
- **Export/import** settings — backup configuration

---

## Medium-Term Plan (v6.0)

### v6.0 — Smart Resume Platform

#### ATS Score Engine
- Upload a JD → get a score (0-100) showing keyword match percentage
- Highlight missing keywords in the resume
- Suggest specific additions with source mapping

#### Template Library
- 10+ professional LaTeX templates
- One-click template switch (content preserved)
- Template marketplace (community-contributed)

#### Batch Mode
- Paste multiple JDs → generate tailored versions for each
- Comparison matrix — which resume matches which job best
- Export all as ZIP

#### Cloud Sync (Optional)
- Encrypted cloud backup of resume, KB, and settings
- Cross-device sync
- Share configurations

---

## Long-Term Vision (v7.0+)

### Intelligent Career Assistant

1. **Job Scraping** — Auto-detect JD on popular sites (LinkedIn, Greenhouse, Lever)
2. **Application Tracker** — Track which resume version was sent where
3. **Interview Prep** — Generate behavioral interview questions from JD
4. **Cover Letter Agent** — Generate matching cover letters
5. **Resume Analytics** — Track optimization impact over time
6. **Multi-language** — Support resumes in multiple languages
7. **Collaborative Editing** — Share & get feedback on resumes

### Monetization Path

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 5 generations/month, Gemini Flash |
| Pro | $9/mo | Unlimited, all models, batch mode |
| Team | $19/mo | Shared KB, templates, analytics |

---

## Technical Debt

### High Priority

1. **ARCHITECTURE.md** is severely outdated — references DOCX, Mammoth.js (removed in v2.1)
2. **No TypeScript** — type safety would prevent many bugs
3. **No automated tests** — TESTING.md is manual only
4. **Config duplication** — model list exists in config.js, content-panel.js, and sidepanel.js

### Medium Priority

5. **Magic strings** — message types like `'GENERATE_RESUME'` should be constants
6. **No error boundary** — one bad API response can crash the whole flow
7. **Vendor folder** — old lib/ references in ARCHITECTURE.md (cleaned up but docs lag)

### Low Priority

8. **CSS duplication** — sidepanel.css and style.css have overlapping rules
9. **No minification** — could reduce extension size
10. **No CSP nonces** — using 'self' only (acceptable for now)

---

## Performance Budget

| Metric | Current | Target (v6.0) |
|--------|---------|----------------|
| AI generation | 10-30s | 5-15s (streaming) |
| PDF compile (cold) | 30s+ | 5s (warm server) |
| PDF compile (cached) | 0ms | 0ms ✓ |
| Panel init | ~200ms | <100ms |
| Model switch | ~50ms | ~50ms ✓ |
| Extension size | ~500KB | <400KB |

---

*This document is the source of truth for architectural decisions and future plans. Update it as priorities evolve.*

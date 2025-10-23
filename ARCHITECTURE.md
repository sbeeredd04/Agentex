# Agentex Architecture Documentation

## Overview

Agentex is a Chrome extension that leverages Google's Gemini AI to intelligently tailor resumes to specific job descriptions. This document provides a comprehensive overview of the system architecture, components, and data flow.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   UI Layer │──│ Service Layer │──│  Storage Layer   │   │
│  │ (sidepanel)│  │  (services/)  │  │ (chrome.storage) │   │
│  └────────────┘  └──────────────┘  └──────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
┌───────────────┐            ┌────────────────┐
│  Gemini API   │            │  LaTeX Server  │
│ (Google AI)   │            │  (Render.com)  │
└───────────────┘            └────────────────┘
```

## Core Components

### 1. UI Layer (`sidepanel.html` + `sidepanel.js`)

**Purpose**: Provides the user interface for resume upload, configuration, and preview.

**Key Features**:
- File upload (LaTeX and DOCX)
- Job description and knowledge base input
- Real-time preview (raw and compiled)
- Settings management
- Progress indicators

**Files**:
- `sidepanel.html` - Main UI structure
- `sidepanel.js` - UI logic and event handling
- `sidepanel.css` / `style.css` - Styling

### 2. Service Layer

#### 2.1 AI Service (`services/ai-service.js`)

**Purpose**: Core AI integration with Gemini API.

**Responsibilities**:
- Communicate with Gemini API
- Manage AI prompts and responses
- Handle both single-pass and multi-agent processing
- Clean and validate AI responses

**Key Methods**:
```javascript
- generateContent(prompt, contentType)
- generateTailoredResume(latex, jobDesc, knowledgeBase)
- generateTailoredResumeMultiAgent(latex, jobDesc, knowledgeBase)
- _callGeminiAPI(prompt)
- _cleanLatexResponse(text)
- _cleanDocxResponse(text)
```

**Processing Modes**:

1. **Single-Pass Mode** (Default):
   - Sends everything to Gemini in one request
   - Faster processing
   - Good for most use cases

2. **Multi-Agent Mode** (Advanced):
   - Job Analysis Agent
   - Projects Optimization Agent
   - Skills Enhancement Agent
   - Experience Refinement Agent
   - Final Polish Agent

#### 2.2 DOCX AI Service (`services/docx-ai-service.js`)

**Purpose**: Specialized AI service for DOCX files.

**Extends**: `AIService`

**Responsibilities**:
- DOCX-specific prompt handling
- Plain text response formatting
- Remove LaTeX/markdown from responses

**Key Methods**:
```javascript
- generateContent(originalText, jobDesc, knowledgeBase)
- cleanResponse(text)
```

#### 2.3 DOCX Service (`services/docx-service.js`)

**Purpose**: Handle DOCX file parsing and generation.

**Dependencies**:
- Mammoth.js (DOCX to HTML)
- PizZip (ZIP handling)
- Docxtemplater (DOCX generation)

**Responsibilities**:
- Extract text from DOCX files
- Convert DOCX to HTML preview
- Create modified DOCX files
- Maintain document formatting

**Key Methods**:
```javascript
- extractText(arrayBuffer)
- parseDocx(arrayBuffer)
- tailorDocx(docxBuffer, jobDesc, knowledgeBase)
```

#### 2.4 File Handler (`services/file-handler.js`)

**Purpose**: Route file uploads to appropriate handlers.

**Responsibilities**:
- Detect file type (.tex or .docx)
- Route to appropriate service
- Validate file structure
- Return standardized result format

**Key Methods**:
```javascript
- handleFile(file)
- handleLatex(file)
- handleDocx(file)
```

### 3. Configuration Layer

#### 3.1 Config Module (`config.js`)

**Purpose**: Centralized configuration management.

**Contains**:
- Gemini API endpoint
- Default API key
- Model configuration
- Application metadata

#### 3.2 Prompts Module (`prompts/gemini-prompts.js`)

**Purpose**: Centralized prompt management.

**Contains**:
- LaTeX tailoring prompt
- DOCX tailoring prompt
- Job analysis prompt
- Projects optimization prompt
- Skills enhancement prompt
- Experience refinement prompt
- Final polish prompt

### 4. Background Service Worker (`background.js`)

**Purpose**: Chrome extension background tasks.

**Responsibilities**:
- Initialize side panel
- Handle context menu
- Manage extension lifecycle

### 5. Server Manager (`server/serverManager.js`)

**Purpose**: Manage communication with LaTeX compilation server.

**Responsibilities**:
- Send LaTeX to server
- Receive compiled PDF
- Handle server errors
- Retry logic

### 6. Storage Layer

**Technology**: Chrome Storage API

**Stored Data**:
- User settings (API keys, custom prompts)
- Session state (uploaded files, job description)
- Generated content (tailored resumes)
- User preferences

## Data Flow

### Resume Tailoring Flow

```
1. User Actions
   ├─ Upload Resume File (.tex or .docx)
   ├─ Enter Job Description
   └─ (Optional) Add Knowledge Base

2. File Processing
   ├─ FileHandler detects type
   ├─ LaTeX: Read as text
   └─ DOCX: Parse with Mammoth.js

3. AI Processing
   ├─ Construct prompt with inputs
   ├─ Send to Gemini API
   ├─ Receive AI response
   └─ Clean and validate response

4. Output Generation
   ├─ LaTeX: Update LaTeX code
   ├─ DOCX: Replace text content
   └─ Store in Chrome storage

5. Preview & Download
   ├─ Show in preview pane
   ├─ LaTeX: Compile to PDF (optional)
   └─ Allow download
```

### LaTeX Compilation Flow

```
1. User clicks "Compiled" view
2. Send LaTeX to server
3. Server compiles with pdflatex
4. Receive PDF blob
5. Display in iframe
6. Enable download/print
```

## API Integration

### Gemini API

**Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`

**Authentication**: API Key (query parameter)

**Request Format**:
```json
{
  "contents": [{
    "parts": [{ "text": "prompt..." }]
  }]
}
```

**Response Format**:
```json
{
  "candidates": [{
    "content": {
      "parts": [{
        "text": "generated content..."
      }]
    }
  }]
}
```

### LaTeX Compilation Server

**Endpoint**: `https://agentex.onrender.com/compile`

**Request Format**:
```json
{
  "latex": "LaTeX code..."
}
```

**Response**: PDF blob

## State Management

### Application State

**Stored in**: `chrome.storage.local`

**Key State Objects**:

```javascript
sidebarState = {
  activeTab: 'resume',
  previewMode: 'text',
  contentType: 'original',
  selectedModel: { type: 'gemini', ... },
  lastJobDescription: '',
  lastKnowledgeBaseText: '',
  uploadedFileName: '',
  fileType: 'latex' | 'docx',
  originalContent: '',
  tailoredContent: '',
  ...
}
```

### Session Persistence

**What Persists**:
- Job description text
- Knowledge base text
- Uploaded file metadata
- Generated content
- User settings

**What Doesn't Persist**:
- Actual file content (too large)
- Preview state
- Loading states

## Security Considerations

### API Key Security

1. **Storage**: API keys stored in Chrome storage (encrypted at rest)
2. **Transmission**: Keys sent via HTTPS only
3. **Access**: Keys only accessible by extension
4. **No Logging**: Keys never logged to console

### Data Privacy

1. **Local Processing**: File parsing done locally
2. **Transmission**: Only text sent to Gemini (not full files)
3. **No Storage**: Gemini doesn't store prompts/responses
4. **User Control**: Users can delete all data

## Error Handling

### Error Types and Handling

1. **File Upload Errors**
   - Invalid file format → Clear error message
   - Corrupted file → Graceful failure with retry

2. **API Errors**
   - Invalid API key → Prompt to update in settings
   - Rate limiting → Show retry with delay
   - Network errors → Offline detection and guidance

3. **Compilation Errors**
   - Invalid LaTeX → Show error details
   - Server unavailable → Fallback to raw view

4. **State Errors**
   - Corrupted state → Reset to defaults
   - Storage full → Clear old data

## Performance Optimization

### Optimization Strategies

1. **Lazy Loading**: Services loaded only when needed
2. **Debouncing**: Input changes debounced (500ms)
3. **Caching**: Compiled PDFs cached in memory
4. **Request Limiting**: Only one AI request at a time
5. **State Persistence**: Avoid re-parsing files

### Performance Metrics

- **File Upload**: < 1 second
- **AI Generation**: 10-30 seconds (Gemini API)
- **PDF Compilation**: 5-10 seconds (server)
- **UI Response**: < 100ms

## Extension Manifest

**Version**: Manifest V3

**Key Permissions**:
- `activeTab`: Access current tab
- `sidePanel`: Display side panel
- `storage`: Store settings and state
- `contextMenus`: Right-click menu
- `unlimitedStorage`: Large file handling

**Content Security Policy**:
- `script-src 'self' 'wasm-unsafe-eval'`
- `object-src 'self'`

## Future Architecture Considerations

### Planned Enhancements

1. **Offline Mode**: Cache prompts and queue requests
2. **Batch Processing**: Tailor for multiple jobs at once
3. **Templates**: Pre-defined resume templates
4. **Analytics**: Track optimization improvements
5. **Cloud Sync**: Optional cloud backup

### Scalability

- **Current**: Handles resumes up to 10 pages
- **Future**: Support for larger documents
- **Future**: Multiple file versions

## Development Setup

### Prerequisites

- Chrome browser (v90+)
- Node.js (for server development)
- Text editor with JavaScript support

### Local Development

```bash
# Clone repository
git clone https://github.com/sbeeredd04/Agentex.git

# Load extension
# 1. Open chrome://extensions/
# 2. Enable Developer mode
# 3. Load unpacked: tailored-resume-extension/

# Run LaTeX server (optional)
cd tailored-resume-extension/server
npm install
npm start
```

### Testing

See [TESTING.md](TESTING.md) for comprehensive testing procedures.

## Contributing

### Code Style

- ES6+ JavaScript
- JSDoc comments for all functions
- Consistent naming (camelCase)
- Error handling for all async operations

### Pull Request Process

1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit PR with description

## Troubleshooting

### Common Issues

**Extension won't load**: Check Chrome version and manifest.json syntax

**API errors**: Verify API key and quota

**PDF won't compile**: Check LaTeX syntax and server status

**Performance issues**: Clear Chrome storage and reload

## Appendix

### Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **AI**: Google Gemini 2.0 Flash
- **File Processing**: Mammoth.js, PizZip, Docxtemplater
- **LaTeX**: pdflatex (server-side)
- **Storage**: Chrome Storage API
- **Server**: Node.js, Express (LaTeX compilation)

### File Structure

```
Agentex/
├── tailored-resume-extension/
│   ├── manifest.json
│   ├── background.js
│   ├── config.js
│   ├── sidepanel.html
│   ├── sidepanel.js
│   ├── sidepanel.css
│   ├── style.css
│   ├── services/
│   │   ├── ai-service.js
│   │   ├── docx-ai-service.js
│   │   ├── docx-service.js
│   │   └── file-handler.js
│   ├── prompts/
│   │   └── gemini-prompts.js
│   ├── server/
│   │   ├── server.js
│   │   └── serverManager.js
│   ├── lib/
│   │   └── vendor/
│   └── icons/
├── README.md
├── TESTING.md
├── ARCHITECTURE.md (this file)
└── prompt-resume.md
```

### Version History

- **v2.0**: Gemini-only implementation
- **v1.x**: Multi-provider support (deprecated)

---

*Last Updated: 2025*
*Document Version: 2.0*

# API Documentation

This document provides comprehensive API documentation for the Agentex Resume Editor system.

## 📡 Server API Endpoints

### Base URL
```
http://localhost:3000
```

### Authentication
No authentication required for local server endpoints.

---

## 📄 Document Compilation Endpoints

### Compile LaTeX to PDF

Compiles LaTeX source code to PDF format.

**Endpoint**: `POST /compile`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "latex": "\\documentclass{article}\\begin{document}Your content here\\end{document}"
}
```

**Response**:
- **Success**: PDF binary data (Content-Type: application/pdf)
- **Error**: 
  ```json
  {
    "success": false,
    "error": "Error message",
    "details": "Additional error details"
  }
  ```

**Example**:
```javascript
const response = await fetch('http://localhost:3000/compile', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    latex: '\\documentclass{article}\\begin{document}Hello World!\\end{document}'
  })
});

if (response.ok) {
  const pdfBlob = await response.blob();
  // Handle PDF blob
} else {
  const error = await response.json();
  console.error('Compilation failed:', error);
}
```

---

### Compile DOCX to PDF

Converts DOCX files to PDF format using LibreOffice.

**Endpoint**: `POST /compile-docx`

**Headers**:
```
Content-Type: multipart/form-data
```

**Request Body**:
- Form data with DOCX file

**Response**:
- **Success**: PDF binary data (Content-Type: application/pdf)
- **Error**: 
  ```json
  {
    "success": false,
    "error": "Error message",
    "details": "Additional error details"
  }
  ```

**Example**:
```javascript
const formData = new FormData();
formData.append('file', docxFile, 'resume.docx');

const response = await fetch('http://localhost:3000/compile-docx', {
  method: 'POST',
  body: formData
});

if (response.ok) {
  const pdfBlob = await response.blob();
  // Handle PDF blob
}
```

---

### Save DOCX Content

Saves generated DOCX content to the server.

**Endpoint**: `POST /save-docx`

**Headers**:
```
Content-Type: multipart/form-data
```

**Request Body**:
- Form data with file and metadata

**Response**:
```json
{
  "success": true,
  "message": "DOCX saved successfully"
}
```

---

## 🤖 AI Service Integration

### Gemini API Integration

**Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`

**Authentication**: API Key required

**Request Structure**:
```json
{
  "contents": [{
    "parts": [{
      "text": "Your prompt here"
    }]
  }],
  "generationConfig": {
    "temperature": 0.7,
    "topK": 40,
    "topP": 0.95,
    "maxOutputTokens": 8192
  }
}
```

---

### Groq API Integration

**Endpoint**: `https://api.groq.com/openai/v1/chat/completions`

**Authentication**: Bearer token required

**Supported Models**:
- `deepseek-r1-distill-qwen-32b`
- `deepseek-r1-distill-llama-70b`

**Request Structure**:
```json
{
  "model": "deepseek-r1-distill-qwen-32b",
  "messages": [{
    "role": "user",
    "content": "Your prompt here"
  }],
  "temperature": 0.7,
  "max_tokens": 8192
}
```

---

## 🔧 Chrome Extension APIs

### Storage API

Used for persisting extension state and user preferences.

**Save Data**:
```javascript
await chrome.storage.local.set({
  sidebarState: {
    fileType: 'latex',
    originalContent: '...',
    tailoredContent: '...'
  }
});
```

**Retrieve Data**:
```javascript
const { sidebarState } = await chrome.storage.local.get('sidebarState');
```

**Save API Keys**:
```javascript
await chrome.storage.local.set({
  geminiApiKey: 'your-api-key',
  groqApiKey: 'your-groq-key'
});
```

---

### Side Panel API

**Open Side Panel**:
```javascript
await chrome.sidePanel.open({ windowId: tab.windowId });
```

**Set Panel Behavior**:
```javascript
await chrome.sidePanel.setPanelBehavior({ 
  openPanelOnActionClick: true 
});
```

---

### Context Menu API

**Create Context Menu**:
```javascript
chrome.contextMenus.create({
  id: 'openResumeTailor',
  title: 'Open Resume Tailor',
  contexts: ['all']
});
```

---

## 📋 Data Structures

### SidebarState Object

```typescript
interface SidebarState {
  fileType: 'latex' | 'docx';
  contentType: 'original' | 'generated';
  originalContent: string;
  tailoredContent?: string;
  originalDocx?: DocxContent;
  tailoredDocx?: DocxContent;
  uploadedFileName?: string;
  lastGenerated?: number;
}
```

### DocxContent Object

```typescript
interface DocxContent {
  type: 'ArrayBuffer';
  data: string; // base64 encoded
  originalName: string;
  timestamp: number;
  size: number;
  mimeType: string;
}
```

### File Processing Result

```typescript
interface FileProcessingResult {
  success: boolean;
  type: 'latex' | 'docx';
  content: string;
  preview?: string; // HTML preview for DOCX
  docx?: DocxContent; // For DOCX files
  error?: string;
}
```

---

## 🛠️ Service Classes

### AIService

**Purpose**: Handles AI model integration and content generation.

**Key Methods**:

```javascript
class AIService {
  constructor()
  
  async loadApiKeys()
  
  async generateContent(prompt, contentType, modelType, model)
  
  async _generateWithGemini(prompt)
  
  async _generateWithGroq(prompt, model)
  
  setCurrentModel(type, model)
}
```

**Usage Example**:
```javascript
const aiService = new AIService();
await aiService.loadApiKeys();

const result = await aiService.generateContent(
  'Optimize this resume for software engineer position',
  'latex',
  'gemini'
);
```

---

### DocxService

**Purpose**: Handles DOCX file processing and manipulation.

**Key Methods**:

```javascript
class DocxService {
  constructor()
  
  async tailorDocx(originalDocx, jobDescription, knowledgeBase)
  
  async updateDocxContent(originalDocxData, newContent)
  
  async updateDocxFormatting(docxBuffer)
  
  _processDocxContent(content)
}
```

---

### FileHandler

**Purpose**: Processes uploaded files and extracts content.

**Key Methods**:

```javascript
class FileHandler {
  constructor()
  
  async handleFile(file)
  
  async handleLatex(file)
  
  async handleDocx(file)
  
  readFileAsText(file)
  
  readFileAsArrayBuffer(file)
}
```

---

### ServerManager

**Purpose**: Manages communication with the local server.

**Key Methods**:

```javascript
class ServerManager {
  constructor()
  
  async saveGeneratedResume(content, filename, metadata)
  
  async compileLatex(latexContent)
  
  async compileDocx(docxFile)
  
  async checkServerStatus()
}
```

---

## 🔐 Error Handling

### Common Error Responses

**Compilation Errors**:
```json
{
  "success": false,
  "error": "LaTeX compilation failed",
  "details": "! Undefined control sequence.\nl.10 \\unknowncommand"
}
```

**API Key Errors**:
```json
{
  "success": false,
  "error": "API key not configured",
  "details": "Please configure your Gemini API key in settings"
}
```

**File Processing Errors**:
```json
{
  "success": false,
  "error": "Invalid file format",
  "details": "Only .tex and .docx files are supported"
}
```

### Error Handling Best Practices

1. **Always check response status**:
   ```javascript
   if (!response.ok) {
     const error = await response.json();
     throw new Error(error.error || 'Request failed');
   }
   ```

2. **Implement proper try-catch blocks**:
   ```javascript
   try {
     const result = await processFile(file);
   } catch (error) {
     console.error('[API] Processing failed:', error);
     // Handle error appropriately
   }
   ```

3. **Provide user-friendly error messages**:
   ```javascript
   function handleError(error) {
     const userMessage = error.message || 'An unexpected error occurred';
     showToast(userMessage, 'error');
   }
   ```

---

## 📊 Rate Limits and Constraints

### Server Limits
- **File Size**: Maximum 10MB for uploads
- **Request Timeout**: 120 seconds for compilation
- **Concurrent Requests**: 1 per client (requests are queued)

### AI API Limits
- **Gemini**: Follow Google's API rate limits
- **Groq**: Follow Groq's API rate limits
- **Content Length**: Maximum 8192 tokens output

### Storage Limits
- **Chrome Storage**: 10MB total storage limit
- **Temporary Files**: Cleaned up after processing

---

## 🔄 Request/Response Examples

### Complete LaTeX Compilation Flow

```javascript
// 1. Upload and process LaTeX file
const fileHandler = new FileHandler();
const fileResult = await fileHandler.handleFile(latexFile);

// 2. Generate tailored content
const aiService = new AIService();
const tailoredContent = await aiService.generateContent(
  `Original resume: ${fileResult.content}\nJob description: ${jobDesc}`,
  'latex',
  'gemini'
);

// 3. Compile to PDF
const serverManager = new ServerManager();
const pdfBlob = await serverManager.compileLatex(tailoredContent);

// 4. Download PDF
const url = URL.createObjectURL(pdfBlob);
const a = document.createElement('a');
a.href = url;
a.download = 'tailored-resume.pdf';
a.click();
```

### Complete DOCX Processing Flow

```javascript
// 1. Process DOCX file
const fileResult = await fileHandler.handleFile(docxFile);

// 2. Generate tailored content
const docxAIService = new DocxAIService();
const tailoredText = await docxAIService.generateContent(
  fileResult.content,
  jobDescription,
  knowledgeBase
);

// 3. Update DOCX with new content
const docxService = new DocxService();
const updatedDocx = await docxService.tailorDocx(
  fileResult.docx,
  jobDescription,
  knowledgeBase
);

// 4. Convert to PDF
const pdfBlob = await serverManager.compileDocx(updatedDocx);
```

---

## 🧪 Testing the API

### Using curl

**Test LaTeX compilation**:
```bash
curl -X POST http://localhost:3000/compile \
  -H "Content-Type: application/json" \
  -d '{"latex": "\\documentclass{article}\\begin{document}Test\\end{document}"}' \
  --output test.pdf
```

**Test server status**:
```bash
curl -X GET http://localhost:3000/health
```

### Using JavaScript

**Test in browser console**:
```javascript
// Test compilation
fetch('http://localhost:3000/compile', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    latex: '\\documentclass{article}\\begin{document}Hello World!\\end{document}'
  })
}).then(response => response.blob())
  .then(blob => console.log('PDF size:', blob.size));
```

---

This API documentation provides comprehensive coverage of all system endpoints and integration points. For additional technical details, refer to the source code and inline documentation.
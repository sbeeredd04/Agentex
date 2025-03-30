// Debug: Initialize popup.js
console.log('Initializing popup.js');

// Global variables and state
let aiService;
let originalLatex = null;
let tailoredLatex = null;
let originalCoverLetter = null;
let tailoredCoverLetter = null;
let currentPdfUrl = null;
let currentJobTitle = null;
let currentFile = null;

let currentModelSelection = {
  type: 'gemini',
  model: null
};

let sidebarState = {
  activeTab: 'resume',
  previewMode: 'text',
  contentType: 'original',
  selectedModel: {
    type: 'gemini',
    model: null,
    lastUsed: null
  },
  lastJobDescription: '',
  lastKnowledgeBaseText: '',
  uploadedFileName: '',
  uploadedFileContent: '',
  isPreviewExpanded: false,
  generatedContent: null,
  fileType: null, // 'latex' or 'docx'
  originalContent: null,
  originalDocx: null,
  tailoredContent: null
};

// Add this near the top of the file with other constants
const DEFAULT_PROMPT = `You are an expert ATS resume tailor for software engineering roles. Your mission is to optimize the resume to pass automated screening and secure interviews by:

## Primary Objectives
1. **Precision Alignment**: Rigorously match JD requirements using keywords/metrics from both resume and knowledge base
2. **Strategic Replacement**: Replace ONLY the least relevant existing content with superior knowledge base items when they:
  - Match ≥2 additional JD keywords 
  - Demonstrate ≥25% stronger metrics
  - Share direct technology stack alignment
3. **Content Preservation**: Maintain original resume structure/length while maximizing JD keyword density

## Execution Protocol
### Content Evaluation
1. Analyze JD for:
  - Required technologies (explicit and implied)
  - Personality cues (e.g., "proactive" → "self-initiated")
  - Performance metrics priorities

2. For each resume section:
  - Calculate relevance score to JD (keywords + metrics)
  - Compare with knowledge base equivalents
  - Replace ONLY if knowledge base item has:
    * ≥1.5x higher relevance score
    * Matching verb tense/context
    * Comparable character length (±15%)

### Optimization Rules
- **Tech Stack Adaptation** (Allowed):
  Example:
  React ↔ Next.js 
  Python ↔ FastAPI
  AWS ↔ GCP (if cloud mentioned)

- **Forbidden Adaptations**:
  Example:
  Frontend → Backend stacks

### XYZ Format Implementation
\\resumeItem{\\textbf{<JD Keyword>} used to \\textbf{<Action Verb>} \\emph{<Tech>} achieving \\textbf{<Metric>} via <Method>}

### Formatting Constraints
1. Preserve original:
  - Section order
  - Date ranges
  - Bullet count
  - Margin/padding
2. Modify ONLY text within \\resumeItem{} blocks
3. Strict 1-page enforcement

VERY IMPORTANT: ALWAYS REPLACE if the knowledge base has project that uses the same tech stack as the JD or somehow relevant to the JD
VERY IMPORTANT: ALWAYS ADD any skills that are not already in the resume but are relevant to the JD to the skills section

## Critical Requirements
‼️ NEVER:
- Invent unverified experiences
- Change section hierarchy
- Exceed original item length by >20%
- Remove JD-matched content

!! ALWAYS GIVE THE ENTIRE UPDATED LATEX CODE!!
`;

// Function to display status messages
function showStatus(message, type = 'info') {
  console.log(`Status: ${message} (${type})`);
  showToast(message, type);
}

// Utility debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Create a debounced version of updatePreview
const debouncedUpdatePreview = debounce(updatePreview, 500);

// Add a request tracking system
const requestTracker = {
  currentRequest: null,
  isProcessing: false,
  lastRequestTime: 0,
  DEBOUNCE_TIME: 1000, // 1 second

  async process(requestFn) {
    const now = Date.now();
    if (this.isProcessing) {
      console.log('[RequestTracker] Request already in progress, skipping');
      return null;
    }
    
    if (now - this.lastRequestTime < this.DEBOUNCE_TIME) {
      console.log('[RequestTracker] Request too soon, skipping');
      return null;
    }

    try {
      this.isProcessing = true;
      this.lastRequestTime = now;
      return await requestFn();
    } finally {
      this.isProcessing = false;
    }
  }
};

// Set up UI elements (returns an object with key elements)
function setupUIElements() {
  const elements = {
    latexFileInput: document.getElementById('latexFile'),
    jobDescInput: document.getElementById('jobDesc'),
    tailorBtn: document.getElementById('tailorBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    knowledgeBaseText: document.getElementById('knowledgeBaseText'),
    previewArea: document.getElementById('previewArea'),
    pdfPreviewArea: document.getElementById('pdfPreviewArea')
  };

  // Debugging: Log each element to ensure it's not null
  for (const [key, element] of Object.entries(elements)) {
    if (!element) {
      console.error(`[SetupUIElements] Element not found: ${key}`);
    } else {
      console.log(`[SetupUIElements] Element found: ${key}`);
    }
  }

  return elements;
}

// Attach event listeners to UI elements
function setupEventListeners(elements) {
  // Tab switching
  if (elements.resumeTab) {
    elements.resumeTab.addEventListener('click', () => {
      sidebarState.activeTab = 'resume';
      saveState();
    });
  }

  // Save job description on input
  if (elements.jobDescInput) {
    elements.jobDescInput.addEventListener('input', debounce(() => {
      sidebarState.lastJobDescription = elements.jobDescInput.value;
      saveState();
    }, 500));
  }

  // Save knowledge base text on input
  if (elements.knowledgeBaseText) {
    elements.knowledgeBaseText.addEventListener('input', debounce(() => {
      sidebarState.lastKnowledgeBaseText = elements.knowledgeBaseText.value;
      saveState();
    }, 500));
  }

  // File upload listener
  if (elements.latexFileInput) {
    elements.latexFileInput.addEventListener('change', async (event) => {
      console.log('File input change detected');
      const file = event.target.files[0];
      await handleFileUpload(file);
    });
  }

  // Add this to setupEventListeners()
  document.querySelectorAll('input[name="previewType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      updatePreview(e.target.value);
    });
  });

  // Add this to setupEventListeners()
  document.querySelectorAll('input[name="resumeVersion"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      console.log('[RadioButton] Changed to:', e.target.value);
      console.log('[RadioButton] Previous state:', sidebarState.contentType);
      
      sidebarState.contentType = e.target.value;
      console.log('[RadioButton] Updated state:', sidebarState.contentType);
      console.log('[RadioButton] Available content:', {
        originalLatex: originalLatex?.length || 0,
        tailoredLatex: tailoredLatex?.length || 0
      });
      
      saveState();
      updatePreview(sidebarState.previewMode);
    });
  });
}

// Setup preview UI controls and event listeners
function setupPreviewUI() {
  const previewSection = document.querySelector('.preview-section');
  const fullscreenToggle = document.querySelector('.fullscreen-toggle');
  const toggleButtons = document.querySelectorAll('.preview-toggle-btn');
  const rawPreview = document.getElementById('rawPreview');
  const compiledPreview = document.getElementById('compiledPreview');

  if (fullscreenToggle) {
    fullscreenToggle.addEventListener('click', () => {
      previewSection.classList.toggle('fullscreen');
      
      const icon = fullscreenToggle.querySelector('.material-icons');
      const isFullscreen = previewSection.classList.contains('fullscreen');
      
      icon.textContent = isFullscreen ? 'fullscreen_exit' : 'fullscreen';
      
      // Update preview container height
      const previewContent = previewSection.querySelector('.preview-content');
      if (previewContent) {
        previewContent.style.height = isFullscreen ? 'calc(100vh - 120px)' : '500px';
      }

      // Refresh PDF view if active
      const compiledPreview = document.getElementById('compiledPreview');
      if (compiledPreview && compiledPreview.style.display !== 'none') {
        setTimeout(() => {
          const iframe = compiledPreview.querySelector('iframe');
          if (iframe) {
            iframe.src = iframe.src;
          }
        }, 300);
      }
    });
  }

  // Handle preview toggle
  toggleButtons.forEach(button => {
    button.addEventListener('click', async () => {
      if (requestTracker.isProcessing) {
        console.log('[Preview] Update in progress, ignoring click');
        return;
      }

      // Update button states
      toggleButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const view = button.dataset.view;
      
      if (view === 'raw') {
        rawPreview.style.display = 'block';
        compiledPreview.style.display = 'none';
      } else {
        rawPreview.style.display = 'none';
        compiledPreview.style.display = 'block';
        
        // Get the appropriate content
        const content = sidebarState.contentType === 'generated' 
          ? sidebarState.tailoredDocx 
          : sidebarState.originalDocx;

        if (content) {
          await generatePdfPreview(content, sidebarState.contentType);
        }
      }
    });
  });

  console.log('[Preview] UI setup complete');
}

// Update the updatePreview function
async function updatePreview() {
  console.log('[Preview] Starting preview update:', {
    contentType: sidebarState.contentType,
    fileType: sidebarState.fileType
  });

  if (window.isPreviewUpdating) {
    console.log('[Preview] Update already in progress, skipping');
    return;
  }
  window.isPreviewUpdating = true;

  try {
    // Get content based on type
    let contentToShow;
    if (sidebarState.fileType === 'latex') {
      contentToShow = sidebarState.contentType === 'generated' ? tailoredLatex : originalLatex;
    } else {
      // For DOCX, get the stored raw content
      const { generatedRawContent } = await chrome.storage.local.get('generatedRawContent');
      contentToShow = sidebarState.contentType === 'generated' ? 
        generatedRawContent : 
        sidebarState.originalContent;
    }

    console.log('[Preview] Content validation:', {
      hasContent: !!contentToShow,
      contentLength: contentToShow?.length,
      fileType: sidebarState.fileType,
      contentType: sidebarState.contentType
    });

    if (!contentToShow) {
      throw new Error('No content available for preview');
    }

    // Update raw preview
    const rawPreview = document.getElementById('rawPreview');
    const textContent = rawPreview.querySelector('.preview-text-content');
    if (textContent) {
      textContent.style.opacity = '0';
      setTimeout(() => {
        textContent.innerHTML = contentToShow;
        textContent.style.opacity = '1';
      }, 300);
    }

    // Handle PDF preview if needed
    const compiledPreview = document.getElementById('compiledPreview');
    if (compiledPreview && compiledPreview.style.display !== 'none') {
      if (sidebarState.fileType === 'latex') {
        await generateLatexPreview(contentToShow);
      }
    }

  } catch (error) {
    console.error('[Preview] Error:', error);
    showStatus(error.message, 'error');
  } finally {
    window.isPreviewUpdating = false;
  }
}

// Update generatePdfPreview with better content validation
async function generatePdfPreview(content, type = 'original') {
  return requestTracker.process(async () => {
    try {
      console.log('[PdfPreview] Starting PDF generation:', {
        contentType: typeof content,
        type: type,
        contentDetails: {
          type: content?.type,
          hasData: !!content?.data,
          dataType: typeof content?.data
        },
        sidebarState: {
          fileType: sidebarState.fileType,
          contentType: sidebarState.contentType,
          hasOriginalDocx: !!sidebarState.originalDocx,
          hasTailoredDocx: !!sidebarState.tailoredDocx
        }
      });

      const pdfPreviewArea = document.getElementById('pdfPreviewArea');
      if (!pdfPreviewArea) {
        throw new Error("PDF preview area not found");
      }

      // Show loading state
      pdfPreviewArea.innerHTML = `
        <div class="loading-preview">
          <div class="loading-spinner"></div>
          <span>Generating PDF preview...</span>
        </div>
      `;

      showStatus('Generating PDF preview...', 'info');

      // Get the appropriate DOCX content with enhanced debugging
      const docxContent = type === 'generated' ? 
        sidebarState.tailoredDocx : 
        sidebarState.originalDocx;

      console.log('[PdfPreview] Selected DOCX content:', {
        type: type,
        docxContent: {
          exists: !!docxContent,
          type: docxContent?.type,
          hasData: !!docxContent?.data,
          dataLength: docxContent?.data?.length,
          originalName: docxContent?.originalName
        }
      });

      if (!docxContent || !docxContent.data) {
        throw new Error('DOCX content not found');
      }

      // Convert to ArrayBuffer if needed
      let docxBuffer;
      if (docxContent.type === 'ArrayBuffer' && docxContent.data) {
        docxBuffer = new Uint8Array(
          atob(docxContent.data)
            .split('')
            .map(char => char.charCodeAt(0))
        ).buffer;
      } else {
        throw new Error('Invalid DOCX format');
      }

      // Create blob for upload
      const docxBlob = new Blob([docxBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      // Save DOCX to server
      const serverManager = window.ServerManager;
      const saveResult = await serverManager.saveGeneratedDocx(
        docxBlob,
        docxContent.originalName || 'resume.docx'
      );

      if (!saveResult.success) {
        throw new Error('Failed to save DOCX: ' + saveResult.error);
      }

      // Generate PDF
      const pdfResult = await serverManager.compileDocxToPdf({
        fileId: saveResult.fileId
      });

      if (!pdfResult.success) {
        throw new Error('Failed to generate PDF: ' + pdfResult.error);
      }

      // Create URL for the PDF
      const pdfUrl = URL.createObjectURL(pdfResult.content);

      // Create iframe for PDF preview
      const iframe = document.createElement('iframe');
      iframe.src = `${pdfUrl}#zoom=FitH`;
      iframe.style.width = '100%';
      iframe.style.height = '500px';
      iframe.style.border = 'none';

      // Clear previous content and add iframe
      pdfPreviewArea.innerHTML = '';
      pdfPreviewArea.appendChild(iframe);

      // Monitor iframe loading
      iframe.onload = () => {
        console.log('[PdfPreview] PDF iframe loaded successfully');
        showStatus('PDF preview loaded successfully!', 'success');
      };

      return true;

    } catch (error) {
      console.error('[PdfPreview] Error:', {
        error,
        message: error.message,
        stack: error.stack,
        state: {
          type: type,
          hasContent: !!content,
          sidebarState: {
            contentType: sidebarState.contentType,
            fileType: sidebarState.fileType
          }
        }
      });
      showStatus(`Preview generation failed: ${error.message}`, 'error');
      return false;
    }
  });
}

// Move retry function to window scope
window.retryPdfPreview = async () => {
  try {
    const content = sidebarState.contentType === 'generated' 
      ? sidebarState.tailoredDocx 
      : sidebarState.originalDocx;
    
    console.log('[PdfPreview] Retrying with content:', {
      hasContent: !!content,
      contentType: content?.type,
      hasData: !!content?.data
    });

    if (!content || !content.type || !content.data) {
      throw new Error('Invalid content for retry. Please upload your file again.');
    }
    
    await generatePdfPreview(content, sidebarState.contentType);
  } catch (error) {
    console.error('[PdfPreview] Retry failed:', error);
    showStatus(error.message, 'error');
  }
};

// Save and restore state using chrome.storage
function saveState() {
  chrome.storage.local.set({ sidebarState });
}

async function restoreState() {
  try {
    const { sidebarState: savedState, tailoredLatex: savedTailoredLatex } = 
      await chrome.storage.local.get(['sidebarState', 'tailoredLatex']);
    
    console.log('[State] Restoring state:', {
      hasState: !!savedState,
      hasTailoredLatex: !!savedTailoredLatex,
      contentType: savedState?.contentType
    });
    
    if (savedState) {
      // Merge saved state with default state
      sidebarState = {
        ...sidebarState,
        ...savedState
      };

      // Restore content variables
      if (savedState.originalContent) {
        originalLatex = savedState.originalContent;
      }
      if (savedTailoredLatex) {
        tailoredLatex = savedTailoredLatex;
      }

      // Update UI elements
      const elements = {
        jobDescInput: document.getElementById('jobDesc'),
        knowledgeBaseText: document.getElementById('knowledgeBaseText'),
        fileNameDisplay: document.getElementById('fileNameDisplay')
      };

      // Restore input values
      if (elements.jobDescInput && sidebarState.lastJobDescription) {
        elements.jobDescInput.value = sidebarState.lastJobDescription;
      }
      if (elements.knowledgeBaseText && sidebarState.lastKnowledgeBaseText) {
        elements.knowledgeBaseText.value = sidebarState.lastKnowledgeBaseText;
      }

      // Update file display
      if (elements.fileNameDisplay && sidebarState.uploadedFileName) {
        showSuccessfulUploadFeedback(sidebarState.uploadedFileName);
      }

      // Update preview content
      await updatePreviewContent();
    }
  } catch (error) {
    console.error('[State] Error restoring state:', error);
    showToast('Error restoring previous session', 'error');
  }
}

// Add new function to handle preview content updates
async function updatePreviewContent() {
  const rawPreview = document.querySelector('.preview-text-content');
  if (!rawPreview) return;

  try {
    const contentToShow = sidebarState.contentType === 'generated' ? 
      tailoredLatex : sidebarState.originalContent;

    console.log('[Preview] Updating content:', {
      type: sidebarState.contentType,
      hasContent: !!contentToShow,
      fileType: sidebarState.fileType
    });

    if (contentToShow) {
      rawPreview.style.opacity = '0';
      setTimeout(() => {
        rawPreview.innerHTML = contentToShow;
        rawPreview.style.opacity = '1';
      }, 300);

      // Update compiled view if active
      const compiledPreview = document.getElementById('compiledPreview');
      if (compiledPreview && compiledPreview.style.display !== 'none') {
        await generatePdfPreview(contentToShow, sidebarState.contentType);
      }
    }
  } catch (error) {
    console.error('[Preview] Error updating content:', error);
    showToast('Error updating preview', 'error');
  }
}

// Update the file upload handler
async function handleFileUpload(file) {
  try {
    console.log('[FileUpload] Starting file upload process', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      extension: file.name.split('.').pop().toLowerCase()
    });

    showUploadingFeedback(file.name);
    showStatus('Reading file...', 'info');

    const fileHandler = new FileHandler();
    const result = await fileHandler.handleFile(file);

    console.log('[FileUpload] File processing result:', {
      type: result.type,
      hasContent: !!result.content,
      hasPreview: !!result.preview,
      hasDocx: !!result.docx,
      success: result.success
    });

    if (!result.success && result.error) {
      throw new Error(result.error);
    }

    // Update state based on file type
    if (result.type === 'latex') {
      originalLatex = result.content;
      tailoredLatex = null;
    }

    // Update sidebar state
    sidebarState = {
      ...sidebarState,
      fileType: result.type,
      contentType: 'original',
      originalContent: result.content,
      originalHtml: result.preview,
      originalDocx: result.docx,
      uploadedFileName: file.name
    };

    // Save state
    await chrome.storage.local.set({ sidebarState });

    // Update UI
    showSuccessfulUploadFeedback(file.name);
    showStatus('File uploaded successfully!', 'success');

    // Update preview immediately
    await updatePreview();

    return result;

  } catch (error) {
    console.error('[FileUpload] Error:', error);
    showFailedUploadFeedback();
    showStatus(`Upload failed: ${error.message}`, 'error');
    throw error;
  }
}

// UI feedback functions
function showUploadingFeedback(fileName) {
  const display = document.getElementById('fileNameDisplay');
if (display) {
  display.innerHTML = `
    <div class="file-upload-feedback uploading">
      <div class="loading-spinner"></div>
      <span class="material-icons">sync</span>
      <span>${fileName}</span>
    </div>
  `;
}
}

function showSuccessfulUploadFeedback(fileName) {
  const display = document.getElementById('fileNameDisplay');
if (display) {
  display.innerHTML = `
    <div class="file-upload-feedback success">
      <span class="material-icons">check_circle</span>
      <span>${fileName}</span>
    </div>
  `;
}
}

function showFailedUploadFeedback() {
  const display = document.getElementById('fileNameDisplay');
if (display) {
  display.innerHTML = `
    <div class="file-upload-feedback error">
      <span class="material-icons">error</span>
      <span>Upload failed</span>
    </div>
  `;
}
}

// Update the waitForServerManager function
function waitForServerManager() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 50;
    const interval = 100; // 100ms between attempts
    
    const check = () => {
      attempts++;
      console.log('[Sidepanel] Checking for ServerManager, attempt:', attempts);
      
      if (window.ServerManager) {
        console.log('[Sidepanel] ServerManager found');
        resolve(window.ServerManager);
      } else if (attempts > maxAttempts) {
        console.error('[Sidepanel] ServerManager not found after', maxAttempts, 'attempts');
        reject(new Error(`ServerManager not found after ${maxAttempts} attempts`));
      } else {
        setTimeout(check, interval);
      }
    };
    
    check();
  });
}

// Update the preview toggle handling
function setupPreviewToggle() {
  const toggleButtons = document.querySelectorAll('.preview-toggle-btn');
  const rawPreview = document.getElementById('rawPreview');
  const compiledPreview = document.getElementById('compiledPreview');

  toggleButtons.forEach(button => {
    button.addEventListener('click', async () => {
      if (requestTracker.isProcessing) {
        console.log('[Preview] Update in progress, ignoring click');
        return;
      }

      console.log('[Preview] Switching view to:', button.dataset.view);

      // Update button states
      toggleButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const view = button.dataset.view;
      
      if (view === 'raw') {
        rawPreview.style.display = 'block';
        compiledPreview.style.display = 'none';
      } else {
        rawPreview.style.display = 'none';
        compiledPreview.style.display = 'block';
        
        // Get the appropriate content for PDF preview
        let content;
        if (sidebarState.fileType === 'latex') {
          content = sidebarState.contentType === 'generated' ? tailoredLatex : originalLatex;
          
          console.log('[Preview] Preparing LaTeX content for PDF:', {
            hasContent: !!content,
            contentType: sidebarState.contentType,
            contentLength: content?.length
          });

          if (content) {
            await generateLatexPreview(content);
          } else {
            console.error('[Preview] No content available for PDF preview');
            showStatus('No content available for preview', 'error');
          }
        }
      }
    });
  });
}

// Update the initialization function
async function initializeSidepanel() {
  console.log('[Sidepanel] Initializing...');
  try {
    injectPreviewStyles();
    // Wait for ServerManager to be available
    const serverManager = await waitForServerManager();
    console.log('[Sidepanel] ServerManager loaded:', serverManager);
    
    // Check for AIService
    if (!window.AIService) {
      throw new Error('AIService not found');
    }
    
    console.log('[Sidepanel] Initializing services...');
    aiService = new window.AIService();
    
    // Set up UI and event listeners
    const elements = setupUIElements();
    setupEventListeners(elements);
    setupPreviewUI();
    setupModelSelector();
    setupApiKeyManagement();
    setupPreviewToggle();
    
    await restoreState();
    
    setupGenerateButton();
    
    console.log('[Sidepanel] UI initialized successfully');
  } catch (error) {
    console.error('[Sidepanel] Initialization failed:', error);
    showToast('Failed to initialize sidepanel: ' + error.message, 'error');
  }
}

// Make sure DOM is loaded before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSidepanel);
} else {
  initializeSidepanel();
}

// Add this function to setup model selection
function setupModelSelector() {
  const modelSelect = document.getElementById('modelSelect');
  if (!modelSelect) {
    console.error('[ModelSelector] Model select element not found');
    return;
  }

  modelSelect.addEventListener('change', (e) => {
    const [type, model] = e.target.value.split(':');
    console.log('[ModelSelector] Model changed:', {
      value: e.target.value,
      type,
      model
    });

    // Update current selection
    currentModelSelection = {
      type,
      model,
      description: type === 'groq' 
        ? aiService.models.groq.models[model]?.description 
        : 'Gemini 2.0 Flash'
    };

    // Save to state (now saving the full object)
    sidebarState.selectedModel = currentModelSelection;
    saveState();

    // Show model info in status
    showStatus(`Selected model: ${currentModelSelection.description}`, 'info');
  });

  // Restore saved model selection (handling both string and object formats)
  if (sidebarState.selectedModel) {
    console.log('[ModelSelector] Restoring saved model:', sidebarState.selectedModel);
    
    // Handle legacy string format or new object format
    if (typeof sidebarState.selectedModel === 'string') {
      const [type, model] = sidebarState.selectedModel.split(':');
      currentModelSelection = {
        type,
        model,
        description: type === 'groq' 
          ? aiService.models.groq.models[model]?.description 
          : 'Gemini 2.0 Flash'
      };
      modelSelect.value = sidebarState.selectedModel;
    } else {
      // Handle object format
      currentModelSelection = sidebarState.selectedModel;
      const selectValue = currentModelSelection.model 
        ? `${currentModelSelection.type}:${currentModelSelection.model}`
        : currentModelSelection.type;
      modelSelect.value = selectValue;
    }
  } else {
    // Set default selection
    currentModelSelection = {
      type: 'gemini',
      model: null,
      description: 'Gemini 2.0 Flash'
    };
    modelSelect.value = 'gemini';
  }

  // Log available models on initialization
  console.log('[ModelSelector] Available models:', {
    gemini: aiService.models.gemini,
    groqModels: aiService.models.groq.models,
    currentSelection: currentModelSelection
  });
}

// Update the tailor function to handle both types
async function generateTailoredContent() {
  try {
    const jobDesc = document.getElementById('jobDesc').value.trim();
    const knowledgeBase = document.getElementById('knowledgeBaseText').value.trim();
    
    console.log('[Tailor] Starting generation:', {
      fileType: sidebarState.fileType,
      model: currentModelSelection,
      hasJobDesc: Boolean(jobDesc),
      hasKnowledgeBase: Boolean(knowledgeBase)
    });

    if (!jobDesc) {
      throw new Error("Please enter the job description");
    }

    // Determine pipeline based on file type
    let result;
    if (sidebarState.fileType === 'docx') {
      console.log('[Tailor] Using DOCX Pipeline');
      if (!sidebarState.originalDocx) {
        throw new Error("Please upload a DOCX file first");
      }
      result = await generateTailoredDocx();
    } else if (sidebarState.fileType === 'latex') {
      console.log('[Tailor] Using LaTeX Pipeline');
      if (!originalLatex) {
        throw new Error("Please upload a LaTeX file first");
      }
      result = await generateTailoredLatex();
    } else {
      throw new Error("Unsupported file type");
    }

    if (result.success) {
      // Update state based on file type
      if (sidebarState.fileType === 'docx') {
        sidebarState.tailoredDocx = result.docx;
        sidebarState.tailoredHtml = result.html;
        sidebarState.tailoredContent = result.text;
      } else {
        tailoredLatex = result.content;
        sidebarState.tailoredContent = result.content;
      }
      
      sidebarState.contentType = 'generated';
      await chrome.storage.local.set({ sidebarState });
      
      showStatus(`${sidebarState.fileType.toUpperCase()} tailoring completed!`, 'success');
      await updatePreview();
    } else {
      throw new Error(result.error || 'Generation failed');
    }

    return result;

  } catch (error) {
    console.error('[Tailor] Generation failed:', {
      error,
      fileType: sidebarState.fileType
    });
    showStatus(`Generation failed: ${error.message}`, 'error');
    throw error;
  }
}

// Update generateTailoredLatex with better debugging
async function generateTailoredLatex() {
  try {
    console.log('[LaTeX] Starting LaTeX tailoring process', {
      hasOriginalLatex: !!originalLatex,
      contentLength: originalLatex?.length,
      pipeline: 'LaTeX'
    });

    const jobDesc = document.getElementById('jobDesc').value.trim();
    const knowledgeBase = document.getElementById('knowledgeBaseText').value.trim();

    console.log('[LaTeX] Input validation', {
      hasJobDesc: !!jobDesc,
      hasKnowledgeBase: !!knowledgeBase
    });

    if (!originalLatex) {
      throw new Error('No LaTeX content found');
    }

    // Get the custom prompt from storage
    const { customPrompt } = await chrome.storage.local.get('customPrompt');
    const prompt = customPrompt || DEFAULT_PROMPT;

    // Prepare the prompt with content
    const fullPrompt = `
${prompt}

Original LaTeX Resume:
${originalLatex}

Job Description:
${jobDesc}

Knowledge Base / Additional Experience:
${knowledgeBase}

Please provide the complete tailored LaTeX resume.`;

    console.log('[LaTeX] Sending to AI service', {
      promptLength: fullPrompt.length,
      modelType: currentModelSelection.type,
      model: currentModelSelection.model
    });

    // Update the AI service call with explicit type
    const tailoredContent = await aiService.generateContent(
      fullPrompt,
      'latex',
      currentModelSelection.type,
      currentModelSelection.model
    );

    console.log('[LaTeX] Generation completed:', {
      success: true,
      contentLength: tailoredContent?.length
    });

    return {
      success: true,
      content: tailoredContent,
      type: 'latex'
    };

  } catch (error) {
    console.error('[LaTeX] Generation error:', error);
    return {
      success: false,
      error: error.message,
      type: 'latex'
    };
  }
}

// Update generateTailoredDocx function to properly handle content
async function generateTailoredDocx() {
  try {
    console.log('[DOCX] Starting DOCX tailoring process', {
      hasOriginalDocx: !!sidebarState.originalDocx,
      originalDocxDetails: {
        type: sidebarState.originalDocx?.type,
        hasData: !!sidebarState.originalDocx?.data,
        originalName: sidebarState.originalDocx?.originalName
      }
    });

    const jobDesc = document.getElementById('jobDesc').value.trim();
    const knowledgeBase = document.getElementById('knowledgeBaseText').value.trim();

    // Validate inputs
    if (!jobDesc) {
      throw new Error('Please enter a job description');
    }

    // Get original DOCX from storage
    const originalDocx = sidebarState.originalDocx;
    if (!originalDocx || !originalDocx.data) {
      throw new Error('Original DOCX content not found');
    }

    // Convert stored base64 back to ArrayBuffer
    let docxBuffer;
    try {
      if (originalDocx.type === 'ArrayBuffer' && originalDocx.data) {
        const binaryString = window.atob(originalDocx.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        docxBuffer = bytes.buffer;
      } else {
        throw new Error('Invalid DOCX format in storage');
      }
    } catch (error) {
      console.error('[DOCX] Buffer conversion error:', error);
      throw new Error('Failed to process DOCX file: ' + error.message);
    }

    showStatus('Processing DOCX file...', 'info');
    const docxService = new DocxService();
    
    console.log('[DOCX] Calling DocxService.tailorDocx with model:', currentModelSelection);
    const result = await docxService.tailorDocx(
      docxBuffer,
      jobDesc,
      knowledgeBase
    );

    if (!result.success) {
      throw new Error(result.error || 'DOCX generation failed');
    }

    // Store the generated content immediately
    console.log('[DOCX] Storing generation result:', {
      hasRawContent: !!result.text,
      hasDocx: !!result.docx,
      hasHtml: !!result.html
    });

    // Save both raw content and DOCX data to Chrome storage
    await chrome.storage.local.set({
      generatedRawContent: result.text,
      generatedDocx: {
        type: 'ArrayBuffer',
        data: result.docx,
        originalName: sidebarState.uploadedFileName
      }
    });

    return {
      success: true,
      docx: {
        type: 'ArrayBuffer',
        data: result.docx,
        originalName: sidebarState.uploadedFileName
      },
      text: result.text,
      html: result.html,
      type: 'docx'
    };

  } catch (error) {
    console.error('[DOCX] Generation error:', error);
    return {
      success: false,
      error: error.message,
      type: 'docx'
    };
  }
}

// Update the showToast function to handle more types
function showToast(message, type = 'info', duration = 5000) {
  const toastContainer = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const toastId = `toast-${Date.now()}`;
  
  // Map info type to success for visual purposes
  const visualType = type === 'info' ? 'success' : type;
  
  toast.id = toastId;
  toast.className = `toast ${visualType}`;
  toast.innerHTML = `
    <div class="toast-content">
      <span class="material-icons toast-icon">
        ${visualType === 'success' ? 'check_circle' : visualType === 'error' ? 'error' : 'info'}
      </span>
      <span class="toast-message">${message}</span>
    </div>
    <button class="toast-close">
      <span class="material-icons">close</span>
    </button>
  `;

  toastContainer.appendChild(toast);

  // Add click handler for close button
  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  });

  // Auto remove after duration (if specified)
  if (duration > 0) {
    setTimeout(() => {
      if (document.getElementById(toastId)) {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => {
          toast.remove();
        }, 300);
      }
    }, duration);
  }
}

// Update the setupApiKeyManagement function
function setupApiKeyManagement() {
  const modal = document.getElementById('settingsModal');
  const openBtn = document.getElementById('openSettings');
  const closeBtn = document.querySelector('.close-modal');
  const saveBtn = document.getElementById('saveApiKeys');
  const geminiInput = document.getElementById('geminiApiKey');
  const groqInput = document.getElementById('groqApiKey');
  const promptInput = document.getElementById('customPrompt');

  // Load saved settings
  chrome.storage.local.get(['geminiApiKey', 'groqApiKey', 'customPrompt'], (result) => {
    if (result.geminiApiKey) {
      geminiInput.value = result.geminiApiKey;
    }
    if (result.groqApiKey) {
      groqInput.value = result.groqApiKey;
    }
    if (result.customPrompt) {
      promptInput.value = result.customPrompt;
    } else {
      promptInput.value = DEFAULT_PROMPT;
    }
  });

  // Reset prompt with animation
  document.getElementById('resetPrompt').addEventListener('click', () => {
    promptInput.style.opacity = '0';
    setTimeout(() => {
      promptInput.value = DEFAULT_PROMPT;
      promptInput.style.opacity = '1';
    }, 200);
    showToast('Prompt reset to default', 'info');
  });

  // Toggle password visibility with icon update
  document.querySelectorAll('.toggle-visibility').forEach(button => {
    button.addEventListener('click', () => {
      const inputId = button.getAttribute('data-for');
      const input = document.getElementById(inputId);
      const icon = button.querySelector('.material-icons');
      
      if (input.type === 'password') {
        input.type = 'text';
        icon.textContent = 'visibility';
      } else {
        input.type = 'password';
        icon.textContent = 'visibility_off';
      }
    });
  });

  // Modal controls with animations
  openBtn.addEventListener('click', () => {
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    setTimeout(() => modal.style.opacity = '1', 10);
  });

  const closeModal = () => {
    modal.style.opacity = '0';
    document.body.style.overflow = '';
    setTimeout(() => modal.style.display = 'none', 300);
  };

  closeBtn.addEventListener('click', closeModal);

  // Close on outside click
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  // Save settings with validation and feedback
  saveBtn.addEventListener('click', async () => {
    const geminiKey = geminiInput.value.trim();
    const groqKey = groqInput.value.trim();
    const customPrompt = promptInput.value.trim();

    try {
      // Validate inputs
      if (!geminiKey && !groqKey) {
        throw new Error('Please enter at least one API key');
      }
      if (!customPrompt) {
        throw new Error('Prompt template cannot be empty');
      }

      // Show saving state
      saveBtn.disabled = true;
      saveBtn.innerHTML = `
        <div class="loading-spinner"></div>
        <span>Saving...</span>
      `;

      // Save to Chrome storage
      await chrome.storage.local.set({
        geminiApiKey: geminiKey,
        groqApiKey: groqKey,
        customPrompt: customPrompt
      });

      // Reinitialize AI service
      aiService = new window.AIService();
      
      showToast('Settings saved successfully!', 'success');
      closeModal();

    } catch (error) {
      console.error('[Settings] Error saving settings:', error);
      showToast(error.message, 'error');
    } finally {
      // Reset button state
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <span class="material-icons">save</span>
        Save Changes
      `;
    }
  });

  // Add click tracking for API key links
  document.querySelectorAll('.api-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const service = link.closest('.api-key-input').querySelector('label').textContent;
      console.log(`[Settings] Opening ${service} API key page`);
      
      // Show helper toast
      showToast(`Opening ${service} page in new tab`, 'info');
    });
  });
}

// Add this function to clean up blob URLs when the panel closes or reloads
function cleanupBlobUrls() {
  if (window.lastPdfUrl) {
    URL.revokeObjectURL(window.lastPdfUrl);
    window.lastPdfUrl = null;
  }
  if (window.lastTailoredPdfUrl) {
    URL.revokeObjectURL(window.lastTailoredPdfUrl);
    window.lastTailoredPdfUrl = null;
  }
  if (window.isPreviewUpdating) {
    window.isPreviewUpdating = false;
  }
}

// Add cleanup on tab visibility change
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cleanupBlobUrls();
  }
});

// Update handleGenerateClick function to properly handle file types
async function handleGenerateClick() {
  const generateBtn = document.getElementById('generateBtn');
  const originalBtnContent = generateBtn.innerHTML;

  try {
    console.log('[Generate] Starting generation process:', {
      fileType: sidebarState.fileType,
      contentType: sidebarState.contentType,
      hasOriginalLatex: !!originalLatex,
      hasOriginalDocx: !!sidebarState.originalDocx,
      currentState: {
        ...sidebarState,
        originalDocxPreview: sidebarState.originalDocx ? 'Present' : 'Missing'
      }
    });

    // Show loading state
    generateBtn.disabled = true;
    generateBtn.innerHTML = `
      <div class="loading-spinner"></div>
      <span>Generating ${sidebarState.fileType?.toUpperCase() || 'Resume'}...</span>
    `;

    showToast(`Starting ${sidebarState.fileType?.toUpperCase() || 'resume'} generation...`, 'info');

    // Validate file type and content
    if (!sidebarState.fileType) {
      throw new Error('No file type detected. Please upload a file first.');
    }

    console.log('[Generate] Checking file type pipeline:', {
      detectedType: sidebarState.fileType,
      hasContent: sidebarState.fileType === 'docx' ? 
        !!sidebarState.originalDocx : 
        !!originalLatex
    });

    // Generate content based on file type
    let result;
    if (sidebarState.fileType === 'docx') {
      console.log('[Generate] Using DOCX pipeline');
      if (!sidebarState.originalDocx) {
        throw new Error('DOCX content not found. Please upload your DOCX file again.');
      }
      result = await generateTailoredDocx();
    } else if (sidebarState.fileType === 'latex') {
      console.log('[Generate] Using LaTeX pipeline');
      if (!originalLatex) {
        throw new Error('LaTeX content not found. Please upload your LaTeX file again.');
      }
      result = await generateTailoredLatex();
    } else {
      throw new Error(`Unsupported file type: ${sidebarState.fileType}`);
    }

    console.log('[Generate] Generation result:', {
      success: result.success,
      type: result.type,
      hasContent: result.type === 'docx' ? 
        !!result.docx : 
        !!result.content,
      error: result.error
    });

    if (!result.success) {
      throw new Error(result.error || 'Generation failed');
    }

    // Update state based on file type
    if (result.type === 'docx') {
      sidebarState.tailoredDocx = result.docx;
      sidebarState.tailoredHtml = result.html;
      sidebarState.tailoredContent = result.text;
      console.log('[Generate] Updated DOCX state:', {
        hasDocx: !!sidebarState.tailoredDocx,
        hasHtml: !!sidebarState.tailoredHtml,
        contentLength: sidebarState.tailoredContent?.length
      });
    } else {
      tailoredLatex = result.content;
      sidebarState.tailoredContent = result.content;
      console.log('[Generate] Updated LaTeX state:', {
        hasLatex: !!tailoredLatex,
        contentLength: result.content?.length
      });
    }

    sidebarState.contentType = 'generated';
    await chrome.storage.local.set({ 
      sidebarState,
      tailoredLatex: result.type === 'latex' ? result.content : null
    });

    console.log('[Generate] State saved:', {
      contentType: sidebarState.contentType,
      fileType: sidebarState.fileType,
      stateUpdated: true
    });

    // Update preview
    await updatePreview();
    
    showToast(`${sidebarState.fileType.toUpperCase()} generated successfully!`, 'success');

  } catch (error) {
    console.error('[Generate] Error:', {
      message: error.message,
      fileType: sidebarState.fileType,
      stack: error.stack
    });
    showToast(error.message, 'error');
  } finally {
    // Restore button state
    generateBtn.disabled = false;
    generateBtn.innerHTML = originalBtnContent;
  }
}

// Add this function to validate current state
function validateCurrentState() {
  const state = {
    fileType: sidebarState.fileType,
    hasOriginalLatex: !!originalLatex,
    hasOriginalDocx: !!sidebarState.originalDocx,
    contentType: sidebarState.contentType,
    hasTailoredContent: sidebarState.fileType === 'docx' ? 
      !!sidebarState.tailoredDocx : 
      !!tailoredLatex
  };

  console.log('[State] Current state validation:', state);
  return state;
}

// Update the setupGenerateButton function
function setupGenerateButton() {
  const generateBtn = document.getElementById('generateBtn');
  if (generateBtn) {
    // Remove any existing listeners
    generateBtn.removeEventListener('click', handleGenerateClick);
    
    // Add new listener
    generateBtn.addEventListener('click', async () => {
      console.log('[Setup] Generate button clicked');
      
      // Validate current state before proceeding
      const currentState = validateCurrentState();
      console.log('[Setup] Pre-generation state check:', currentState);
      
      await handleGenerateClick();
    });
    
    console.log('[Setup] Generate button handler attached with state validation');
  } else {
    console.error('[Setup] Generate button not found');
  }
}

// Add this function to inject required CSS
function injectPreviewStyles() {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    .preview-section {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 600px;
      transition: all 0.3s ease;
    }

    .preview-section.fullscreen {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1000;
      height: 100vh;
      width: 100vw;
      border-radius: 0;
      background: #ffffff;
    }

    .preview-content {
      flex: 1;
      position: relative;
      height: 100%;
      min-height: 500px;
      overflow: hidden;
    }

    .preview-view {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
    }

    #rawPreview {
      background-color: #1e1e2e;
      color: #ffffff;
      padding: 20px;
    }

    .preview-text-content {
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
      color: #ffffff;
    }

    #compiledPreview {
      background: #ffffff;
    }

    .pdf-container {
      width: 100%;
      height: 100%;
      min-height: inherit;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pdf-container iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: white;
    }

    /* Loading and error states */
    .loading-preview,
    .error-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 20px;
      text-align: center;
      gap: 12px;
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Loading button styles */
    #generateBtn {
      position: relative;
      transition: all 0.3s ease;
    }

    #generateBtn:disabled {
      background-color: #e0e0e0;
      cursor: not-allowed;
    }

    #generateBtn .loading-spinner {
      width: 20px;
      height: 20px;
      margin-right: 8px;
    }

    /* Preview transitions */
    .preview-text-content,
    #rawPreview,
    #compiledPreview {
      transition: opacity 0.3s ease;
    }

    /* Loading preview styles */
    .loading-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      padding: 20px;
      text-align: center;
      background: rgba(255, 255, 255, 0.9);
    }

    .loading-preview .loading-spinner {
      width: 40px;
      height: 40px;
      margin-bottom: 16px;
    }

    /* Animation keyframes */
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `;
  document.head.appendChild(styleSheet);
}

// Add this function to check PDF visibility
function checkPdfVisibility() {
  const pdfPreviewArea = document.getElementById('pdfPreviewArea');
  const compiledPreview = document.getElementById('compiledPreview');
  const iframe = pdfPreviewArea?.querySelector('iframe');

  console.log('[PdfPreview] Visibility check:', {
    pdfPreviewArea: {
      exists: !!pdfPreviewArea,
      display: pdfPreviewArea?.style.display,
      height: pdfPreviewArea?.clientHeight,
      visibility: pdfPreviewArea?.style.visibility
    },
    compiledPreview: {
      exists: !!compiledPreview,
      display: compiledPreview?.style.display,
      height: compiledPreview?.clientHeight,
      visibility: compiledPreview?.style.visibility
    },
    iframe: {
      exists: !!iframe,
      src: iframe?.src,
      display: iframe?.style.display,
      height: iframe?.clientHeight
    }
  });
}

function monitorPdfVisibility() {
  const checkVisibility = () => {
    const pdfPreviewArea = document.getElementById('pdfPreviewArea');
    const compiledPreview = document.getElementById('compiledPreview');
    const iframe = pdfPreviewArea?.querySelector('iframe');
    
    console.log('[PdfPreview] Monitor check:', {
      timestamp: new Date().toISOString(),
      pdfPreviewArea: {
        exists: !!pdfPreviewArea,
        display: pdfPreviewArea?.style.display,
        visibility: pdfPreviewArea?.style.visibility,
        height: pdfPreviewArea?.clientHeight,
        children: pdfPreviewArea?.childNodes.length
      },
      compiledPreview: {
        exists: !!compiledPreview,
        display: compiledPreview?.style.display,
        visibility: compiledPreview?.style.visibility,
        height: compiledPreview?.clientHeight
      },
      iframe: iframe ? {
        display: iframe.style.display,
        height: iframe.clientHeight,
        src: iframe.src,
        contentLoaded: !!iframe.contentWindow
      } : null
    });
  };

  // Check visibility immediately and after short delays
  checkVisibility();
  setTimeout(checkVisibility, 500);
  setTimeout(checkVisibility, 1500);
  setTimeout(checkVisibility, 3000);
}

// Update generateLatexPreview function
async function generateLatexPreview(content) {
  try {
    console.log('[LatexPreview] Starting preview generation', {
      hasContent: !!content,
      contentLength: content?.length,
      contentType: typeof content
    });

    if (!content || typeof content !== 'string') {
      throw new Error('Invalid LaTeX content for preview');
    }

    const pdfPreviewArea = document.getElementById('pdfPreviewArea');
    if (!pdfPreviewArea) {
      throw new Error('PDF preview area not found');
    }

    // Show loading state
    pdfPreviewArea.innerHTML = `
      <div class="loading-preview">
        <div class="loading-spinner"></div>
        <span>Generating PDF preview...</span>
      </div>
    `;

    // Clean and validate the LaTeX content
    const cleanedContent = content.trim();
    
    console.log('[LatexPreview] Preparing content for compilation:', {
      contentLength: cleanedContent.length,
      hasDocumentClass: cleanedContent.includes('\\documentclass'),
      hasBeginDocument: cleanedContent.includes('\\begin{document}'),
      contentPreview: cleanedContent.substring(0, 100) + '...'
    });

    // Send to server for compilation
    const response = await fetch(`${window.ServerManager.API_URL}/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latex: cleanedContent })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[LatexPreview] Server error:', errorData);
      throw new Error(errorData.error || 'PDF compilation failed');
    }

    // Get PDF blob
    const pdfBlob = await response.blob();
    if (!pdfBlob || pdfBlob.size === 0) {
      throw new Error('Generated PDF is empty');
    }

    console.log('[LatexPreview] PDF generated successfully:', {
      size: pdfBlob.size,
      type: pdfBlob.type
    });

    // Create URL and iframe
    if (window.lastPdfUrl) {
      URL.revokeObjectURL(window.lastPdfUrl);
    }
    window.lastPdfUrl = URL.createObjectURL(pdfBlob);

    const iframe = document.createElement('iframe');
    iframe.src = `${window.lastPdfUrl}#zoom=FitH`;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';

    // Clear previous content and add iframe
    pdfPreviewArea.innerHTML = '';
    pdfPreviewArea.appendChild(iframe);

    // Monitor iframe loading
    iframe.onload = () => {
      console.log('[LatexPreview] PDF iframe loaded successfully');
      showStatus('PDF preview loaded successfully', 'success');
    };

    iframe.onerror = (error) => {
      console.error('[LatexPreview] PDF iframe loading error:', error);
      throw new Error('Failed to load PDF preview');
    };

    return true;
  } catch (error) {
    console.error('[LatexPreview] Error:', error);
    showStatus(`Preview generation failed: ${error.message}`, 'error');
    
    // Show error in preview area
    if (pdfPreviewArea) {
      pdfPreviewArea.innerHTML = `
        <div class="error-message">
          <span class="material-icons">error_outline</span>
          <p>Failed to generate PDF preview: ${error.message}</p>
          <button onclick="window.retryPdfPreview()" class="retry-button">
            <span class="material-icons">refresh</span>
            Retry
          </button>
        </div>
      `;
    }
    return false;
  }
}

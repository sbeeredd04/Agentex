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
  generatedContent: null
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
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

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
  const previewControls = document.querySelector('.preview-controls');
  if (!previewControls) {
    console.error('[Preview] Preview controls not found');
    return;
  }

  // The toggle buttons are already present in HTML, no need to create them
  const toggleButtons = document.querySelectorAll('.preview-toggle-btn');
  const rawPreview = document.getElementById('rawPreview');
  const compiledPreview = document.getElementById('compiledPreview');
  
  toggleButtons.forEach(button => {
    button.addEventListener('click', async () => {
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
        
        // Generate PDF preview if needed
        const content = sidebarState.contentType === 'generated' ? tailoredLatex : originalLatex;
        if (content) {
          showStatus('Compiling PDF preview...', 'info');
          const success = await generatePdfPreview(content, sidebarState.contentType);
          if (success) {
            showStatus('PDF preview generated successfully!', 'success');
          }
        }
      }
    });
  });

  console.log('[Preview] UI setup complete');
}

// Update the generatePdfPreview function
async function generatePdfPreview(latex, type = 'original') {
  if (!latex) {
    showStatus("No content available for preview", 'warning');
    return false;
  }

  try {
    // Show loading state in the preview area
    const pdfPreviewArea = document.getElementById('pdfPreviewArea');
    pdfPreviewArea.innerHTML = `
      <div class="loading-preview">
        <div class="loading-spinner"></div>
        <span>Compiling PDF...</span>
      </div>
    `;

    // Save and compile the LaTeX content
    const saveResult = await window.ServerManager.saveGeneratedResume(latex, 'resume.tex', {
      type,
      timestamp: Date.now(),
      previewGeneration: true
    });

    if (!saveResult.success) {
      throw new Error(`Failed to save LaTeX: ${saveResult.error}`);
    }

    const compileResult = await window.ServerManager.compileResume({
      latex: latex,
      fileId: saveResult.fileId
    });

    if (!compileResult.success) {
      throw new Error(`PDF compilation failed: ${compileResult.error}`);
    }

    // Create blob URL from the PDF response
    const pdfBlob = new Blob([compileResult.content], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Update preview with the PDF URL
    pdfPreviewArea.innerHTML = `
      <iframe 
        src="${pdfUrl}#zoom=FitH" 
        type="application/pdf" 
        width="100%" 
        height="100%"
        title="Resume Preview"
      ></iframe>
    `;

    // Cleanup old blob URL
    if (window.lastPdfUrl) {
      URL.revokeObjectURL(window.lastPdfUrl);
    }
    window.lastPdfUrl = pdfUrl;

    return true;
  } catch (error) {
    console.error('[Preview] Error in PDF generation:', error);
    showStatus(`Preview generation failed: ${error.message}`, 'error');
    return false;
  }
}

// Save and restore state using chrome.storage
function saveState() {
  chrome.storage.local.set({ sidebarState });
}

async function restoreState() {
  const { sidebarState: savedState } = await chrome.storage.local.get('sidebarState');
  console.log('[State] Restoring state:', savedState);
  
  if (savedState) {
    // Merge saved state with default state to ensure all properties exist
    sidebarState = {
      ...sidebarState,
      ...savedState
    };

    console.log('[State] State restored:', {
      contentType: sidebarState.contentType,
      previewMode: sidebarState.previewMode,
      modelSelection: sidebarState.selectedModel
    });

    // Restore UI elements
    const elements = {
      jobDescInput: document.getElementById('jobDesc'),
      knowledgeBaseText: document.getElementById('knowledgeBaseText'),
      previewArea: document.getElementById('previewArea'),
      fileNameDisplay: document.getElementById('fileNameDisplay')
    };

    // Restore content if available
    if (sidebarState.uploadedFileContent) {
      originalLatex = sidebarState.uploadedFileContent;
      if (elements.previewArea) {
        elements.previewArea.textContent = originalLatex;
      }
    }

    // Restore other UI states
    if (elements.jobDescInput && sidebarState.lastJobDescription) {
      elements.jobDescInput.value = sidebarState.lastJobDescription;
    }

    if (elements.knowledgeBaseText && sidebarState.lastKnowledgeBaseText) {
      elements.knowledgeBaseText.value = sidebarState.lastKnowledgeBaseText;
    }

    if (elements.fileNameDisplay && sidebarState.uploadedFileName) {
      elements.fileNameDisplay.innerHTML = `
        <div class="file-upload-feedback success">
          <span class="material-icons">check_circle</span>
          <span>${sidebarState.uploadedFileName}</span>
        </div>
      `;
    }

    // Only update preview if we have content
    if (originalLatex || tailoredLatex) {
      await updatePreview(sidebarState.previewMode);
    }
  } else {
    console.log('[State] No saved state found, using defaults');
  }
}

// Function to handle file upload
async function handleFileUpload(file) {
  console.log('[Upload] Starting file upload:', file);
  if (!file) {
    console.log('[Upload] No file selected');
    return;
  }
  try {
    currentFile = file;
    showStatus('Reading file...', 'info');
    showUploadingFeedback(file.name);

    // Read file content
    const content = await readFileContent(file);
    console.log('[Upload] File content read successfully:', {
      length: content.length,
      preview: content.substring(0, 100) // Show first 100 characters
    });

    // Display the content in the preview area
    document.getElementById('previewArea').textContent = content;
    console.log('[Upload] Content displayed in preview area');

    // Enable the preview button
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn) {
      previewBtn.disabled = false;
      console.log('[Upload] Preview button enabled');
    }

    // Update the original LaTeX content
    originalLatex = content;
    console.log('[Upload] Original LaTeX content updated');

    // Save the file content and filename to chrome.storage
    sidebarState.uploadedFileName = file.name;
    sidebarState.uploadedFileContent = content;
    saveState();

    // Show successful upload feedback
    showSuccessfulUploadFeedback(file.name);
    showStatus('File uploaded successfully!', 'success');
    console.log('[Upload] Process completed successfully');
  } catch (error) {
    console.error('[Upload] Error during file upload:', error);
    showStatus('Failed to upload file: ' + error.message, 'error');
    showFailedUploadFeedback();
  }
}

// Helper function to read file content
function readFileContent(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target.result;
      console.log('[FileReader] File read successfully:', {
        length: content.length,
        preview: content.substring(0, 100) // Show first 100 characters
      });
        resolve(content);
      } catch (error) {
      console.error('[FileReader] Error reading file:', error);
        reject(error);
      }
    };
    reader.onerror = (e) => {
    console.error('[FileReader] Error during file reading:', e);
      reject(new Error('Failed to read file'));
    };
  console.log('[FileReader] Starting to read file as text');
    reader.readAsText(file);
  });
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

// Add this function to handle preview toggling
function setupPreviewToggle() {
  const toggleButtons = document.querySelectorAll('.preview-toggle-btn');
  const previewSection = document.querySelector('.preview-section');
  const fullscreenBtn = document.querySelector('.view-toggle');
  let isFullscreen = false;

  toggleButtons.forEach(button => {
    button.addEventListener('click', async () => {
      // Update button states
      toggleButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const view = button.dataset.view;
      const rawPreview = document.getElementById('rawPreview');
      const compiledPreview = document.getElementById('compiledPreview');
      
      if (view === 'raw') {
        rawPreview.style.display = 'block';
        compiledPreview.style.display = 'none';
      } else {
        rawPreview.style.display = 'none';
        compiledPreview.style.display = 'block';
        
        // Generate PDF preview if needed
        const content = sidebarState.contentType === 'generated' ? tailoredLatex : originalLatex;
        if (content) {
          showStatus('Compiling PDF preview...', 'info');
          const success = await generatePdfPreview(content, sidebarState.contentType);
          if (success) {
            showStatus('PDF preview generated successfully!', 'success');
          }
        }
      }
    });
  });

  // Handle fullscreen toggle
  fullscreenBtn.addEventListener('click', () => {
    isFullscreen = !isFullscreen;
    
    if (isFullscreen) {
      previewSection.classList.add('fullscreen');
      fullscreenBtn.querySelector('.material-icons').textContent = 'fullscreen_exit';
      document.body.style.overflow = 'hidden';
    } else {
      previewSection.classList.remove('fullscreen');
      fullscreenBtn.querySelector('.material-icons').textContent = 'fullscreen';
      document.body.style.overflow = '';
    }
  });

  // Handle escape key to exit fullscreen
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isFullscreen) {
      fullscreenBtn.click();
    }
  });
}

// Update the initialization function
async function initializeSidepanel() {
  console.log('[Sidepanel] Initializing...');
  try {
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

// Update the tailor resume click handler
document.getElementById('tailorBtn').addEventListener('click', async () => {
  const jobDesc = document.getElementById('jobDesc').value.trim();
  const knowledgeBase = document.getElementById('knowledgeBaseText').value.trim();
  
  console.log('[TailorBtn] Starting generation:', {
    model: currentModelSelection,
    hasJobDesc: Boolean(jobDesc),
    hasKnowledgeBase: Boolean(knowledgeBase),
    timestamp: new Date().toISOString()
  });
    
  if (!originalLatex) {
    showStatus("Please upload or select a resume template first", 'error');
    return;
  }
  if (!jobDesc) {
    showStatus("Please enter the job description", 'error');
    return;
  }

  try {
    // Show loading state
    const tailorBtn = document.getElementById('tailorBtn');
    tailorBtn.disabled = true;
    tailorBtn.innerHTML = `
      <div class="loading-spinner"></div>
      <span>Generating with ${currentModelSelection.type.toUpperCase()}...</span>
    `;
    showStatus(`Generating tailored resume using ${currentModelSelection.type.toUpperCase()}...`, 'info');

    // Get the custom prompt from storage
    const { customPrompt } = await chrome.storage.local.get('customPrompt');
    const promptTemplate = customPrompt || DEFAULT_PROMPT;

    // Construct the final prompt
    const prompt = `
      ${promptTemplate}

      Job Description:
      ${jobDesc}

      Knowledge Base:
      ${knowledgeBase || 'None'}

      Original Resume LaTeX:
      ${originalLatex}

      Respond ONLY with optimized LaTeX code.`.trim();

    console.log('[TailorBtn] Generation parameters:', {
      modelType: currentModelSelection.type,
      specificModel: currentModelSelection.model,
      promptLength: prompt.length,
      jobDescLength: jobDesc.length
    });

    // Generate tailored content with selected model
    let generatedContent = await aiService.generateContent(
      prompt,
      currentModelSelection.type,
      currentModelSelection.model
    );
    
    console.log('[TailorBtn] AI generation completed:', {
      success: Boolean(generatedContent),
      contentLength: generatedContent?.length || 0,
      modelUsed: currentModelSelection
    });

    // Store the generated content
    tailoredLatex = generatedContent;

    // Save the generated resume and get unique fileId
    const saveResult = await window.ServerManager.saveGeneratedResume(
      tailoredLatex,
      'tailored-resume.tex',
      {
        modelUsed: currentModelSelection,
        timestamp: Date.now(),
        originalFilename: currentFile?.name
      }
    );

    console.log('[TailorBtn] Save result:', saveResult);

    if (!saveResult.success) {
      throw new Error(`Failed to save generated resume: ${saveResult.error}`);
    }

    // Compile PDF with the unique fileId
    const compileResult = await window.ServerManager.compileResume({
      latex: tailoredLatex,
      fileId: saveResult.fileId
    });
    
    console.log('[TailorBtn] Compile result:', compileResult);

    if (!compileResult.success) {
      throw new Error(`PDF compilation failed: ${compileResult.error}`);
    }

    // Create blob URL from the PDF response
    const pdfBlob = new Blob([compileResult.content], { type: 'application/pdf' });
    const pdfUrl = URL.createObjectURL(pdfBlob);

    // Store the URL for later cleanup
    if (window.lastTailoredPdfUrl) {
      URL.revokeObjectURL(window.lastTailoredPdfUrl);
    }
    window.lastTailoredPdfUrl = pdfUrl;

    // Update UI
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.href = pdfUrl;
      downloadBtn.download = `tailored-resume-${Date.now()}.pdf`;
    }

    const generatedRadio = document.querySelector('input[value="generated"]');
    if (generatedRadio) {
      generatedRadio.disabled = false;
      generatedRadio.checked = true;
    }

    await updatePreview('generated');
    showStatus(`Resume tailored successfully using ${currentModelSelection.type.toUpperCase()}!`, 'success');

  } catch (error) {
    console.error("[TailorBtn] Error in resume generation pipeline:", {
      error: error.message,
      stack: error.stack,
      type: error.name,
      phase: error.phase || 'unknown'
    });
    showStatus(`Generation failed: ${error.message}`, 'error');
  } finally {
    // Reset button state
    const tailorBtn = document.getElementById('tailorBtn');
    if (tailorBtn) {
      tailorBtn.disabled = false;
      tailorBtn.innerHTML = `
        <span class="material-icons">auto_awesome</span> Generate Tailored Resume
      `;
    }
  }
});

async function updatePreview(mode) {
  console.log('[Preview] Updating preview:', {
    mode,
    contentType: sidebarState.contentType,
    hasOriginal: Boolean(originalLatex),
    hasGenerated: Boolean(tailoredLatex)
  });

  const rawPreview = document.getElementById('rawPreview');
  const compiledPreview = document.getElementById('compiledPreview');
  const previewArea = document.getElementById('previewArea');
  
  if (!previewArea) {
    console.error('[Preview] Required elements not found');
    return;
  }

  // Use contentType from state to determine which version to show
  const contentToShow = sidebarState.contentType === 'generated' ? tailoredLatex : originalLatex;
  
  if (!contentToShow) {
    console.log('[Preview] No content available to show');
    previewArea.textContent = 'No content available';
    return;
  }
  
  // Update text content
  previewArea.textContent = contentToShow;
  
  // If we're showing the compiled view, generate the PDF
  const activeView = document.querySelector('.preview-toggle-btn.active').dataset.view;
  if (activeView === 'compiled') {
    await generatePdfPreview(contentToShow);
  }
  
  // Save the current state
  saveState();
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
  }
  if (window.lastTailoredPdfUrl) {
    URL.revokeObjectURL(window.lastTailoredPdfUrl);
  }
}

// Add event listener for cleanup
window.addEventListener('unload', cleanupBlobUrls);

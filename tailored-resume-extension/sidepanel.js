// Debug: Initialize popup.js
console.log('Initializing popup.js');

// Global variables and state
let storage, aiService, fileManager;
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

// Function to display status messages
function showStatus(message, type = 'info') {
  console.log(`Status: ${message} (${type})`);
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    setTimeout(() => { statusDiv.style.display = 'none'; }, 5000);
  }
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
    resumeList: document.getElementById('resumeList'),
    knowledgeBaseText: document.getElementById('knowledgeBaseText'),
    resumeTab: document.getElementById('resumeTab'),
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
  const previewControl = document.querySelector('.preview-control');
  if (!previewControl) {
    console.error('Preview control not found');
    return;
  }
  const toggleButton = document.createElement('button');
  toggleButton.id = 'togglePreviewMode';
  toggleButton.className = 'icon-button';
  toggleButton.title = 'Toggle Preview Mode';
  toggleButton.innerHTML = '<span class="material-icons">visibility</span>';
  previewControl.appendChild(toggleButton);
  
  const previewArea = document.getElementById('previewArea');
  const pdfPreviewArea = document.getElementById('pdfPreviewArea');
  
  toggleButton.addEventListener('click', async () => {
    console.log('[Preview] Switching preview mode');

    // Determine the current mode and toggle it
    const isShowingPdf = pdfPreviewArea.style.display !== 'none';
    const newMode = isShowingPdf ? 'text' : 'pdf';

    // Update the preview with the new mode
    await updatePreview(newMode);

    // Update the button icon and title based on the new mode
    if (newMode === 'text') {
      toggleButton.innerHTML = '<span class="material-icons">visibility</span>';
      toggleButton.title = 'Show PDF Preview';
    } else {
      toggleButton.innerHTML = '<span class="material-icons">code</span>';
      toggleButton.title = 'Show LaTeX Code';
    }
  });
  console.log('Preview UI setup complete');
}

// Function to generate PDF preview from LaTeX content
async function generatePdfPreview(latex, type = 'original') {
  console.log('[Preview] Attempting PDF preview generation:', {
    hasContent: Boolean(latex),
    type,
    filename: currentFile?.name
  });

  if (!latex) {
    console.log('[Preview] No content available for PDF preview');
    showStatus("No content available for preview", 'warning');
    return false;
  }

  const filename = currentFile ? currentFile.name : 'resume.tex';
  try {
    const response = await fetch('http://localhost:3000/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latex, type, filename })
    });
    const data = await response.json();
    if (data.success && data.pdfUrl) {
      const fullPdfUrl = `http://localhost:3000${data.pdfUrl}`;
      console.log('[Preview] PDF URL set to', fullPdfUrl);
      const pdfPreviewArea = document.getElementById('pdfPreviewArea');
      pdfPreviewArea.innerHTML = `<iframe src="${fullPdfUrl}" type="application/pdf" width="100%" height="100%"></iframe>`;
      currentPdfUrl = data.pdfUrl;
      showStatus(`${type} PDF preview generated successfully!`, 'success');
      return true;
    } else {
      throw new Error(data.error || "PDF generation failed");
    }
  } catch (error) {
    console.error('[Preview] Error generating PDF preview:', error);
    showStatus("Could not generate preview: " + error.message, 'error');
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

// Cleanup temporary PDF URL
function cleanupPdfUrl(url) {
  console.log('[Cleanup] Cleaning up PDF URL:', url);
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
    console.log('[Cleanup] Revoked blob URL');
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

// Main initialization function for the sidepanel
async function initializeSidepanel() {
  console.log('[Sidepanel] Initializing...');
  try {
    // Initialize required services
    if (!window.StorageManager) throw new Error('StorageManager not found');
    if (!window.AIService) throw new Error('AIService not found');
    if (!window.FileManager) throw new Error('FileManager not found');
    if (!window.config || !window.config.GEMINI_API_KEY) throw new Error('Config or API key not found');
    
    console.log('Initializing services...');
    storage = new window.StorageManager();
    aiService = new window.AIService(window.config.GEMINI_API_KEY);
    fileManager = new window.FileManager();
    await fileManager.initializeFolders();
    console.log('Services and folders initialized successfully');
    
    // Set up UI and event listeners
    const elements = setupUIElements();
    setupEventListeners(elements);
    setupPreviewUI();
    setupModelSelector();
    
    await restoreState();
    
    console.log('[Sidepanel] UI initialized successfully');
  } catch (error) {
    console.error('[Sidepanel] Initialization failed:', error);
    showStatus('Failed to initialize sidepanel: ' + error.message, 'error');
  }
}

// Initialize the sidepanel when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    initializeSidepanel();
  } catch (error) {
    console.error('[Sidepanel] Initialization error:', error);
  }
});

// Function to load knowledge base content
async function loadKnowledgeBase() {
  try {
    const response = await fetch('http://localhost:3000/knowledge-base');
    const data = await response.json();
    
    if (data.success) {
      const knowledgeBaseText = document.getElementById('knowledgeBaseText');
      if (knowledgeBaseText) {
        knowledgeBaseText.value = data.content;
      }
    }
  } catch (error) {
    console.error('Error loading knowledge base:', error);
    showStatus('Failed to load knowledge base', 'error');
  }
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
  
  console.log('[TailorBtn] Starting generation with model:', currentModelSelection);
    
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
    
      // Construct the prompt
      const prompt = `
      You are an ATS resume tailoring expert for software engineering roles the goal is to pass the ATS and get an interview. Your task:
      1. Tailor the provided LaTeX resume strictly to match the job description (JD).
      2. Only modify existing experiences/projects if they closely align with JD requirements or if the knowledge base contains clearly superior alternatives.
      3. Replace existing content ONLY if the knowledge base item:
        - Matches JD significantly better (1 or more additional JD keywords).
        - Has clearly stronger metrics or direct technology overlap.
      4. Do NOT generate experience or skills unrelated to existing content or knowledge base. Only adjust wording if closely related (e.g., "Next.js" → "React").
      5. Match the writing tone/personality traits described in JD (e.g., enthusiastic, proactive).
      6. How to use the XYZ format:
        - Identify your accomplishment: State what I accomplished [X].
        - Measure your impact: Describe the results of my accomplishment [Y].
        - Explain your method: Describe how I achieved my accomplishment [Z].
      7. Highlight metrics and keywords or any relevant information while using the XYZ format look from job description:
        - "\\resumeItem{\\textbf{JD Keyword} used to \\textbf{Action Verb} \\emph{Tech Stack} resulting in \\textbf{Metrics}}".
      8. Preserve original LaTeX structure exactly just edit the content.
      9. Ensure ATS compliance and keep resume length strictly under 1 page.
      10. IMPORTANT: Do not delete any experiences or projects only replace or edit the content.
      11. IMPORTANT: Do not add any new experiences or projects unless they are in the knowledge base/resume template and are relevant to the job description.
      12. IMPORTANT: Do not completely change the tech stack can add only relevant tech stack to the resume that closely matches the job description eg. "Next.js" → "React" but not "Next.js" → "C# and .NET".
      13. IMPORTANT: Its ok to generate some content that is possible to be true but not exactly true from the resume or knowledge base, you can do that as long as it is relevant to the job description.
      14. IMPORTANT: Keep the content density and length of the original resume. HIGHLIGHT the relevent content from the job description at all places in the resume.
      Job Description:
      ${jobDesc}

      Knowledge Base:
      ${storage.knowledgeBase.size > 0 ? Array.from(storage.knowledgeBase).join(', ') : 'None'}

      Original Resume (LaTeX):
      ${originalLatex}

      IMPORTANT: Respond ONLY with the tailored LaTeX resume code.
      `.trim();

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
    
    console.log('[TailorBtn] Generation completed:', {
      success: Boolean(generatedContent),
      contentLength: generatedContent?.length || 0,
      modelUsed: currentModelSelection
    });
    
    // Additional cleanup to ensure no markdown artifacts remain
    generatedContent = generatedContent.trim();
    
    // Store the cleaned content
    tailoredLatex = generatedContent;

    // Save the generated resume
    const response = await fetch('http://localhost:3000/save-generated', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        latex: tailoredLatex,
        originalFilename: currentFile?.name || 'resume.tex',
        modelUsed: currentModelSelection // Add model info to saved file
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save generated resume');
    }

    console.log('[TailorBtn] Resume saved successfully');

    // Update UI safely
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
      downloadBtn.disabled = false;
    }

    const generatedRadio = document.querySelector('input[value="generated"]');
    if (generatedRadio) {
      generatedRadio.disabled = false;
      generatedRadio.checked = true;
    }

    await updatePreview('generated');
    showStatus(`Resume tailored successfully using ${currentModelSelection.type.toUpperCase()}!`, 'success');

  } catch (error) {
    console.error("[TailorBtn] Error tailoring resume:", error);
    showStatus(`Error with ${currentModelSelection.type.toUpperCase()}: ${error.message}`, 'error');
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

  const previewArea = document.getElementById('previewArea');
  const pdfPreviewArea = document.getElementById('pdfPreviewArea');
  
  if (!previewArea || !pdfPreviewArea) {
    console.error('[Preview] Required elements not found');
    return;
  }

  // Update preview mode in state
  sidebarState.previewMode = mode;
  
  // Use contentType from state to determine which version to show
  const contentToShow = sidebarState.contentType === 'generated' ? tailoredLatex : originalLatex;
  
  // Handle null content case
  if (!contentToShow) {
    console.log('[Preview] No content available to show');
    previewArea.textContent = 'No content available';
    pdfPreviewArea.innerHTML = '';
    return;
  }
  
  console.log('[Preview] Content selection:', {
    selectedType: sidebarState.contentType,
    contentLength: contentToShow.length,
    preview: contentToShow.substring(0, 100) + '...'
  });
  
  // Update text content first
  previewArea.textContent = contentToShow;
  
  // Then handle display mode
  if (mode === 'text') {
    console.log('[Preview] Switching to text mode');
    previewArea.style.display = 'block';
    pdfPreviewArea.style.display = 'none';
  } else if (mode === 'pdf') {
    console.log('[Preview] Switching to PDF mode');
    previewArea.style.display = 'none';
    pdfPreviewArea.style.display = 'block';
    
    await generatePdfPreview(contentToShow, sidebarState.contentType);
  }
  
  // Update radio buttons to match state
  const radioButtons = document.querySelectorAll('input[name="resumeVersion"]');
  radioButtons.forEach(radio => {
    const shouldBeChecked = radio.value === sidebarState.contentType;
    radio.checked = shouldBeChecked;
  });
  
  // Save the current state
  saveState();
  console.log('[Preview] Final state saved:', {
    mode: sidebarState.previewMode,
    contentType: sidebarState.contentType,
    modelSelection: sidebarState.selectedModel
  });
}

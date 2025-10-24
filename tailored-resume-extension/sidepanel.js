// Initialize sidepanel.js

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
  fileType: 'latex', // Always LaTeX now
  originalContent: null,
  tailoredContent: null
};

// Add this near the top of the file with other constants
const DEFAULT_PROMPT = `You are an expert ATS resume tailor for software engineering roles. Your mission is to optimize the resume to pass automated screening and secure interviews by:

## Primary Objectives
1. **Precision Alignment**: Rigorously match JD requirements using keywords/metrics from both resume and knowledge base
2. **Strategic Project Replacement**: CRITICAL - Replace existing projects with more relevant ones from the knowledge base when they:
  - Use the same or similar technology stack as mentioned in the JD
  - Demonstrate stronger metrics or achievements
  - Better align with the job responsibilities
3. **Content Preservation**: Maintain original resume structure/length while maximizing JD keyword density

## Project Replacement Protocol
1. First, analyze the job description to identify:
   - Required technologies and frameworks
   - Key responsibilities and achievements
   - Industry-specific requirements

2. Then, evaluate each project in the knowledge base:
   - Calculate relevance score based on technology alignment
   - Compare metrics and achievements with job requirements
   - Assess how well it demonstrates required skills

3. Replace existing projects when:
   - Knowledge base project has ≥70% technology overlap with JD
   - Knowledge base project demonstrates stronger metrics
   - Knowledge base project better aligns with the job responsibilities

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

## CRITICAL PROJECT REPLACEMENT RULES
‼️ ALWAYS REPLACE existing projects with knowledge base projects that:
- Use the same or similar technology stack as mentioned in the JD
- Demonstrate stronger metrics or achievements
- Better align with the job responsibilities

‼️ NEVER:
- Invent unverified experiences
- Change section hierarchy
- Exceed original item length by >20%
- Remove JD-matched content

!! ALWAYS GIVE THE ENTIRE UPDATED LATEX CODE NOTHING ELSE ONLY THE LATEX CODE!!
`;

// Add default prompts for multi-step structure
const DEFAULT_ANALYSIS_PROMPT = `You are an expert resume analyzer. Your task is to analyze the job description and knowledge base to identify:
1. Key technologies and skills required by the job
2. Projects in the knowledge base that are most relevant to the job
3. Specific metrics and achievements that align with the job requirements

Job Description:
{jobDesc}

Knowledge Base / Additional Experience:
{knowledgeBase}

Provide a structured analysis in JSON format with the following fields:
{
  "requiredTechnologies": ["tech1", "tech2", ...],
  "relevantProjects": [
    {
      "projectName": "Project Name",
      "technologies": ["tech1", "tech2", ...],
      "relevanceScore": 0-100,
      "keyMetrics": ["metric1", "metric2", ...]
    },
    ...
  ],
  "keyMetrics": ["metric1", "metric2", ...]
}

Return ONLY the JSON object, no additional text.`;

const DEFAULT_PROJECTS_PROMPT = `You are an expert resume project optimizer. Your task is to create an optimized projects section for a software engineering resume.

Original Projects Section:
{originalProjects}

Job Requirements:
{jobDesc}

Analysis of Relevant Projects:
{analysisProjects}

Required Technologies:
{requiredTechnologies}

Key Metrics to Highlight:
{keyMetrics}

Instructions:
1. Replace existing projects with more relevant ones from the analysis if they better match the job requirements
2. Ensure each project highlights technologies and metrics that align with the job description
3. Maintain the same LaTeX formatting and structure
4. Use the XYZ format: \\resumeItem{\\textbf{<JD Keyword>} used to \\textbf{<Action Verb>} \\emph{<Tech>} achieving \\textbf{<Metric>} via <Method>}
5. Return ONLY the optimized projects section in LaTeX format

VERY IMPORTANT: ALWAYS REPLACE if the knowledge base has project that uses the same tech stack as the JD or somehow relevant to the JD.`;

const DEFAULT_FINAL_PROMPT = `You are an expert ATS resume tailor for software engineering roles. Your task is to create a final resume by replacing the projects section with the optimized version.

Original LaTeX Resume:
{originalLatex}

Optimized Projects Section:
{optimizedProjects}

Job Description:
{jobDesc}

Instructions:
1. Replace the projects section in the original resume with the optimized version
2. Ensure all LaTeX formatting is preserved
3. Return the complete resume with the updated projects section
4. Do not make any other changes to the resume

!! ALWAYS GIVE THE ENTIRE UPDATED LATEX CODE NOTHING ELSE ONLY THE LATEX CODE!!`;

// Function to display status messages
function showStatus(message, type = 'info') {
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
  DEBOUNCE_TIME: 1000,

  async process(requestFn) {
    const now = Date.now();
    if (this.isProcessing || now - this.lastRequestTime < this.DEBOUNCE_TIME) {
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
    knowledgeBaseText: document.getElementById('knowledgeBaseText'),
    pdfPreviewArea: document.getElementById('pdfPreviewArea')
  };

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
      sidebarState.contentType = e.target.value;
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
        " frameborder="0"></iframe>
                </div>
              </div>
            `;
            
            // Add window function for download
          } else {
            // If no HTML content, show a message
            compiledPreview.innerHTML = `
              <div class="info-message">
                <span class="material-icons">info</span>
              </div>
            `;
          }
        } else {
          // For LaTeX files, use the PDF preview
          const content = sidebarState.contentType === 'generated' 
            ? tailoredLatex 
            : originalLatex;
            
          if (content) {
            await generateLatexPreview(content);
          }
        }
      }
    });
  });
  
  // Update the compiled view button based on file type
  const updateCompiledButtonState = () => {
    const compiledButton = document.querySelector('.preview-toggle-btn[data-view="compiled"]');
    if (compiledButton) {
       else if (sidebarState.fileType === 'latex') {
        compiledButton.disabled = false;
        compiledButton.title = 'View compiled PDF';
      } else {
        compiledButton.disabled = true;
        compiledButton.title = 'No file loaded';
      }
    }
  };
  
  // Call initially and whenever file type changes
  updateCompiledButtonState();
  
  // Update button state when file type changes
  const observer = new MutationObserver(() => {
    updateCompiledButtonState();
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-file-type']
  });
}

// Update the updatePreview function
async function updatePreview() {
  if (window.isPreviewUpdating) {
    return;
  }
  window.isPreviewUpdating = true;

  try {
    console.log('[Preview] Updating preview:', {
      fileType: sidebarState.fileType,
      contentType: sidebarState.contentType,
      hasOriginalContent: !!sidebarState.originalContent,

    // Get content based on type
    let contentToShow;
    if (sidebarState.fileType === 'latex') {
      contentToShow = sidebarState.contentType === 'generated' ? tailoredLatex : originalLatex;
      console.log('[Preview] Using LaTeX content:', {
        isGenerated: sidebarState.contentType === 'generated',
        contentLength: contentToShow?.length
      });
    } else {
      if (sidebarState.contentType === 'generated') {
        // First try to get from sidebarState
        contentToShow = sidebarState.tailoredContent;
        
        // If not in sidebarState, try to get from storage
        if (!contentToShow) {
          const { generatedRawContent } = await chrome.storage.local.get('generatedRawContent');
          contentToShow = generatedRawContent;
            hasContent: !!contentToShow,
            contentLength: contentToShow?.length
          });
        }
      } else {
        contentToShow = sidebarState.originalContent;
      }
      
      console.log('[Preview] Using LaTeX content:', {
        isGenerated: sidebarState.contentType === 'generated',
        contentLength: contentToShow?.length
      });
    }

    if (!contentToShow) {
      console.error('[Preview] No content available for preview');
      throw new Error('No content available for preview. Please try generating the content again.');
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
    console.error('[Preview] Error updating preview:', error);
    showStatus(error.message, 'error');
  } finally {
    window.isPreviewUpdating = false;
  }
}

// Update generatePdfPreview with better content validation
async function generatePdfPreview(content, type = 'original') {
  return requestTracker.process(async () => {
    try {
      const pdfPreviewArea = document.getElementById('pdfPreviewArea');
      if (!pdfPreviewArea) {
        throw new Error("PDF preview area not found");
      }

      // Show loading state
      pdfPreviewArea.innerHTML = `
        <div class="loading-preview">
          <div class="loading-spinner"></div>
          <span>Generating preview...</span>
        </div>
      `;

      showStatus('Generating preview...', 'info');

      // For LaTeX files, proceed with PDF generation
      if (!content) {
        throw new Error('No LaTeX content provided for preview');
      }

      // Use ServerManager to compile LaTeX to PDF
      const serverManager = window.ServerManager;
      if (!serverManager) {
        throw new Error('ServerManager not available');
      }

      const pdfResult = await serverManager.compileLatex(content);

      if (!pdfResult.success) {
        throw new Error('Failed to generate PDF: ' + pdfResult.error);
      }

      // Create URL for the PDF
      const pdfUrl = URL.createObjectURL(pdfResult.content);

      // Create PDF viewer with toolbar
      pdfPreviewArea.innerHTML = `
        <div class="pdf-container">
          <div class="pdf-toolbar">
            <button onclick="window.zoomIn()">
              <span class="material-icons">zoom_in</span>
              Zoom In
            </button>
            <button onclick="window.zoomOut()">
              <span class="material-icons">zoom_out</span>
              Zoom Out
            </button>
            <div class="separator"></div>
            <button onclick="window.downloadPdf()">
              <span class="material-icons">download</span>
              Download
            </button>
            <button onclick="window.printPdf()">
              <span class="material-icons">print</span>
              Print
            </button>
          </div>
          <div class="pdf-viewer">
            <iframe src="${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1&zoom=100" frameborder="0"></iframe>
          </div>
        </div>
      `;

      // Add window functions for toolbar actions
      window.zoomIn = () => {
        const iframe = pdfPreviewArea.querySelector('iframe');
        if (iframe) {
          const currentZoom = parseInt(iframe.src.match(/zoom=(\d+)/)?.[1] || '100');
          const newZoom = Math.min(currentZoom + 25, 200);
          iframe.src = iframe.src.replace(/zoom=\d+/, `zoom=${newZoom}`);
        }
      };

      window.zoomOut = () => {
        const iframe = pdfPreviewArea.querySelector('iframe');
        if (iframe) {
          const currentZoom = parseInt(iframe.src.match(/zoom=(\d+)/)?.[1] || '100');
          const newZoom = Math.max(currentZoom - 25, 50);
          iframe.src = iframe.src.replace(/zoom=\d+/, `zoom=${newZoom}`);
        }
      };

      window.downloadPdf = () => {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = type === 'generated' ? 'tailored-resume.pdf' : 'original-resume.pdf';
        link.click();
      };

      window.printPdf = () => {
        const iframe = pdfPreviewArea.querySelector('iframe');
        if (iframe) {
          iframe.contentWindow.print();
        }
      };

      // Monitor iframe loading
      const iframe = pdfPreviewArea.querySelector('iframe');
      iframe.onload = () => {
        showStatus('PDF preview loaded successfully!', 'success');
      };

      return true;

    } catch (error) {
      showStatus(`Preview generation failed: ${error.message}`, 'error');
      
      // Show error in preview area
      const pdfPreviewArea = document.getElementById('pdfPreviewArea');
      if (pdfPreviewArea) {
        pdfPreviewArea.innerHTML = `
          <div class="error-message">
            <span class="material-icons">error_outline</span>
            <p>Failed to generate preview: ${error.message}</p>
            <button onclick="window.retryPdfPreview()" class="retry-button">
              <span class="material-icons">refresh</span>
              Retry
            </button>
          </div>
        `;
      }
      return false;
    }
  });
}

// Move retry function to window scope
window.retryPdfPreview = async () => {
  try {
    const content = sidebarState.contentType === 'generated' 
    
    if (!content || !content.type || !content.data) {
      throw new Error('Invalid content for retry. Please upload your file again.');
    }
    
    await generatePdfPreview(content, sidebarState.contentType);
  } catch (error) {
    showStatus(error.message, 'error');
  }
};

// Save and restore state using chrome.storage
function saveState() {
  chrome.storage.local.set({ sidebarState });
}

async function restoreState() {
  try {
    const { 
      sidebarState: savedState, 
      tailoredLatex: savedTailoredLatex,
      generatedRawContent: savedGeneratedRawContent
    } = await chrome.storage.local.get([
      'sidebarState', 
      'tailoredLatex',
      'generatedRawContent'
    ]);
    
    if (savedState) {
      // Merge saved state with default state, but don't restore content
      sidebarState = {
        ...sidebarState,
        activeTab: savedState.activeTab || 'resume',
        previewMode: savedState.previewMode || 'text',
        contentType: 'original', // Always start with original content
        selectedModel: savedState.selectedModel || {
          type: 'gemini',
          model: null,
          lastUsed: null
        },
        lastJobDescription: savedState.lastJobDescription || '',
        lastKnowledgeBaseText: savedState.lastKnowledgeBaseText || '',
        uploadedFileName: savedState.uploadedFileName || '',
        isPreviewExpanded: savedState.isPreviewExpanded || false,
        fileType: savedState.fileType || null
      };

      // Update UI elements
      const elements = {
        jobDescInput: document.getElementById('jobDesc'),
        knowledgeBaseText: document.getElementById('knowledgeBaseText'),
        fileNameDisplay: document.getElementById('fileNameDisplay'),
        rawPreview: document.getElementById('rawPreview'),
        compiledPreview: document.getElementById('compiledPreview')
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

      // Show raw preview by default
      if (elements.rawPreview && elements.compiledPreview) {
        elements.rawPreview.style.display = 'block';
        elements.compiledPreview.style.display = 'none';
      }

      // If we have a file type and name, try to load the file
      if (sidebarState.fileType && sidebarState.uploadedFileName) {
        try {
          // Show loading state
          const rawPreview = document.querySelector('.preview-text-content');
          if (rawPreview) {
            rawPreview.innerHTML = '<div class="loading-preview"><div class="loading-spinner"></div><span>Loading file...</span></div>';
          }

          // Create a File object from the saved content
          let file;
          if (sidebarState.fileType === 'latex') {
            // For LaTeX files, create a text file
            const blob = new Blob([savedState.originalContent || ''], { type: 'text/plain' });
            file = new File([blob], sidebarState.uploadedFileName, { type: 'text/plain' });
          } else );
            file = new File([blob], sidebarState.uploadedFileName, { 
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
            });
          }

          if (file) {
            // Use the file upload handler to process the file
            await handleFileUpload(file);
            
            // After successful upload, restore any generated content if it exists
            if (sidebarState.fileType === 'latex' && savedTailoredLatex) {
              tailoredLatex = savedTailoredLatex;
          }
        } catch (error) {
          showToast('Error loading file. Please re-upload manually.', 'error');
        }
      }
    }
  } catch (error) {
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
    showToast('Error updating preview', 'error');
  }
}

// Update the file upload handler
async function handleFileUpload(file) {
  try {
    showUploadingFeedback(file.name);
    showStatus('Reading file...', 'info');

    const fileHandler = new FileHandler();
    const result = await fileHandler.handleFile(file);

    // Set file type attribute on document root
    document.documentElement.setAttribute('data-file-type', result.type);

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
    showFailedUploadFeedback();
    showStatus(`Upload failed: ${error.message}`, 'error');
    throw error;
  }
}

// UI feedback functions
function showToast(message, type = 'info', duration = 5000) {
  const toastContainer = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const toastId = `toast-${Date.now()}`;
  
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

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.style.animation = 'slideOut 0.3s ease forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  });

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

// Server management
function waitForServerManager() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 50;
    const interval = 100;
    
    const check = () => {
      attempts++;
      if (window.ServerManager) {
        resolve(window.ServerManager);
      } else if (attempts > maxAttempts) {
        reject(new Error(`ServerManager not found after ${maxAttempts} attempts`));
      } else {
        setTimeout(check, interval);
      }
    };
    
    check();
  });
}

// Initialization
async function initializeSidepanel() {
  try {
    const serverManager = await waitForServerManager();
    
    if (!window.AIService) {
      throw new Error('AIService not found');
    }
    
    
    aiService = new window.AIService();    
    const elements = setupUIElements();
    setupEventListeners(elements);
    setupPreviewUI();
    setupModelSelector();
    setupApiKeyManagement();
    setupPreviewToggle();
    setupMarkdownSupport();
    
    await restoreState();
    setupGenerateButton();
  } catch (error) {
    showToast('Failed to initialize sidepanel: ' + error.message, 'error');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSidepanel);
} else {
  initializeSidepanel();
}

// Cleanup
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

/**
 * Setup model selector UI
 * Configures the Gemini model selection dropdown
 */
function setupModelSelector() {
  const modelSelect = document.getElementById('modelSelect');
  if (!modelSelect) {
    console.warn('[ModelSelector] Model select element not found');
    return;
  }

  // Clear existing options
  modelSelect.innerHTML = '';

  // Add Gemini option (only option now)
  const geminiOption = document.createElement('option');
  geminiOption.value = 'gemini';
  geminiOption.textContent = 'Gemini 2.5 Flash';
  geminiOption.selected = true;
  modelSelect.appendChild(geminiOption);

  // Add event listener for model selection
  modelSelect.addEventListener('change', (e) => {
    currentModelSelection = {
      type: 'gemini',
      model: null,
      description: 'Gemini 2.5 Flash'
    };

    // Save to state
    sidebarState.selectedModel = currentModelSelection;
    saveState();

    // Show model info in status
    showStatus(`Using ${currentModelSelection.description}`, 'info');
  });

  // Set default selection
  currentModelSelection = {
    type: 'gemini',
    model: null,
    description: 'Gemini 2.5 Flash'
  };
  modelSelect.value = 'gemini';

  // Add info note about Gemini
  const modelSelectContainer = modelSelect.parentElement;
  if (modelSelectContainer) {
    // Remove any existing notes
    const existingNote = modelSelectContainer.querySelector('.model-info-note');
    if (existingNote) {
      existingNote.remove();
    }

    const infoNote = document.createElement('div');
    infoNote.className = 'model-info-note';
    infoNote.innerHTML = '<span class="material-icons info-icon">info</span> Powered by Google Gemini 2.5 Flash';
    infoNote.style.fontSize = '12px';
    infoNote.style.color = '#888';
    infoNote.style.marginTop = '5px';
    infoNote.style.display = 'flex';
    infoNote.style.alignItems = 'center';
    infoNote.style.gap = '5px';
    
    modelSelectContainer.appendChild(infoNote);
  }

  // Log model initialization
  console.log('[ModelSelector] Gemini model initialized:', {
    model: 'gemini-2.0-flash',
    currentSelection: currentModelSelection
  });
}

// Update the tailor function to handle both types
async function generateTailoredContent() {
  try {
    const jobDesc = document.getElementById('jobDesc').value.trim();
    const knowledgeBase = document.getElementById('knowledgeBaseText').value.trim();
    
    if (!jobDesc) {
      throw new Error("Please enter the job description");
    }

    // Determine pipeline based on file type
    let result;
    
    } else if (sidebarState.fileType === 'latex') {
      if (!originalLatex) {
        throw new Error("Please upload a LaTeX file first");
      }
      result = await generateTailoredLatex();
    } else {
      throw new Error("Unsupported file type");
    }

    if (result.success) {
      // Update state based on file type
       else {
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
    showStatus(`Generation failed: ${error.message}`, 'error');
    throw error;
  }
}

// Add this function to update the UI with multi-step process status
function updateGenerationStatus(step, totalSteps, message) {
  const generateBtn = document.getElementById('generateBtn');
  if (!generateBtn) return;
  
  // Update button text with progress
  generateBtn.innerHTML = `
    <div class="loading-spinner"></div>
    <span>Step ${step}/${totalSteps}: ${message}</span>
  `;
  
  // Show toast with status
  showToast(`Step ${step}/${totalSteps}: ${message}`, 'info');
}

// Update generateTailoredLatex with better debugging
async function generateTailoredLatex() {
  try {
    const jobDesc = document.getElementById('jobDesc').value.trim();
    const knowledgeBase = document.getElementById('knowledgeBaseText').value.trim();

    if (!originalLatex) {
      throw new Error('No LaTeX content found');
    }

    // Get the custom prompt from storage
    const { customPrompt } = await chrome.storage.local.get('customPrompt');
    const prompt = customPrompt || DEFAULT_PROMPT;

    // Show status for multi-step process
    updateGenerationStatus(1, 3, 'Analyzing job description and knowledge base');
    
    // Use the new multi-step generation process
    const statusListener = (event) => {
      if (event.detail && event.detail.step) {
        updateGenerationStatus(event.detail.step, event.detail.totalSteps, event.detail.message);
      }
    };
    
    // Add the event listener
    document.addEventListener('aiServiceStatus', statusListener);
    
    try {
      // Use the new multi-step generation method
      const tailoredContent = await aiService.generateTailoredResume(
        originalLatex,
        jobDesc,
        knowledgeBase,
        currentModelSelection.type,
        currentModelSelection.model
      );

      return {
        success: true,
        content: tailoredContent,
        type: 'latex'
      };
    } finally {
      // Remove the event listener
      document.removeEventListener('aiServiceStatus', statusListener);
    }

  } catch (error) {
    return {
      success: false,
      error: error.message,
      type: 'latex'
    };
  }
}


// Update the setupApiKeyManagement function
function setupApiKeyManagement() {
  const modal = document.getElementById('settingsModal');
  const openBtn = document.getElementById('openSettings');
  const closeBtn = document.querySelector('.close-modal');
  const saveBtn = document.getElementById('saveApiKeys');
  const geminiInput = document.getElementById('geminiApiKey');
  const promptInput = document.getElementById('customPrompt');
  const jobAnalysisPromptInput = document.getElementById('jobAnalysisPrompt');
  const projectsOptimizationPromptInput = document.getElementById('projectsOptimizationPrompt');
  const skillsEnhancementPromptInput = document.getElementById('skillsEnhancementPrompt');
  const experienceRefinementPromptInput = document.getElementById('experienceRefinementPrompt');
  const finalPolishPromptInput = document.getElementById('finalPolishPrompt');
  const resetMultiAgentPromptsBtn = document.getElementById('resetMultiAgentPrompts');

  // Load saved settings
  chrome.storage.local.get([
    'geminiApiKey', 
    'customPrompt', 
    'jobAnalysisPrompt',
    'projectsOptimizationPrompt',
    'skillsEnhancementPrompt',
    'experienceRefinementPrompt',
    'finalPolishPrompt'
  ], (result) => {
    // Set API key
    if (result.geminiApiKey) geminiInput.value = result.geminiApiKey;

    // Set prompts only if they exist in storage (not empty)
    if (result.customPrompt) promptInput.value = result.customPrompt;
        if (result.jobAnalysisPrompt) jobAnalysisPromptInput.value = result.jobAnalysisPrompt;
    if (result.projectsOptimizationPrompt) projectsOptimizationPromptInput.value = result.projectsOptimizationPrompt;
    if (result.skillsEnhancementPrompt) skillsEnhancementPromptInput.value = result.skillsEnhancementPrompt;
    if (result.experienceRefinementPrompt) experienceRefinementPromptInput.value = result.experienceRefinementPrompt;
    if (result.finalPolishPrompt) finalPolishPromptInput.value = result.finalPolishPrompt;
  });

  // Reset prompts with animation
  document.getElementById('resetPrompt').addEventListener('click', () => {
    promptInput.style.opacity = '0';
    setTimeout(() => {
      promptInput.value = ''; // Clear to use default
      promptInput.style.opacity = '1';
    }, 200);
    showToast('LaTeX prompt reset to default', 'info');
  });

  // Reset multi-agent prompts
  resetMultiAgentPromptsBtn.addEventListener('click', () => {
    const prompts = [
      { input: jobAnalysisPromptInput },
      { input: projectsOptimizationPromptInput },
      { input: skillsEnhancementPromptInput },
      { input: experienceRefinementPromptInput },
      { input: finalPolishPromptInput }
    ];
    
    prompts.forEach(prompt => {
      prompt.input.style.opacity = '0';
      setTimeout(() => {
        prompt.input.value = ''; // Clear to use default
        prompt.input.style.opacity = '1';
      }, 200);
    });
    
    showToast('Multi-agent prompts reset to default', 'info');
  });

  // Save settings with validation and feedback
  saveBtn.addEventListener('click', async () => {
    try {
      // Show saving state
      saveBtn.disabled = true;
      saveBtn.innerHTML = `
        <div class="loading-spinner"></div>
        <span>Saving...</span>
      `;

      // Get all values
      const settings = {
        geminiApiKey: geminiInput.value.trim()
      };

      // Only save non-empty prompts
      if (promptInput.value.trim()) settings.customPrompt = promptInput.value.trim();
            if (jobAnalysisPromptInput.value.trim()) settings.jobAnalysisPrompt = jobAnalysisPromptInput.value.trim();
      if (projectsOptimizationPromptInput.value.trim()) settings.projectsOptimizationPrompt = projectsOptimizationPromptInput.value.trim();
      if (skillsEnhancementPromptInput.value.trim()) settings.skillsEnhancementPrompt = skillsEnhancementPromptInput.value.trim();
      if (experienceRefinementPromptInput.value.trim()) settings.experienceRefinementPrompt = experienceRefinementPromptInput.value.trim();
      if (finalPolishPromptInput.value.trim()) settings.finalPolishPrompt = finalPolishPromptInput.value.trim();

      // Validate required fields
      if (!settings.geminiApiKey) {
        throw new Error('Please enter your Gemini API key');
      }

      // Save to Chrome storage
      await chrome.storage.local.set(settings);

      // Reinitialize services with new settings
      if (window.AIService) {
        aiService = new window.AIService();
      }

      showToast('Settings saved successfully!', 'success');
      closeModal();

    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      // Reset button state
      saveBtn.disabled = false;
      saveBtn.innerHTML = 'Save Settings';
    }
  });

  // Modal controls
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
}

// Update the preview toggle handling
function setupPreviewToggle() {
  const toggleButtons = document.querySelectorAll('.preview-toggle-btn');
  const rawPreview = document.getElementById('rawPreview');
  const compiledPreview = document.getElementById('compiledPreview');

  const updateCompileButtonState = () => {
    const compileButton = document.querySelector('.preview-toggle-btn[data-view="compiled"]');
    if (compileButton) {
  };

  toggleButtons.forEach(button => {
    button.addEventListener('click', async () => {
      if (requestTracker.isProcessing) {
        console.log('[Preview] Update in progress, ignoring click');
        return;
      }

      // Don't process click if button is disabled
      if (button.disabled) {
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
        // Only handle compilation view for LaTeX files
        if (sidebarState.fileType === 'latex') {
          rawPreview.style.display = 'none';
          compiledPreview.style.display = 'block';
          
          // Get the appropriate LaTeX content
          const content = sidebarState.contentType === 'generated' ? tailoredLatex : originalLatex;
          
          console.log('[Preview] Preparing LaTeX content for compilation:', {
            hasContent: !!content,
            contentType: sidebarState.contentType,
            contentLength: content?.length,
            isGenerated: sidebarState.contentType === 'generated'
          });

          if (content) {
            showStatus('Compiling LaTeX...', 'info');
            await generateLatexPreview(content);
          } else {
            console.error('[Preview] No LaTeX content available for compilation');
            showStatus('No content available for compilation', 'error');
          }
        } else {
          compiledPreview.innerHTML = `
            <div class="info-message">
              <span class="material-icons">info</span>
            </div>
          `;
        }
      }
    });
  });

  // Call initially and whenever file type changes
  updateCompileButtonState();
  
  // Update button state when file type changes
  const observer = new MutationObserver(() => {
    updateCompileButtonState();
  });
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-file-type']
  });
}

// Update the generateLatexPreview function to handle compilation properly
async function generateLatexPreview(content) {
  try {
    console.log('[LatexPreview] Starting LaTeX compilation:', {
      hasContent: !!content,
      contentLength: content?.length,
      contentType: sidebarState.contentType
    });

    const pdfPreviewArea = document.getElementById('pdfPreviewArea');
    if (!pdfPreviewArea) {
      throw new Error('PDF preview area not found');
    }

    // Show loading state
    pdfPreviewArea.innerHTML = `
      <div class="loading-preview">
        <div class="loading-spinner"></div>
        <span>Compiling LaTeX to PDF...</span>
      </div>
    `;

    // Clean and validate the LaTeX content
    const cleanedContent = content.trim();
    
    console.log('[LatexPreview] Validating LaTeX content:', {
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
      console.error('[LatexPreview] Compilation error:', errorData);
      throw new Error(errorData.error || 'LaTeX compilation failed');
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

    // Create URL and setup viewer
    if (window.lastPdfUrl) {
      URL.revokeObjectURL(window.lastPdfUrl);
    }
    window.lastPdfUrl = URL.createObjectURL(pdfBlob);

    // Create PDF viewer with toolbar
    pdfPreviewArea.innerHTML = `
      <div class="pdf-container">
        <div class="pdf-toolbar">
          <button onclick="window.zoomIn()">
            <span class="material-icons">zoom_in</span>
            Zoom In
          </button>
          <button onclick="window.zoomOut()">
            <span class="material-icons">zoom_out</span>
            Zoom Out
          </button>
          <div class="separator"></div>
          <button onclick="window.downloadPdf()">
            <span class="material-icons">download</span>
            Download
          </button>
          <button onclick="window.printPdf()">
            <span class="material-icons">print</span>
            Print
          </button>
        </div>
        <div class="pdf-viewer">
          <iframe src="${window.lastPdfUrl}#toolbar=1&navpanes=1&scrollbar=1&zoom=100" frameborder="0"></iframe>
        </div>
      </div>
    `;

    // Monitor iframe loading
    const iframe = pdfPreviewArea.querySelector('iframe');
    iframe.onload = () => {
      console.log('[LatexPreview] PDF viewer loaded successfully');
      showStatus('PDF compilation complete', 'success');
    };

    iframe.onerror = (error) => {
      console.error('[LatexPreview] PDF iframe loading error:', error);
      throw new Error('Failed to load PDF preview');
    };

    return true;
  } catch (error) {
    console.error('[LatexPreview] Error:', error);
    showStatus(`LaTeX compilation failed: ${error.message}`, 'error');
    
    // Show error in preview area
    if (pdfPreviewArea) {
      pdfPreviewArea.innerHTML = `
        <div class="error-message">
          <span class="material-icons">error_outline</span>
          <p>Failed to compile LaTeX: ${error.message}</p>
          <button onclick="window.retryLatexCompilation()" class="retry-button">
            <span class="material-icons">refresh</span>
            Retry Compilation
          </button>
        </div>
      `;
    }
    return false;
  }
}

// Add retry function for LaTeX compilation
window.retryLatexCompilation = async () => {
  const content = sidebarState.contentType === 'generated' ? tailoredLatex : originalLatex;
  if (content) {
    await generateLatexPreview(content);
  } else {
    showStatus('No content available for compilation', 'error');
  }
};

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
      background: var(--bg-secondary);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
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
      background: var(--bg-primary);
      border: none;
    }

    .preview-content {
      flex: 1;
      position: relative;
      height: 100%;
      min-height: 500px;
      overflow: hidden;
      background: var(--surface-dark);
      border-radius: var(--radius-md);
      margin: var(--spacing-md);
    }

    .preview-view {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      border-radius: var(--radius-md);
    }

    #rawPreview {
      background-color: var(--surface-dark);
      color: var(--text-primary);
      padding: var(--spacing-lg);
    }

    .preview-text-content {
      font-family: 'Ubuntu Mono', monospace;
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
      color: var(--text-primary);
    }

    #compiledPreview {
      background: var(--bg-primary);
    }

      width: 100%;
      height: 100%;
      min-height: inherit;
      display: flex;
      flex-direction: column;
      background: var(--bg-primary);
    }

      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: var(--surface-dark);
      border-bottom: 1px solid var(--border-color);
    }

      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all var(--transition-speed) ease;
    }

      background: var(--accent-primary);
      color: var(--text-primary);
    }

      width: 100%;
      height: 100%;
      border: none;
      background: var(--bg-primary);
    }

      flex: 1;
      overflow: auto;
      padding: var(--spacing-md);
      background: white;
    }

      width: 100%;
      height: 100%;
      border: 1px solid var(--border-color);
      background: white;
    }

    /* Loading and error states */
    .loading-preview,
    .error-message,
    .info-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: var(--spacing-lg);
      text-align: center;
      gap: var(--spacing-md);
      background: var(--surface-dark);
      border-radius: var(--radius-md);
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border-color);
      border-top: 3px solid var(--accent-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .error-message {
      color: var(--error-color);
    }

    .error-message .material-icons {
      font-size: 48px;
      color: var(--error-color);
    }

    .info-message {
      color: var(--text-secondary);
    }

    .info-message .material-icons {
      font-size: 48px;
      color: var(--accent-primary);
    }

    .retry-button {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-sm) var(--spacing-md);
      background: var(--accent-primary);
      color: var(--text-primary);
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-speed) ease;
    }

    .retry-button:hover {
      background: var(--accent-tertiary);
      transform: translateY(-2px);
    }

    /* Preview transitions */
    .preview-text-content,
    #rawPreview,
    #compiledPreview {
      transition: opacity var(--transition-speed) ease;
    }

    /* Loading preview styles */
    .loading-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      padding: var(--spacing-lg);
      text-align: center;
      background: var(--surface-dark);
      border-radius: var(--radius-md);
    }

    .loading-preview .loading-spinner {
      width: 40px;
      height: 40px;
      margin-bottom: var(--spacing-md);
    }

    /* Animation keyframes */
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

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

// Add this function to validate current state
function validateCurrentState() {
  const state = {
    fileType: sidebarState.fileType,
    hasOriginalLatex: !!originalLatex,
    contentType: sidebarState.contentType,

  console.log('[State] Current state validation:', state);
  return state;
}

// Update handleGenerateClick function to properly handle file types
async function handleGenerateClick() {
  const generateBtn = document.getElementById('generateBtn');
  const originalBtnContent = generateBtn.innerHTML;

  try {
    console.log('[Generate] Starting generation process:', {
      fileType: sidebarState.fileType,
      contentType: sidebarState.contentType,
      hasOriginalLatex: !!originalLatex,
      currentState: {
        ...sidebarState,
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

    // Generate content based on file type
    let result;
    
      
      }
      
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
      hasContent: !!result.content,
      contentLength: result.content?.length,
      error: result.error
    });

    if (!result.success) {
      throw new Error(result.error || 'Generation failed');
    }

    // Update state with LaTeX content
    tailoredLatex = result.content;
    sidebarState.tailoredContent = result.content;
    console.log('[Generate] Updated LaTeX state:', {
      hasLatex: !!tailoredLatex,
      contentLength: result.content?.length
    });

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

/**
 * Setup markdown preview support for job description and knowledge base
 */
function setupMarkdownSupport() {
  const previewButtons = document.querySelectorAll('.preview-toggle-markdown');
  
  previewButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.target;
      const textarea = document.getElementById(targetId);
      const preview = document.getElementById(targetId + 'Preview');
      
      if (!textarea || !preview) return;
      
      // Toggle preview
      if (preview.style.display === 'none') {
        // Show preview
        const markdown = textarea.value;
        const html = window.MarkdownParser.toHTML(markdown);
        preview.innerHTML = html;
        preview.style.display = 'block';
        textarea.style.display = 'none';
        button.innerHTML = '<span class="material-icons">edit</span><span>Edit</span>';
      } else {
        // Show editor
        preview.style.display = 'none';
        textarea.style.display = 'block';
        button.innerHTML = '<span class="material-icons">visibility</span><span>Preview</span>';
      }
    });
  });
  
  console.log('[MarkdownSupport] Markdown preview initialized');
}


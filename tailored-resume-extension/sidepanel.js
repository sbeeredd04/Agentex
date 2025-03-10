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

let sidebarState = {
  activeTab: 'resume',
  previewMode: 'text',
  lastJobDescription: '',
  isPreviewExpanded: false
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

  // File upload listener
  if (elements.latexFileInput) {
    elements.latexFileInput.addEventListener('change', async (event) => {
      console.log('File input change detected');
      const file = event.target.files[0];
      await handleFileUpload(file);
    });
  }
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
    const currentLatex = tailoredLatex || originalLatex;
    const isShowingPdf = pdfPreviewArea.style.display !== 'none';
    if (isShowingPdf) {
      // Switch to text (code) view
      previewArea.style.display = 'block';
      pdfPreviewArea.style.display = 'none';
      toggleButton.innerHTML = '<span class="material-icons">visibility</span>';
      toggleButton.title = 'Show PDF Preview';
    } else {
      // Switch to PDF view
      if (!currentLatex) {
        console.warn('No LaTeX content available');
        showStatus('No content to preview', 'error');
      return;
    }
      showStatus('Generating PDF preview...', 'info');
      const success = await generatePdfPreview(currentLatex);
      if (success) {
        previewArea.style.display = 'none';
        pdfPreviewArea.style.display = 'block';
        toggleButton.innerHTML = '<span class="material-icons">code</span>';
        toggleButton.title = 'Show LaTeX Code';
      }
    }
  });
  console.log('Preview UI setup complete');
}

// Function to generate PDF preview from LaTeX content
async function generatePdfPreview(latex, type = 'original') {
  const filename = currentFile ? currentFile.name : 'resume.tex';
  console.log('[Preview] Generating PDF preview for', filename, 'Content length:', latex.length);
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
  if (savedState) {
    sidebarState = savedState;
    const jobDescInput = document.getElementById('jobDesc');
    if (sidebarState.lastJobDescription) {
      jobDescInput.value = sidebarState.lastJobDescription;
    }
    await updatePreview(sidebarState.previewMode);
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

// Event Listener for the "Tailor Resume" Button
document.getElementById('tailorBtn').addEventListener('click', async () => {
  const jobDesc = document.getElementById('jobDesc').value.trim();
    
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
        <span>Generating...</span>
      `;
      showStatus("Generating tailored resume...", 'success');
      
      // Construct the prompt
      const prompt = `
            Act as an expert ATS optimization specialist for software engineering roles. Analyze the job description(JD) and resume with these strict requirements:

            1. **Keyword Mapping Protocol**:
            - Extract 15-18 hard skills/technologies from JD (prioritize: languages > frameworks > tools)
            - Identify 6-8 action verbs from Identify 5-8 soft skills/action verbs from "led", "engineered", "optimized", "developed", "integrated"
            - Map these keywords to existing resume content using semantic matching
            - Map using semantic matching with 85% similarity threshold for technical terms

            2. **Dynamic Knowledge Base Integration**:
            ${storage.knowledgeBase.size > 0 ? `
            - Compare knowledge base items [${Array.from(storage.knowledgeBase).join(', ')}] against JD requirements
            - REPLACE existing resume content ONLY if:
                * Knowledge base item has ≥2 more JD keywords
                * Demonstrates 25%+ better metric impact
                * Technical stack has direct JD toolchain overlap
                * Knowledge base item is more relevant to the JD than the existing resume content` : ''}

            3. **Experience Section Optimization**:
            - For each role:
                - Tailor the bullet points to the JD requirements (Do not generate fake bullet points, only generate if the role is closely related to the JD)
                - Quantify achievements using \textbf{metrics} from JD requirements
                - Convert to active voice: "Engineered X using Y to achieve Z"
                - Highlight relevant words and important information using \emph{...} and \textbf{...} formatting

            4. **Project Section Tailoring**:
            - Add 1-2 JD-specific technologies to project descriptions by adjusting the bullet points ONLY if the project is closely related to the JD
            - Structure bullet points as:
                "\\resumeItem{\\textbf{JD Keyword} used to \\textbf{Action Verb} \\emph{Tech Stack} resulting in \\textbf{Metric}}"
            - Replace weakest project if knowledge base has better match (≥2 more keywords)
            - Highlight relevant words and important information using \emph{...} and \textbf{...} formatting


            5. **Technical Skills Optimization**:
            - Append missing JD-required skills to existing categories
            - Replace bottom 15% of existing skills with JD priorities using this hierarchy:
                1. Direct toolchain matches (TensorFlow → PyTorch)
                2. Conceptual equivalents (RNN → CNN if JD specifies)
                3. Broader categories (Python → ML Pipelines)
            - If the JD requires a closely related skill that is not in the existing resume, add it to the resume.

            6. **Content Tailoring Rules**:
            - Preserve LaTeX structure EXACTLY - only modify text within \resumeItem{}
            - "Achieved [X] using [JD Keyword] through [Y] resulting in [Z metric]"
            - Boost keyword density to 18-22% without stuffing
            - Show strong leadership skills and experience in the resume and really tailor the resume to the JD can change the bullet points to be more relevant to the JD.
            - FOCUS ON TAILORING TO THE JD LOOK AT THE JD AND THE RESUME AND MAKE THE RESUME LOOK LIKE IT IS FOR THE JD (JD ACTION VERBS AND KEYWORDS AND JD REQUIREMENTS).

            7. **ATS Compliance**:
            - Maintain original font/style/color EXCEPT for (NEVER CHANGE THE STRUCUTRE OF THE RESUME like spacing between lines, font size, font type, font color, etc.):
                - Dates: \textit{MM/YYYY} formatting
                - Links: \\href{}{} commands
            - ALWAYS Ensure 1-page length not too many bullet points or words in the bullet points. Use very simple vocabulary and language while maintaining the original context and details.
            - Preserve as much of the context and details as possible to know exactly what I did in the role or project.

            Job Description: ${jobDesc}

            Original Resume (LaTeX):
            ${originalLatex}

            Respond ONLY with updated entire LaTeX code maintaining:
            \\resumeItem{\\textbf{...} ...} structure |
            \\textbf{} for metrics/JD keywords |
            \\emph{} for stacks
            `.trim();

      console.log('[AI Input] Sending prompt to AI:', {
        jobDescription: jobDesc,
        originalLatexLength: originalLatex.length,
        originalLatexPreview: originalLatex.substring(0, 200) + '...',
        fullPrompt: prompt
      });

      // Generate tailored content
      let generatedContent = await aiService.generateContent(prompt);
      
      console.log('[AI Output] Received response from AI:', {
        generatedContentLength: generatedContent.length,
        generatedContentPreview: generatedContent.substring(0, 200) + '...',
        isDifferent: generatedContent !== originalLatex
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
          originalFilename: currentFile?.name || 'resume.tex'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save generated resume');
      }

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
      showStatus("Resume tailored successfully!", 'success');

    } catch (error) {
      console.error("Error tailoring resume:", error);
      showStatus("An error occurred while tailoring the resume: " + error.message, 'error');
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
  const previewArea = document.getElementById('previewArea');
  const pdfPreviewArea = document.getElementById('pdfPreviewArea');

  if (mode === 'text') {
    previewArea.style.display = 'block';
    pdfPreviewArea.style.display = 'none';
  } else if (mode === 'pdf') {
    previewArea.style.display = 'none';
    pdfPreviewArea.style.display = 'block';
  }
}
// Add debugging at the start of the file
console.log('Initializing popup.js');

// Initialize services and UI state
let storage, aiService, fileManager;
let originalLatex = null;
let tailoredLatex = null;
let originalCoverLetter = null;
let tailoredCoverLetter = null;
let currentPdfUrl = null;
let currentJobTitle = null;
let currentFile = null;  // Track the current file being processed

// Add state persistence
let sidebarState = {
  activeTab: 'resume',
  previewMode: 'text',
  lastJobDescription: '',
  isPreviewExpanded: false
};

// Add showStatus function at the top
function showStatus(message, type = 'info') {
  console.log(`Status: ${message} (${type})`);
  const statusDiv = document.getElementById('status');
  if (statusDiv) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
}

// Initialize UI elements
async function initializeUI() {
  try {
    // Select UI elements from the DOM
    const resumeList = document.getElementById('resumeList');
    const coverLetterList = document.getElementById('coverLetterList');
    const knowledgeTags = document.getElementById('knowledgeTags');
    const latexFileInput = document.getElementById('latexFile');
    const coverLetterFileInput = document.getElementById('coverLetterFile');
    
    // Set up event listeners and UI controls
    setupEventListeners();
    // Load any saved data
    const savedData = await storage.loadSavedData();
    if (savedData) {
      // Initialize with saved data
      originalLatex = savedData.originalLatex || null;
      tailoredLatex = savedData.tailoredLatex || null;
      originalCoverLetter = savedData.originalCoverLetter || null;
      tailoredCoverLetter = savedData.tailoredCoverLetter || null;
      currentJobTitle = savedData.currentJobTitle || null;
    }
    
    // Display saved resumes and cover letters
    await displayResumes();
    await displayCoverLetters();
    displayKnowledgeTags();
    
    console.log('UI initialized successfully');
  } catch (error) {
    console.error('Error initializing UI:', error);
    throw error;
  }
}

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM Content Loaded');
  
  try {
    console.log('Checking for required global services...');
    
    // Check for required services
    if (!window.StorageManager) {
      throw new Error('StorageManager not found');
    }
    if (!window.AIService) {
      throw new Error('AIService not found');
    }
    if (!window.FileManager) {
      throw new Error('FileManager not found');
    }
    if (!window.config || !window.config.GEMINI_API_KEY) {
      throw new Error('Config or API key not found');
    }
    
    console.log('Initializing services');
    storage = new window.StorageManager();
    aiService = new window.AIService(window.config.GEMINI_API_KEY);
    fileManager = new window.FileManager();
    
    // Initialize folders
    console.log('Initializing folder structure');
    await fileManager.initializeFolders();
    
    console.log('Services and folders initialized successfully');
    
    // Initialize UI elements
    await initializeUI();
  } catch (error) {
    console.error('Error initializing services:', error);
    showStatus('Failed to initialize application services: ' + error.message, 'error');
  }
});

// Add cleanup on window unload
window.addEventListener('unload', async () => {
  if (fileManager) {
    try {
      await fileManager.cleanupTemp();
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
    }
  }
});

function initializeUI() {
  // Select UI elements from the DOM
  const latexFileInput = document.getElementById('latexFile');
  const jobDescInput = document.getElementById('jobDesc');
  const tailorBtn = document.getElementById('tailorBtn');
  const previewBtn = document.getElementById('previewBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const previewArea = document.getElementById('previewArea');
  const pdfPreviewArea = document.getElementById('pdfPreviewArea');
  const togglePreviewBtn = document.getElementById('togglePreviewBtn');
  const resumeTab = document.getElementById('resumeTab');
  const coverLetterTab = document.getElementById('coverLetterTab');
  const resumeList = document.getElementById('resumeList');

  // Variables to hold the content of documents and their tailored versions
  let pdfUrl = null;
  let isUploading = false;
  let currentTemplate = null;
  let currentOriginalFileId = null;
  let currentGeneratedFileId = null;

  // Set up tab switching
  resumeTab.addEventListener('click', () => switchTab('resume'));
  coverLetterTab.addEventListener('click', () => switchTab('coverLetter'));

  // Update preview handling
  async function updatePreview(type = 'original') {
    console.log('Updating preview:', { type });
    
    const content = type === 'original' ? originalLatex : tailoredLatex;
    
    if (!content) {
      console.log(`No ${type} content available`);
      showStatus(`No ${type} content available`, 'error');
      return;
    }

    // Update preview type radio buttons safely
    const originalRadio = document.querySelector('input[value="original"]');
    const generatedRadio = document.querySelector('input[value="generated"]');
    
    if (originalRadio) {
      originalRadio.checked = type === 'original';
    }
    if (generatedRadio) {
      generatedRadio.checked = type === 'generated';
      generatedRadio.disabled = !tailoredLatex;
    }

    const previewArea = document.getElementById('previewArea');
    const pdfPreviewArea = document.getElementById('pdfPreviewArea');

    if (!previewArea || !pdfPreviewArea) {
      console.error('Preview areas not found');
      return;
    }

    const isTextMode = previewArea.style.display !== 'none';
    if (isTextMode) {
      previewArea.textContent = content;
      if (window.hljs) {
        previewArea.innerHTML = window.hljs.highlight('latex', content).value;
      }
    } else {
      try {
        if (currentPdfUrl) {
          cleanupPdfUrl(currentPdfUrl);
        }
        await generatePdfPreview(content, type);
      } catch (error) {
        console.error('Preview error:', error);
        showStatus(`Failed to preview ${type} content`, 'error');
        previewArea.style.display = 'block';
        pdfPreviewArea.style.display = 'none';
        previewArea.textContent = content;
      }
    }
  }

  // Add preview controls to the UI
  function setupPreviewControls() {
    console.log('Setting up preview controls');
    
    const previewControls = document.createElement('div');
    previewControls.className = 'preview-controls';
    previewControls.innerHTML = `
      <div class="preview-mode-toggle">
        <button id="togglePreviewMode" class="icon-button" title="Toggle Preview Mode">
          <span class="material-icons">visibility</span>
        </button>
      </div>
    `;
    
    // Insert controls before preview area
    previewArea.parentNode.insertBefore(previewControls, previewArea);
    
    // Set up event listeners
    const previewTypeInputs = previewControls.querySelectorAll('input[name="previewType"]');
    previewTypeInputs.forEach(input => {
      input.addEventListener('change', async (e) => {
        console.log('Preview type changed:', e.target.value);
        await updatePreview(e.target.value);
      });
    });
    
    const togglePreviewMode = previewControls.querySelector('#togglePreviewMode');
    togglePreviewMode.addEventListener('click', async () => {
      console.log('Toggle preview mode clicked');
      const isTextMode = previewArea.style.display !== 'none';
      
      if (isTextMode) {
        // Switch to PDF mode
        const currentType = document.querySelector('input[name="previewType"]:checked').value;
        const success = await generatePdfPreview(currentType === 'original' ? originalLatex : tailoredLatex);
        if (success) {
          previewArea.style.display = 'none';
          pdfPreviewArea.style.display = 'block';
          togglePreviewMode.innerHTML = '<span class="material-icons">code</span>';
        }
      } else {
        // Switch to text mode
        previewArea.style.display = 'block';
        pdfPreviewArea.style.display = 'none';
        togglePreviewMode.innerHTML = '<span class="material-icons">visibility</span>';
        await updatePreview(document.querySelector('input[name="previewType"]:checked').value);
      }
    });
  }

  // Call setup in the initialization
  setupPreviewControls();

  // File upload handling with debugging
  async function handleFileUpload(file) {
    console.log('[Upload] Starting file upload:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    if (!file) {
      console.log('No file selected');
      return;
    }

    try {
      isUploading = true;
      currentFile = file;  // Store the current file
      showStatus('Reading file...', 'info');
      showUploadingFeedback(file.name);

      const content = await readFileContent(file);
      console.log('[Upload] File content read:', {
        contentLength: content.length,
        filename: file.name,
        firstChars: content.substring(0, 100)
      });

      // First save the file to the server
      const saveResponse = await fetch('http://localhost:3000/save-original', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latex: content,
          filename: file.name
        })
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save file on server');
      }

      const saveResult = await saveResponse.json();
      console.log('[Upload] File saved on server:', saveResult);

      // Store the original LaTeX
      originalLatex = content;
      console.log('[Upload] Original LaTeX stored:', {
        filename: file.name,
        savedPath: saveResult.path
      });

      // Update preview area
      if (previewArea) {
        previewArea.textContent = content;
      }

      // Enable controls
      if (previewBtn) {
        previewBtn.disabled = false;
      }

      // Update radio buttons
      const originalRadio = document.querySelector('input[value="original"]');
      if (originalRadio) {
        originalRadio.checked = true;
        console.log('Original preview radio enabled');
      }

      showSuccessfulUploadFeedback(file.name);
      showStatus('File uploaded successfully!', 'success');
      console.log('[Upload] Process completed successfully');

    } catch (error) {
      console.error('[Upload] Error:', error);
      showStatus('Failed to upload file: ' + error.message, 'error');
      showFailedUploadFeedback();
    } finally {
      isUploading = false;
    }
  }

  // File input event listener
  latexFileInput.addEventListener('change', async (event) => {
    console.log('File input change detected');
    const file = event.target.files[0];
    await handleFileUpload(file);
  });

  // Helper function to read file content
  function readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        console.log('FileReader onload triggered');
        try {
          const content = e.target.result;
          console.log('File content read successfully, length:', content.length);
          resolve(content);
        } catch (error) {
          console.error('Error in FileReader onload:', error);
          reject(error);
        }
      };
      
      reader.onerror = (e) => {
        console.error('Error reading file:', e);
        reject(new Error('Failed to read file'));
      };

      console.log('Starting FileReader.readAsText');
      reader.readAsText(file);
    });
  }

  /**
   * UI feedback functions
   */
  function showUploadingFeedback(fileName) {
    console.log('Showing upload feedback for:', fileName);
    const display = document.getElementById('fileNameDisplay');
    if (!display) {
      console.error('fileNameDisplay element not found');
      return;
    }

    display.innerHTML = `
      <div class="file-upload-feedback uploading">
        <div class="loading-spinner"></div>
        <span class="material-icons">sync</span>
        <span>${fileName}</span>
      </div>
    `;
  }

  function showSuccessfulUploadFeedback(fileName) {
    console.log('Showing success feedback for:', fileName);
    const display = document.getElementById('fileNameDisplay');
    if (!display) {
      console.error('fileNameDisplay element not found');
      return;
    }

    display.innerHTML = `
      <div class="file-upload-feedback success">
        <span class="material-icons">check_circle</span>
        <span>${fileName}</span>
      </div>
    `;
  }

  function showFailedUploadFeedback() {
    console.log('Showing failed upload feedback');
    const display = document.getElementById('fileNameDisplay');
    if (!display) {
      console.error('fileNameDisplay element not found');
      return;
    }

    display.innerHTML = `
      <div class="file-upload-feedback error">
        <span class="material-icons">error</span>
        <span>Upload failed</span>
      </div>
    `;
  }


  // Resume Management Functions
  async function displayResumes() {
    resumeList.innerHTML = '';
    
    if (storage.resumes.size === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-message';
      emptyMessage.textContent = 'No saved templates. Upload a LaTeX resume to get started.';
      resumeList.appendChild(emptyMessage);
      return;
    }

    for (const [name, data] of storage.resumes.entries()) {
      const card = document.createElement('div');
      card.className = `resume-card ${data.isDefault ? 'active' : ''}`;
      
      // Use dataset for storing name to avoid issues with quotes
      card.dataset.name = name;
      card.innerHTML = `
        <h4>${name}</h4>
        <p>Last modified: ${new Date(data.timestamp).toLocaleDateString()}</p>
        <div class="card-actions">
          <button class="icon-button set-default" title="Set as default">
            <span class="material-icons">${data.isDefault ? 'star' : 'star_outline'}</span>
          </button>
          <button class="icon-button delete-resume" title="Delete">
            <span class="material-icons">delete</span>
          </button>
        </div>
      `;
      
      // Add event listeners
      card.addEventListener('click', (e) => {
        // Avoid triggering when clicking buttons
        if (!e.target.closest('button')) {
          loadResume(name);
        }
      });
      
      // Add button event listeners after appending to DOM
      resumeList.appendChild(card);
      
      // Set up button listeners
      const setDefaultBtn = card.querySelector('.set-default');
      const deleteBtn = card.querySelector('.delete-resume');
      
      setDefaultBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setDefaultResume(name);
      });
      
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteResume(name);
      });
    }

    const templateSelect = document.createElement('select');
    templateSelect.id = 'templateSelect';
    templateSelect.className = 'template-select';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a template...';
    templateSelect.appendChild(defaultOption);
    
    // Add saved templates
    for (const [name, latex] of storage.resumes) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      if (storage.defaultResume === name) {
        option.textContent += ' (Default)';
      }
      templateSelect.appendChild(option);
    }
    
    // Handle template selection
    templateSelect.addEventListener('change', async (e) => {
      const selectedTemplate = e.target.value;
      if (selectedTemplate) {
        originalLatex = storage.resumes.get(selectedTemplate);
        previewArea.textContent = originalLatex;
        currentTemplate = selectedTemplate;
        showStatus(`Loaded template: ${selectedTemplate}`, 'success');
      }
    });
    
    // Insert before the file input
    const container = latexFileInput.parentElement;
    container.insertBefore(templateSelect, latexFileInput);
  }

  /**
   * Event Listener for the "Tailor Resume" Button
   */
  tailorBtn.addEventListener('click', async () => {
    const jobDesc = jobDescInput.value.trim();
    
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
        knowledgeBase: Array.from(storage.knowledgeBase),
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
      if (tailorBtn) {
        tailorBtn.disabled = false;
        tailorBtn.innerHTML = `
          <span class="material-icons">auto_awesome</span> Generate Tailored Resume
        `;
      }
    }
  });

  
  /**
   * Event Listener for the "Preview PDF" Buttons
   */
  previewBtn.addEventListener('click', async () => {
    if (!tailoredLatex) {
      showStatus("No tailored resume to preview", 'error');
      return;
    }
    
    try {
      showStatus("Generating PDF preview...", 'success');
      
      // Call local LaTeX compiler service
      const response = await fetch('http://localhost:3000/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ latex: tailoredLatex })
      });
      
      if (!response.ok) {
        throw new Error("PDF preview generation failed");
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Show PDF preview using the returned URL
        pdfPreviewArea.innerHTML = `<iframe src="${data.pdfUrl}"></iframe>`;
        previewArea.style.display = 'none';
        pdfPreviewArea.style.display = 'block';
        togglePreviewBtn.innerHTML = '<span class="material-icons">code</span>';
        showStatus("PDF preview generated successfully!", 'success');
        
        // Update preview controls
        updatePreviewTypeControls(true);
        
        // Enable generated preview option
        const generatedRadio = document.querySelector('input[value="generated"]');
        if (generatedRadio) {
          generatedRadio.disabled = false;
        }
      } else {
        throw new Error(data.error || "PDF generation failed");
      }
    } catch (error) {
      console.error("Error generating PDF preview:", error);
      showStatus("Could not generate PDF preview", 'error');
      pdfPreviewArea.style.display = 'none';
      previewArea.style.display = 'block';
    }
  });

  /**
   * Toggle between code and PDF preview
   */
  togglePreviewBtn.addEventListener('click', async () => {
    console.log('Toggle preview clicked');
    console.log('Current state:', {
      previewAreaDisplay: previewArea.style.display,
      pdfPreviewAreaDisplay: pdfPreviewArea.style.display,
      hasOriginalLatex: !!originalLatex,
      hasTailoredLatex: !!tailoredLatex
    });

    if (previewArea.style.display === 'none') {
      // Switch to code view
      previewArea.style.display = 'block';
      pdfPreviewArea.style.display = 'none';
      togglePreviewBtn.innerHTML = '<span class="material-icons">visibility</span>';
      console.log('Switched to code view');
    } else {
      // Switch to PDF view
      const currentLatex = tailoredLatex || originalLatex;
      if (currentLatex) {
        showStatus("Generating PDF preview...", 'info');
        const success = await generatePdfPreview(currentLatex);
        if (success) {
          previewArea.style.display = 'none';
          pdfPreviewArea.style.display = 'block';
          togglePreviewBtn.innerHTML = '<span class="material-icons">code</span>';
          console.log('Switched to PDF view');
        }
      } else {
        console.error('No LaTeX content available');
        showStatus("No content to preview", 'error');
      }
    }
  });

  /**
   * Helper function to generate PDF preview
   */
  async function generatePdfPreview(latex, type = 'original') {
    const filename = currentFile ? currentFile.name : 'resume.tex';
    console.log('[Preview] Generating preview:', {
      type,
      filename,
      contentLength: latex.length
    });

    try {
      const response = await fetch('http://localhost:3000/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          latex,
          type,
          filename 
        })
      });

      const data = await response.json();
      
      if (data.success && data.pdfUrl) {
        const fullPdfUrl = `http://localhost:3000${data.pdfUrl}`;
        console.log('[Preview] Setting PDF URL:', fullPdfUrl);
        
        pdfPreviewArea.innerHTML = `
          <iframe src="${fullPdfUrl}" type="application/pdf" width="100%" height="100%"></iframe>
        `;
        
        // Store the current PDF info
        currentPdfUrl = data.pdfUrl;
        currentPdfFilename = data.filename;
        
        showStatus(`${type} PDF preview generated successfully!`, 'success');
        return true;
      } else {
        throw new Error(data.error || "Preview generation failed");
      }
    } catch (error) {
      console.error("[Preview] Error:", error);
      showStatus("Could not generate preview: " + error.message, 'error');
      return false;
    }
  }

  // Update preview type availability
  function updatePreviewTypeControls(hasGenerated) {
    console.log('Updating preview type controls:', { hasGenerated });
    const generatedRadio = document.querySelector('input[value="generated"]');
    if (generatedRadio) {
      generatedRadio.disabled = !hasGenerated;
    }
  }

  // Add cleanup function
  function cleanupPdfUrl(url) {
    console.log('Cleaning up PDF URL:', url);
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
      console.log('Revoked blob URL');
    }
  }

  // Add to both download handlers before creating new URLs
  if (currentPdfUrl) {
    cleanupPdfUrl(currentPdfUrl);
  }
  currentPdfUrl = data.pdfUrl;
}

async function loadExistingTemplates() {
  console.log('[Client] Starting to load existing templates');
  
  try {
    console.log('[Client] Fetching templates from server');
    const response = await fetch('http://localhost:3000/list-templates');
    console.log('[Client] Server response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[Client] Received templates data:', data);
    
    if (data.success && data.templates) {
      const resumeList = document.getElementById('resumeList');
      console.log('[Client] Found resumeList element:', !!resumeList);
      
      // Clear existing list
      resumeList.innerHTML = '';
      console.log('[Client] Cleared existing resume list');
      
      // Create template list
      console.log('[Client] Processing templates:', data.templates.length);
      
      data.templates.forEach((file, index) => {
        console.log('[Client] Creating card for template:', {
          index,
          name: file.name,
          path: file.path
        });
        
        const card = document.createElement('div');
        card.className = 'resume-card';
        card.innerHTML = `
          <div class="resume-card-content">
            <h4 class="filename">${file.name}</h4>
            <p class="resume-card-preview">${file.preview || 'No preview available'}</p>
            <div class="card-actions">
              <button class="button load-btn">Load</button>
              <button class="button delete-btn">Delete</button>
            </div>
          </div>
        `;
        
        // Add event listeners
        const loadBtn = card.querySelector('.load-btn');
        const deleteBtn = card.querySelector('.delete-btn');
        
        loadBtn.addEventListener('click', async () => {
          console.log('[Client] Load button clicked for:', file.name);
          try {
            await loadTemplate(file.path);
            console.log('[Client] Template loaded successfully:', file.name);
            
            // Update current file status
            currentFile = { name: file.name };
            console.log('[Client] Updated current file:', currentFile);
            
            // Update UI
            fileNameDisplay.textContent = file.name;
            showStatus(`Loaded template: ${file.name}`, 'success');
          } catch (error) {
            console.error('[Client] Error loading template:', {
              name: file.name,
              error: error.message
            });
            showStatus('Failed to load template: ' + error.message, 'error');
          }
        });
        
        resumeList.appendChild(card);
        console.log('[Client] Added card to resume list:', file.name);
      });
      
      console.log('[Client] Finished creating template cards');
    } else {
      console.warn('[Client] No templates found in response:', data);
    }
  } catch (error) {
    console.error('[Client] Failed to load templates:', {
      error: error.message,
      stack: error.stack
    });
    showStatus('Failed to load existing templates: ' + error.message, 'error');
  }
}

async function loadTemplate(templatePath) {
  console.log('[Client] Starting to load template:', templatePath);
  
  try {
    const url = `http://localhost:3000/load-template?path=${encodeURIComponent(templatePath)}`;
    console.log('[Client] Fetching template from:', url);
    
    const response = await fetch(url);
    console.log('[Client] Server response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[Client] Received template data:', {
      success: data.success,
      contentLength: data.content?.length
    });
    
    if (data.success && data.content) {
      // Store the loaded content
      originalLatex = data.content;
      console.log('[Client] Stored original LaTeX content, length:', originalLatex.length);
      
      // Update preview
      const previewArea = document.getElementById('previewArea');
      if (previewArea) {
        previewArea.textContent = data.content;
        console.log('[Client] Updated preview area');
      }
      
      // Enable preview controls
      const previewBtn = document.getElementById('previewBtn');
      if (previewBtn) {
        previewBtn.disabled = false;
        console.log('[Client] Enabled preview button');
      }
      
      // Update radio buttons
      const originalRadio = document.querySelector('input[value="original"]');
      if (originalRadio) {
        originalRadio.checked = true;
        console.log('[Client] Updated radio button selection');
      }
      
      return true;
    }
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('[Client] Error in loadTemplate:', {
      path: templatePath,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Add to initializeUI function
document.getElementById('loadExistingBtn').addEventListener('click', loadExistingTemplates);

// Load templates on startup
loadExistingTemplates();

// Initialize UI and services
async function initializeSidepanel() {
  console.log('[Sidepanel] Initializing...');
  
  try {
    // Check for required services
    if (!window.StorageManager) {
      throw new Error('StorageManager not found');
    }
    if (!window.AIService) {
      throw new Error('AIService not found');
    }
    if (!window.FileManager) {
      throw new Error('FileManager not found');
    }
    if (!window.config || !window.config.GEMINI_API_KEY) {
      throw new Error('Config or API key not found');
    }
    
    console.log('Initializing services');
    storage = new window.StorageManager();
    aiService = new window.AIService(window.config.GEMINI_API_KEY);
    fileManager = new window.FileManager();
    
    // Initialize folders
    await fileManager.initializeFolders();
    
    console.log('Services and folders initialized successfully');
    
    // Initialize UI elements
    await initializeUI();
    
    // Restore previous state if any
    await restoreState();
  } catch (error) {
    console.error('[Sidepanel] Initialization failed:', error);
    showStatus('Failed to initialize sidepanel: ' + error.message, 'error');
  }
}

function setupUIElements() {
  // Select and cache UI elements
  const elements = {
    tabs: {
      resume: document.getElementById('resumeTab'),
      coverLetter: document.getElementById('coverLetterTab')
    },
    content: {
      resume: document.getElementById('resumeContent'),
      coverLetter: document.getElementById('coverLetterContent')
    },
    preview: {
      area: document.getElementById('previewArea'),
      pdf: document.getElementById('pdfPreviewArea'),
      toggle: document.getElementById('togglePreviewBtn')
    },
    buttons: {
      tailor: document.getElementById('tailorBtn'),
      preview: document.getElementById('previewBtn'),
      download: document.getElementById('downloadBtn'),
      expandPreview: document.createElement('button')
    }
  };

  // Add expand preview button
  elements.buttons.expandPreview.className = 'secondary';
  elements.buttons.expandPreview.innerHTML = '<span class="material-icons">open_in_new</span>';
  elements.buttons.expandPreview.title = 'Open in full window';

  return elements;
}

function setupEventListeners() {
  const elements = setupUIElements();

  // Tab switching with state persistence
  elements.tabs.resume.addEventListener('click', () => {
    switchTab('resume');
    sidebarState.activeTab = 'resume';
    saveState();
  });

  elements.tabs.coverLetter.addEventListener('click', () => {
    switchTab('coverLetter');
    sidebarState.activeTab = 'coverLetter';
    saveState();
  });

  // Preview expansion handler
  elements.buttons.expandPreview.addEventListener('click', () => {
    const previewWindow = window.open('', '_blank', 'width=800,height=800');
    const content = sidebarState.previewMode === 'pdf' 
      ? elements.preview.pdf.innerHTML 
      : elements.preview.area.textContent;
    
    previewWindow.document.write(`
      <html>
        <head>
          <title>Resume Preview</title>
          <link rel="stylesheet" href="styles/preview.css">
        </head>
        <body>
          <div class="preview-container">
            ${content}
          </div>
        </body>
      </html>
    `);
  });

  // Preview toggle with state persistence
  elements.preview.toggle.addEventListener('click', async () => {
    sidebarState.previewMode = sidebarState.previewMode === 'text' ? 'pdf' : 'text';
    await updatePreview(sidebarState.previewMode);
    saveState();
  });

  // Save job description as you type
  const jobDescInput = document.getElementById('jobDesc');
  jobDescInput.addEventListener('input', debounce(() => {
    sidebarState.lastJobDescription = jobDescInput.value;
    saveState();
  }, 500));
}

// State management
function saveState() {
  chrome.storage.local.set({ sidebarState });
}

async function restoreState() {
  const { sidebarState: savedState } = await chrome.storage.local.get('sidebarState');
  if (savedState) {
    sidebarState = savedState;
    
    // Restore UI state
    switchTab(sidebarState.activeTab);
    if (sidebarState.lastJobDescription) {
      document.getElementById('jobDesc').value = sidebarState.lastJobDescription;
    }
    await updatePreview(sidebarState.previewMode);
  }
}

// Utility functions
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

// Keep existing functions but modify for sidebar context
async function updatePreview(type) {
  console.log('[Preview] Updating preview:', { type });
  const previewArea = document.getElementById('previewArea');
  const pdfPreviewArea = document.getElementById('pdfPreviewArea');

  try {
    if (type === 'pdf') {
      previewArea.style.display = 'none';
      pdfPreviewArea.style.display = 'block';
      await generatePdfPreview(tailoredLatex || originalLatex);
    } else {
      pdfPreviewArea.style.display = 'none';
      previewArea.style.display = 'block';
      previewArea.textContent = tailoredLatex || originalLatex;
    }
  } catch (error) {
    console.error('[Preview] Error:', error);
    showStatus('Preview update failed', 'error');
  }
}

// Initialize sidepanel when DOM is ready
document.addEventListener('DOMContentLoaded', initializeSidepanel);

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initializeSidepanel, updatePreview };
}

function setupPreviewUI() {
  console.log('[Debug] Setting up preview UI');
  
  // Find existing preview control
  const previewControl = document.querySelector('.preview-control');
  if (!previewControl) {
    console.error('[Debug] Preview control not found');
    return;
  }

  // Create toggle button
  const toggleButton = document.createElement('button');
  toggleButton.id = 'togglePreviewMode';
  toggleButton.className = 'icon-button';
  toggleButton.title = 'Toggle Preview Mode';
  toggleButton.innerHTML = '<span class="material-icons">visibility</span>';

  // Add toggle button to existing preview control
  previewControl.appendChild(toggleButton);

  // Set up preview functionality
  const previewArea = document.getElementById('previewArea');
  const pdfPreviewArea = document.getElementById('pdfPreviewArea');

  if (!toggleButton || !previewArea || !pdfPreviewArea) {
    console.error('[Debug] Failed to find preview elements');
    return;
  }

  // Add click handler for preview toggle
  toggleButton.addEventListener('click', async () => {
    console.log('[Debug] Toggle preview clicked');
    
    try {
      const currentLatex = tailoredLatex || originalLatex;
      const isShowingPdf = pdfPreviewArea.style.display !== 'none';
      
      if (isShowingPdf) {
        // Switch to code view
        previewArea.style.display = 'block';
        pdfPreviewArea.style.display = 'none';
        toggleButton.innerHTML = '<span class="material-icons">visibility</span>';
        toggleButton.title = 'Show PDF Preview';
      } else {
        if (!currentLatex) {
          console.warn('[Debug] No LaTeX content available');
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
    } catch (error) {
      console.error('[Debug] Preview toggle error:', error);
      showStatus('Failed to toggle preview: ' + error.message, 'error');
    }
  });

  console.log('[Debug] Preview UI setup complete');
} 
async function generateTailoredContent() {
  try {
    console.log('[Generate] Starting content generation:', {
      fileType: sidebarState.fileType,
      hasOriginalLatex: !!originalLatex,
      hasOriginalDocx: !!sidebarState.originalDocx
    });

    const jobDesc = document.getElementById('jobDesc').value.trim();
    const knowledgeBase = document.getElementById('knowledgeBaseText').value.trim();

    if (!jobDesc) {
      throw new Error('Please enter the job description');
    }

    // Show loading state
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    generateBtn.innerHTML = `
      <div class="loading-spinner"></div>
      <span>Generating Resume...</span>
    `;

    let result;
    if (sidebarState.fileType === 'latex') {
      result = await generateTailoredLatex(jobDesc, knowledgeBase);
    } else if (sidebarState.fileType === 'docx') {
      result = await generateTailoredDocx(jobDesc, knowledgeBase);
    } else {
      throw new Error('Unsupported file type');
    }

    if (!result.success) {
      throw new Error(result.error || 'Generation failed');
    }

    // Update state based on file type
    if (sidebarState.fileType === 'latex') {
      tailoredLatex = result.content;
      sidebarState.tailoredContent = result.content;
    } else {
      sidebarState.tailoredDocx = result.docx;
      sidebarState.tailoredContent = result.text;
    }

    sidebarState.contentType = 'generated';
    await chrome.storage.local.set({ sidebarState });

    // Update preview
    await updatePreview();
    showStatus('Resume generated successfully!', 'success');

    return result;

  } catch (error) {
    console.error('[Generate] Error:', error);
    showStatus(error.message, 'error');
    throw error;
  } finally {
    // Reset generate button
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.innerHTML = `
        <span class="material-icons">auto_awesome</span> Generate Tailored Resume
      `;
    }
  }
}

async function generateLatexPreview(content) {
  try {
    console.log('[LatexPreview] Starting preview generation', {
      hasContent: !!content,
      contentLength: content?.length
    });

    if (!content) {
      throw new Error('No LaTeX content available for preview');
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

    // Save the LaTeX content first
    const saveResult = await window.ServerManager.saveGeneratedResume(content, 'resume.tex', {
      type: 'latex',
      timestamp: Date.now(),
      previewGeneration: true
    });

    if (!saveResult.success) {
      throw new Error(`Failed to save LaTeX: ${saveResult.error}`);
    }

    // Compile the saved content
    const compileResult = await window.ServerManager.compileResume({
      fileId: saveResult.fileId
    });

    if (!compileResult.success) {
      throw new Error(`PDF compilation failed: ${compileResult.error}`);
    }

    // Create blob URL for the PDF
    if (window.lastPdfUrl) {
      URL.revokeObjectURL(window.lastPdfUrl);
    }
    window.lastPdfUrl = URL.createObjectURL(compileResult.content);

    // Create and add iframe
    const iframe = document.createElement('iframe');
    iframe.src = `${window.lastPdfUrl}#zoom=FitH`;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';

    pdfPreviewArea.innerHTML = '';
    pdfPreviewArea.appendChild(iframe);

    // Monitor iframe loading
    iframe.onload = () => {
      console.log('[LatexPreview] PDF iframe loaded successfully');
      showStatus('PDF preview loaded successfully', 'success');
    };

    return true;
  } catch (error) {
    console.error('[LatexPreview] Error:', error);
    showStatus(`Preview generation failed: ${error.message}`, 'error');
    
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

async function updatePreview() {
  try {
    console.log('[Preview] Starting preview update:', {
      contentType: sidebarState.contentType,
      fileType: sidebarState.fileType,
      hasOriginalLatex: !!originalLatex,
      hasTailoredLatex: !!tailoredLatex
    });

    // Get the appropriate content based on type and file type
    let contentToShow;
    if (sidebarState.fileType === 'latex') {
      contentToShow = sidebarState.contentType === 'generated' ? tailoredLatex : originalLatex;
    } else {
      contentToShow = sidebarState.contentType === 'generated' ? 
        sidebarState.tailoredContent : sidebarState.originalContent;
    }

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
      } else {
        await generatePdfPreview(contentToShow, sidebarState.contentType);
      }
    }

  } catch (error) {
    console.error('[Preview] Error:', error);
    showStatus(error.message, 'error');
  }
}

function detectFileType(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  console.log('[FileType] Detecting file type:', {
    fileName: file.name,
    extension: extension,
    mimeType: file.type
  });

  if (extension === 'tex') {
    return 'latex';
  } else if (extension === 'docx') {
    return 'docx';
  } else {
    throw new Error('Unsupported file type. Please upload a .tex or .docx file.');
  }
}

async function handleFileUpload(file) {
  try {
    console.log('[Upload] Starting file upload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });

    showUploadingFeedback(file.name);
    showStatus('Reading file...', 'info');

    // Detect file type
    const fileType = detectFileType(file);
    sidebarState.fileType = fileType;

    const fileHandler = new FileHandler();
    const result = await fileHandler.handleFile(file);

    if (!result.success) {
      throw new Error(result.error || 'Failed to process file');
    }

    // Update state based on file type
    if (fileType === 'latex') {
      originalLatex = result.content;
      sidebarState.originalContent = result.content;
    } else {
      sidebarState.originalDocx = result.docx;
      sidebarState.originalContent = result.text;
    }

    sidebarState.contentType = 'original';
    sidebarState.uploadedFileName = file.name;

    // Save state
    await chrome.storage.local.set({ sidebarState });

    // Update UI
    showSuccessfulUploadFeedback(file.name);
    showStatus('File uploaded successfully!', 'success');

    // Update preview
    await updatePreview();

    return result;

  } catch (error) {
    console.error('[Upload] Error:', error);
    showFailedUploadFeedback();
    showStatus(`Upload failed: ${error.message}`, 'error');
    throw error;
  }
} 
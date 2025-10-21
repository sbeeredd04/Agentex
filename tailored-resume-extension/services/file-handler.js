/**
 * File Handler Service
 * 
 * Manages file upload and processing for different resume file types.
 * Supports LaTeX (.tex) and DOCX (.docx) formats, routing each to
 * appropriate handlers for parsing and preview generation.
 * 
 * @class FileHandler
 * @module services/file-handler
 */
class FileHandler {
  /**
   * Initialize File Handler
   * Sets up supported file type handlers
   */
  constructor() {
    this.docxService = new DocxService();
    this.supportedTypes = {
      'tex': this.handleLatex.bind(this),
      'docx': this.handleDocx.bind(this)
    };
    this.debug = true;
  }

  /**
   * Log debug messages
   * @param {...any} args - Arguments to log
   */
  log(...args) {
    if (this.debug) {
      console.log('[FileHandler]', ...args);
    }
  }

  /**
   * Handle file upload
   * Routes file to appropriate handler based on extension
   * 
   * @param {File} file - Uploaded file object
   * @returns {Promise<Object>} Processed file data with type, content, and preview
   * @throws {Error} If file type is not supported
   */
  async handleFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    const handler = this.supportedTypes[extension];
    
    if (!handler) {
      throw new Error(`Unsupported file type: ${extension}. Only .tex and .docx files are supported.`);
    }

    return await handler(file);
  }

  /**
   * Handle LaTeX file
   * Reads file as plain text
   * 
   * @param {File} file - LaTeX file
   * @returns {Promise<Object>} LaTeX content object
   */
  async handleLatex(file) {
    const content = await this.readFileAsText(file);
    return {
      type: 'latex',
      content,
      preview: content,
      success: true
    };
  }

  async handleDocx(file) {
    try {
      this.log('Processing DOCX file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
      
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      this.log('File read as ArrayBuffer:', {
        size: arrayBuffer.byteLength,
        isArrayBuffer: arrayBuffer instanceof ArrayBuffer,
        firstBytes: new Uint8Array(arrayBuffer.slice(0, 10))
      });
      
      const result = await this.docxService.readDocx(arrayBuffer);
      
      if (!result.success) {
        throw new Error(`DOCX processing failed: ${result.error}`);
      }

      // Enhanced validation of DOCX content
      if (!result.docx || typeof result.docx !== 'string') {
        this.log('Invalid DOCX content:', {
          hasDocx: !!result.docx,
          docxType: typeof result.docx,
          docxLength: result.docx?.length,
          resultKeys: Object.keys(result)
        });
        throw new Error('Invalid DOCX content received from processing');
      }

      // Create properly structured content object with enhanced metadata
      const docxContent = {
        type: 'ArrayBuffer',
        data: result.docx, // base64 string
        originalName: file.name,
        timestamp: Date.now(),
        size: result.docx.length,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      };

      this.log('DOCX processed successfully:', {
        htmlLength: result.html?.length,
        textLength: result.text?.length,
        docxDataLength: docxContent.data.length,
        contentStructure: {
          hasType: !!docxContent.type,
          hasData: !!docxContent.data,
          dataType: typeof docxContent.data,
          originalName: docxContent.originalName,
          dataPreview: docxContent.data.substring(0, 100) + '...',
          size: docxContent.size
        }
      });

      // Store in sidebar state with proper structure
      window.sidebarState = {
        ...window.sidebarState,
        fileType: 'docx',
        originalContent: result.text,
        originalHtml: result.html,
        originalDocx: docxContent,
        uploadedFileName: file.name
      };

      await chrome.storage.local.set({ sidebarState: window.sidebarState });
      return { success: true, type: 'docx', content: result.text, preview: result.html, docx: docxContent };

    } catch (error) {
      console.error('[FileHandler] DOCX processing error:', error);
      return { success: false, error: error.message };
    }
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = e => reject(e);
      reader.readAsText(file);
    });
  }

  readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = e => reject(e);
      reader.readAsArrayBuffer(file);
    });
  }
}

window.FileHandler = FileHandler; 
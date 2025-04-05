class ServerManager {
    constructor() {
      this.API_URL = 'https://agentex.onrender.com';
      this.fileCache = new Map();
      this.currentRequest = null;
      console.log('[ServerManager] Initializing with API URL:', this.API_URL);
    
    }
  
    async saveGeneratedResume(content, filename, metadata = {}) {
      try {
        // Cancel any existing request
        if (this.currentRequest) {
          console.log('[ServerManager] Cancelling previous request');
          this.currentRequest.abort();
        }

        console.log('[ServerManager] Starting saveGeneratedResume:', { filename, metadata });
        
        const formData = new FormData();
        
        // If content is a Blob/File, use it directly
        if (content instanceof Blob) {
          formData.append('file', content, filename);
        } else {
          // For text content, create a new Blob
          const blob = new Blob([content], { type: 'text/plain' });
          formData.append('file', blob, filename);
        }
        
        formData.append('metadata', JSON.stringify(metadata));

        // Create new AbortController
        const controller = new AbortController();
        this.currentRequest = controller;

        const response = await fetch(`${this.API_URL}/save-docx`, {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        const result = await response.json();
        console.log('[ServerManager] Resume saved successfully:', result);

        return {
          success: true,
          fileId: result.fileId
        };

      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('[ServerManager] Request aborted');
          return { success: false, error: 'Request cancelled' };
        }
        console.error('[ServerManager] Save error:', error);
        return {
          success: false,
          error: error.message
        };
      } finally {
        this.currentRequest = null;
      }
    }
  
    async compileResume(options = {}) {
      try {
        if (this.currentRequest) {
          console.log('[ServerManager] Cancelling previous request');
          this.currentRequest.abort();
        }

        console.log('[ServerManager] Starting compilation:', options);

        const controller = new AbortController();
        this.currentRequest = controller;

        const response = await fetch(`${this.API_URL}/compile-docx`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/pdf'
          },
          body: JSON.stringify(options),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        // Verify response type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/pdf')) {
          throw new Error(`Invalid response type: ${contentType}`);
        }

        const pdfBlob = await response.blob();
        
        // Verify PDF blob
        if (pdfBlob.size === 0) {
          throw new Error('Received empty PDF');
        }

        console.log('[ServerManager] PDF compilation successful:', {
          size: pdfBlob.size,
          type: pdfBlob.type
        });

        return {
          success: true,
          content: pdfBlob
        };

      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('[ServerManager] Request aborted');
          return { success: false, error: 'Request cancelled' };
        }
        console.error('[ServerManager] Compilation error:', error);
        return {
          success: false,
          error: error.message
        };
      } finally {
        this.currentRequest = null;
      }
    }
  
    getPdfFromCache(fileId) {
      const cachedPdf = this.fileCache.get(`${fileId}_pdf`);
      if (cachedPdf && Date.now() - cachedPdf.timestamp < 3600000) { // 1 hour cache
        return {
          success: true,
          content: cachedPdf.pdf
        };
      }
      return {
        success: false,
        error: 'PDF not found in cache or expired'
      };
    }
  
    getLatexFromCache(fileId) {
      const cachedLatex = this.fileCache.get(fileId);
      if (cachedLatex && Date.now() - cachedLatex.timestamp < 3600000) {
        return {
          success: true,
          content: cachedLatex.latex,
          metadata: cachedLatex.metadata
        };
      }
      return {
        success: false,
        error: 'LaTeX not found in cache or expired'
      };
    }
  
    cleanup() {
      console.log('[ServerManager] Cleaning up');
      // Clear expired cache entries (older than 1 hour)
      const now = Date.now();
      for (const [key, value] of this.fileCache.entries()) {
        if (now - value.timestamp > 3600000) {
          this.fileCache.delete(key);
        }
      }
      console.log('[ServerManager] Cleanup completed');
    }

    // Helper method to check cache health
    _checkCacheHealth() {
      const now = Date.now();
      const cacheHealth = {
        totalEntries: this.fileCache.size,
        entriesDetails: Array.from(this.fileCache.entries()).map(([key, value]) => ({
          key,
          age: now - value.timestamp,
          type: key.includes('_pdf') ? 'pdf' : 'latex',
          size: value.pdf?.size || value.latex?.length || 0
        }))
      };
      console.log('[ServerManager] Cache health check:', cacheHealth);
      return cacheHealth;
    }

    async saveGeneratedDocx(docxBlob, filename, metadata = {}) {
      try {
        console.log('[ServerManager] Saving DOCX:', {
          filename,
          blobSize: docxBlob.size,
          blobType: docxBlob.type,
          metadata
        });

        const formData = new FormData();
        formData.append('file', docxBlob, filename);
        formData.append('metadata', JSON.stringify(metadata));

        const response = await fetch(`${this.API_URL}/save-docx`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${await response.text()}`);
        }

        const result = await response.json();
        console.log('[ServerManager] DOCX saved successfully:', {
          fileId: result.fileId,
          details: result
        });

        return {
          success: true,
          fileId: result.fileId,
          details: result
        };
      } catch (error) {
        console.error('[ServerManager] Failed to save DOCX:', error);
        return {
          success: false,
          error: error.message,
          details: error
        };
      }
    }

    async compileDocxToPdf(options = {}) {
      try {
        console.log('[ServerManager] Starting DOCX to PDF compilation:', {
          options,
          endpoint: `${this.API_URL}/compile-docx`
        });

        const response = await fetch(`${this.API_URL}/compile-docx`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...options,
            format: {
              preserveFormatting: true,
              margins: {
                top: '1in',
                bottom: '1in',
                left: '1in',
                right: '1in'
              },
              pageSize: 'Letter'
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[ServerManager] Compilation failed:', {
            status: response.status,
            error: errorText
          });
          throw new Error(`Server returned ${response.status}: ${errorText}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/pdf')) {
          throw new Error(`Invalid response type: ${contentType}`);
        }

        const pdfBlob = await response.blob();
        console.log('[ServerManager] PDF compilation successful:', {
          size: pdfBlob.size,
          type: pdfBlob.type
        });

        return {
          success: true,
          content: pdfBlob,
          contentType: pdfBlob.type,
          size: pdfBlob.size
        };
      } catch (error) {
        console.error('[ServerManager] Failed to compile DOCX:', error);
        return {
          success: false,
          error: error.message,
          details: error
        };
      }
    }

    // Add default headers method
    _getDefaultHeaders() {
      return {
        'Content-Type': 'application/json',
        'Accept': 'application/pdf, application/json',
        'Origin': 'chrome-extension://jdinfdcbfmnnoanojkbokdhjpjognpmk'
      };
    }

    async compileLatex(latex) {
      try {
        console.log('[ServerManager] Compiling LaTeX:', { length: latex.length });
        
        const response = await fetch(`${this.API_URL}/compile`, {
          method: 'POST',
          headers: this._getDefaultHeaders(),
          credentials: 'include',
          body: JSON.stringify({ latex }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server returned ${response.status}`);
        }

        const pdfBlob = await response.blob();
        console.log('[ServerManager] Compilation successful:', {
          size: pdfBlob.size,
          type: pdfBlob.type
        });

        return {
          success: true,
          content: pdfBlob
        };

      } catch (error) {
        console.error('[ServerManager] Compilation error:', error);
        return {
          success: false,
          error: error.message
        };
      }
    }
  }
  
  // Update the global registration
  if (typeof window !== 'undefined') {
    console.log('[ServerManager] Registering globally');
    if (!window.ServerManager) {
        window.ServerManager = new ServerManager();
        console.log('[ServerManager] Class registered globally');
    }
  }

  // Export for module usage
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ServerManager;
  }
  
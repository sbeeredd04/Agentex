class ServerManager {
    constructor() {
      this.API_URL = 'http://localhost:3000';
      this.cache = new Map();
      console.log('[ServerManager] Initializing with API URL:', this.API_URL);
    
    }
  
    async saveGeneratedResume(latex, filename = 'resume.tex', metadata = {}) {
      // Input validation debugging
      console.log('[ServerManager] Starting saveGeneratedResume:', {
        hasLatex: Boolean(latex),
        latexLength: latex?.length || 0,
        filename,
        metadataKeys: Object.keys(metadata),
        timestamp: new Date().toISOString()
      });

      if (!latex) {
        console.error('[ServerManager] Error: No LaTeX content provided');
        return {
          success: false,
          error: 'No LaTeX content provided'
        };
      }

      try {
        // Generate fileId with timestamp for uniqueness
        const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Debug cache state before saving
        console.log('[ServerManager] Cache state before saving:', {
          cacheSize: this.cache.size,
          newFileId: fileId,
          existingKeys: Array.from(this.cache.keys())
        });

        // Prepare cache data
        const cacheData = {
          latex,
          metadata: {
            ...metadata,
            filename,
            savedAt: new Date().toISOString()
          },
          timestamp: Date.now()
        };

        // Save to cache
        this.cache.set(fileId, cacheData);

        // Verify cache save
        const savedData = this.cache.get(fileId);
        const saveVerification = {
          saved: Boolean(savedData),
          latexMatches: savedData?.latex === latex,
          metadataPresent: Boolean(savedData?.metadata),
          cacheSize: this.cache.size
        };

        console.log('[ServerManager] Save verification:', saveVerification);

        if (!saveVerification.saved || !saveVerification.latexMatches) {
          throw new Error('Cache verification failed');
        }

        // Log successful save
        console.log('[ServerManager] Resume saved successfully:', {
          fileId,
          filename,
          latexPreview: latex.substring(0, 100) + '...',
          metadataKeys: Object.keys(metadata),
          cacheSize: this.cache.size
        });

        return {
          success: true,
          fileId,
          path: filename,
          verification: saveVerification
        };

      } catch (error) {
        console.error('[ServerManager] Error saving LaTeX content:', {
          error: error.message,
          stack: error.stack,
          type: error.name
        });

        // Attempt cache cleanup on error
        try {
          if (fileId) {
            this.cache.delete(fileId);
            console.log('[ServerManager] Cleaned up failed save from cache');
          }
        } catch (cleanupError) {
          console.error('[ServerManager] Cleanup error:', cleanupError);
        }

        return {
          success: false,
          error: error.message || 'Failed to save resume',
          details: {
            type: error.name,
            timestamp: new Date().toISOString()
          }
        };
      }
    }
  
    async compileResume(options = {}) {
      console.log('[ServerManager] Starting compilation:', options);

      const { fileId } = options;
      const cachedData = this.cache.get(fileId);

      if (!cachedData) {
        console.error('[ServerManager] No cached data found for fileId:', fileId);
        return {
          success: false,
          error: 'No LaTeX content available for compilation'
        };
      }

      try {
        // First, send OPTIONS request to ensure CORS is properly handled
        console.log('[ServerManager] Sending preflight request');
        
        const preflightResponse = await fetch(`${this.API_URL}/compile`, {
          method: 'OPTIONS',
          headers: {
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type',
            'Origin': chrome.runtime.getURL('')
          }
        });

        console.log('[ServerManager] Preflight response:', {
          status: preflightResponse.status,
          headers: Object.fromEntries(preflightResponse.headers.entries())
        });

        // Send actual compile request
        console.log('[ServerManager] Sending compile request:', {
          url: `${this.API_URL}/compile`,
          dataSize: cachedData.latex.length,
          hasMetadata: Boolean(cachedData.metadata)
        });

        const response = await fetch(`${this.API_URL}/compile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': chrome.runtime.getURL('')
          },
          credentials: 'include',
          body: JSON.stringify({ 
            latex: cachedData.latex,
            metadata: cachedData.metadata 
          })
        });

        console.log('[ServerManager] Compile response received:', {
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        // Handle the response
        const pdfBlob = await response.blob();
        console.log('[ServerManager] PDF blob received:', {
          size: pdfBlob.size,
          type: pdfBlob.type
        });

        // Cache the result
        this.cache.set(`${fileId}_pdf`, {
          pdf: pdfBlob,
          timestamp: Date.now()
        });

        return {
          success: true,
          content: pdfBlob,
          fileId,
          contentType: pdfBlob.type
        };

      } catch (error) {
        console.error('[ServerManager] Compilation error:', {
          message: error.message,
          type: error.name,
          stack: error.stack
        });
        
        return {
          success: false,
          error: error.message || 'PDF compilation failed',
          details: {
            type: error.name,
            timestamp: new Date().toISOString()
          }
        };
      }
    }
  
    getPdfFromCache(fileId) {
      const cachedPdf = this.cache.get(`${fileId}_pdf`);
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
      const cachedLatex = this.cache.get(fileId);
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
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > 3600000) {
          this.cache.delete(key);
        }
      }
      console.log('[ServerManager] Cleanup completed');
    }

    // Helper method to check cache health
    _checkCacheHealth() {
      const now = Date.now();
      const cacheHealth = {
        totalEntries: this.cache.size,
        entriesDetails: Array.from(this.cache.entries()).map(([key, value]) => ({
          key,
          age: now - value.timestamp,
          type: key.includes('_pdf') ? 'pdf' : 'latex',
          size: value.pdf?.size || value.latex?.length || 0
        }))
      };
      console.log('[ServerManager] Cache health check:', cacheHealth);
      return cacheHealth;
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
  
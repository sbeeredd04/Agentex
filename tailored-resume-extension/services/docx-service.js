class DocxService {
  constructor() {
    this.mammoth = window.mammoth;
    this.PizZip = window.PizZip;
    this.Docxtemplater = window.docxtemplater;
    this.debug = true;
  }

  log(...args) {
    if (this.debug) {
      console.log('[DocxService]', ...args);
    }
  }

  logDebug(stage, data) {
    if (this.debug) {
      console.log(`[DocxService][${stage}]`, {
        timestamp: new Date().toISOString(),
        ...data
      });
    }
  }

  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async extractText(arrayBuffer) {
    try {
      this.log('Creating PizZip instance...');
      
      if (!(arrayBuffer instanceof ArrayBuffer)) {
        throw new Error('Invalid input: Expected ArrayBuffer');
      }

      const zip = new this.PizZip(arrayBuffer);
      const doc = new this.Docxtemplater();
      doc.loadZip(zip);
      
      this.log('Extracting full text...');
      const text = doc.getFullText();
      
      if (!text) {
        throw new Error('No text content found in document');
      }
      
      this.log('Extracted text length:', text.length);
      return text;

    } catch (error) {
      console.error('[DocxService] Text extraction error:', error);
      if (error.properties?.errors) {
        console.error('Docxtemplater specific errors:', error.properties.errors);
      }
      throw new Error(`Text extraction failed: ${error.message}`);
    }
  }

  async readDocx(arrayBuffer) {
    try {
      this.log('Starting DOCX read with buffer size:', arrayBuffer.byteLength);
      
      if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) {
        throw new Error('Invalid input: Expected ArrayBuffer');
      }

      const result = await this.mammoth.convertToHtml({ arrayBuffer });
      
      if (!result || !result.value) {
        throw new Error('Mammoth conversion failed to produce output');
      }

      const textContent = await this.extractText(arrayBuffer);
      const base64Content = this.arrayBufferToBase64(arrayBuffer);

      return {
        success: true,
        html: result.value,
        text: textContent,
        docx: base64Content,
        messages: result.messages
      };

    } catch (error) {
      console.error('[DocxService] Error reading DOCX:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async tailorDocx(originalDocx, jobDescription, knowledgeBase) {
    try {
      this.logDebug('TailorStart', {
        hasOriginalDocx: !!originalDocx,
        docxSize: originalDocx?.byteLength,
        jobDescLength: jobDescription?.length,
        hasKnowledgeBase: !!knowledgeBase
      });

      // 1. Extract and validate original content
      const originalText = await this.extractText(originalDocx);
      this.logDebug('TextExtraction', {
        originalTextLength: originalText?.length,
        hasContent: !!originalText,
        sampleContent: originalText?.substring(0, 100)
      });

      if (!window.DocxAIService) {
        throw new Error('DocxAIService not found');
      }

      // 2. Generate new content
      const docxAiService = new window.DocxAIService();
      await docxAiService.loadApiKeys();

      this.logDebug('AIServiceSetup', {
        serviceInitialized: !!docxAiService,
        modelType: window.currentModelSelection?.type,
        model: window.currentModelSelection?.model
      });

      const tailoredText = await docxAiService.generateContent(
        originalText,
        jobDescription,
        knowledgeBase,
        window.currentModelSelection?.type || 'gemini',
        window.currentModelSelection?.model
      );

      this.logDebug('ContentGeneration', {
        hasTailoredText: !!tailoredText,
        tailoredLength: tailoredText?.length,
        sampleTailored: tailoredText?.substring(0, 100)
      });

      if (!tailoredText) {
        throw new Error('No content generated from AI service');
      }

      // 3. Create new DOCX with updated content
      const zip = new this.PizZip(originalDocx);
      const doc = new this.Docxtemplater();
      doc.loadZip(zip);

      this.logDebug('DocxTemplaterSetup', {
        zipCreated: !!zip,
        docInitialized: !!doc,
        availableFiles: Object.keys(zip.files)
      });

      // Split content into paragraphs
      const paragraphs = tailoredText.split('\n').filter(p => p.trim());
      
      this.logDebug('ContentProcessing', {
        paragraphCount: paragraphs.length,
        firstParagraph: paragraphs[0],
        lastParagraph: paragraphs[paragraphs.length - 1]
      });

      // Prepare content for docx
      const structuredContent = {
        content: paragraphs.join('\n'),
        sections: paragraphs.map(p => ({ text: p.trim() }))
      };

      this.logDebug('StructuredContent', {
        contentLength: structuredContent.content.length,
        sectionCount: structuredContent.sections.length
      });

      // Update document content
      doc.setData(structuredContent);
      doc.render();

      this.logDebug('DocxRendering', {
        renderComplete: true,
        hasZip: !!doc.getZip()
      });

      // Generate final DOCX
      const updatedDocx = doc.getZip().generate({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }
      });

      this.logDebug('DocxGeneration', {
        updatedSize: updatedDocx.byteLength,
        compressionLevel: 9,
        hasContent: updatedDocx.byteLength > 0
      });

      // Convert for storage
      const base64Content = this.arrayBufferToBase64(updatedDocx);
      
      // Generate preview
      const htmlResult = await this.mammoth.convertToHtml({ arrayBuffer: updatedDocx });

      this.logDebug('FinalProcessing', {
        base64Length: base64Content.length,
        hasHtml: !!htmlResult.value,
        htmlLength: htmlResult.value?.length
      });

      return {
        success: true,
        docx: {
          type: 'ArrayBuffer',
          data: base64Content,
          originalName: 'tailored_resume.docx',
          timestamp: Date.now()
        },
        html: htmlResult.value,
        text: tailoredText
      };

    } catch (error) {
      this.logDebug('Error', {
        message: error.message,
        stack: error.stack,
        stage: error.stage || 'unknown'
      });
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
  }
}

window.DocxService = DocxService;
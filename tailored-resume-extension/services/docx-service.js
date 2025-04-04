class DocxService {
  constructor() {
    this.mammoth = window.mammoth;
    this.PizZip = window.PizZip;
    this.Docxtemplater = window.docxtemplater;
    
    // Add debug flag
    this.debug = true;
  }

  log(...args) {
    if (this.debug) {
      console.log('[DocxService]', ...args);
      // Also log the stack trace for better debugging
      console.trace('[DocxService] Call Stack');
    }
  }

  // Helper method to create serializable response
  createSerializableResponse(data) {
    try {
      // Convert ArrayBuffer to Base64 if present
      if (data.docx instanceof ArrayBuffer) {
        const bytes = new Uint8Array(data.docx);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        data.docx = window.btoa(binary);
      }

      // Ensure all values are serializable
      const safeData = {
        ...data,
        html: data.html || '',
        text: data.text || '',
        timestamp: new Date().toISOString()
      };

      // Verify serializability
      JSON.stringify(safeData);
      return safeData;

    } catch (error) {
      this.log('Serialization error:', error);
      return {
        success: false,
        error: 'Failed to create serializable response',
        details: error.message
      };
    }
  }

  async readDocx(arrayBuffer) {
    try {
      this.log('Starting DOCX read with buffer size:', arrayBuffer.byteLength);
      
      // Input validation
      if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) {
        throw new Error('Invalid input: Expected ArrayBuffer');
      }

      // Convert DOCX to HTML for preview
      this.log('Converting to HTML with Mammoth...');
      const result = await this.mammoth.convertToHtml({ arrayBuffer });
      
      if (!result || !result.value) {
        throw new Error('Mammoth conversion failed to produce output');
      }

      // Extract raw text
      this.log('Extracting raw text...');
      const textContent = await this.extractText(arrayBuffer);

      // Important: Store the original ArrayBuffer directly
      const base64Content = this.arrayBufferToBase64(arrayBuffer);

      const response = {
        success: true,
        html: result.value,
        text: textContent,
        docx: base64Content,
        messages: result.messages
      };

      this.log('Final response created:', {
        success: true,
        htmlLength: response.html.length,
        textLength: response.text.length,
        docxLength: base64Content.length
      });

      return response;

    } catch (error) {
      console.error('[DocxService] Error reading DOCX:', error);
      return {
        success: false,
        error: error.message
      };
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
      
      // Validate input
      if (!(arrayBuffer instanceof ArrayBuffer)) {
        throw new Error('Invalid input: Expected ArrayBuffer');
      }

      const zip = new this.PizZip(arrayBuffer);
      
      this.log('Loading document with Docxtemplater...');
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

  async generateDocx(template, content) {
    try {
      this.log('Starting DOCX generation with template');
      
      // Validate inputs
      if (!template) throw new Error('Template is required');
      if (!content) throw new Error('Content is required');

      this.log('Creating PizZip instance from template...');
      const zip = new this.PizZip(template);
      
      this.log('Initializing Docxtemplater...');
      const doc = new this.Docxtemplater();
      doc.loadZip(zip);
      
      // Ensure content is JSON-serializable
      const sanitizedContent = JSON.parse(JSON.stringify({ content }));
      
      this.log('Setting document data...');
      doc.setData(sanitizedContent);
      
      this.log('Rendering document...');
      doc.render();
      
      this.log('Generating final DOCX blob...');
      const output = doc.getZip().generate({ type: 'blob' });
      
      return {
        success: true,
        docx: output
      };

    } catch (error) {
      console.error('[DocxService] Error generating DOCX:', error);
      // Return a structured error response
      return {
        success: false,
        error: error.message,
        details: {
          name: error.name,
          stack: error.stack
        }
      };
    }
  }

  async tailorDocx(originalDocx, jobDescription, knowledgeBase) {
    try {
      this.log('Starting DOCX tailoring process:', {
        hasOriginalDocx: !!originalDocx,
        jobDescLength: jobDescription?.length,
        hasKnowledgeBase: !!knowledgeBase
      });

      // First, extract text content
      const textContent = await this.extractText(originalDocx);
      this.log('Extracted original text content', {
        length: textContent?.length
      });

      // Create DOCX-specific AI service instance
      this.log('Initializing DOCX AI service');
      if (!window.DocxAIService) {
        throw new Error('DocxAIService not found. Please ensure the service is properly loaded.');
      }
      const docxAiService = new window.DocxAIService();

      // Wait for API keys to be loaded
      await docxAiService.loadApiKeys();
      this.log('API keys loaded for DOCX AI service');

      // Generate tailored content
      this.log('Generating tailored content');
      const tailoredText = await docxAiService.generateContent(
        textContent,
        jobDescription,
        knowledgeBase,
        window.currentModelSelection?.type || 'gemini',
        window.currentModelSelection?.model
      );

      if (!tailoredText) {
        throw new Error('No content generated from AI service');
      }

      this.log('Received tailored content', {
        length: tailoredText?.length,
        preview: tailoredText?.substring(0, 100) + '...'
      });

      // Create a copy of the original DOCX
      const zip = new this.PizZip(originalDocx);
      const doc = new this.Docxtemplater();
      doc.loadZip(zip);

      // Get the document structure
      const documentXml = zip.files['word/document.xml'].asText();
      
      this.log('Original document structure loaded:', {
        hasDocumentXml: !!documentXml,
        xmlLength: documentXml?.length
      });

      // Process the content to maintain structure
      const paragraphs = tailoredText.split('\n').filter(p => p.trim());
      this.log('Content processing:', {
        originalParagraphs: paragraphs.length,
        content: paragraphs.slice(0, 2)
      });

      // Create structured content for docxtemplater
      const structuredContent = {
        content: paragraphs.join('\n'),
        sections: paragraphs.map(p => ({ text: p.trim() }))
      };

      this.log('Prepared content for template:', {
        contentLength: structuredContent.content.length,
        sections: structuredContent.sections.length
      });

      // Set the content while preserving structure
      doc.setData(structuredContent);

      // Render the document
      doc.render();

      // Generate updated DOCX with compression
      const updatedDocx = doc.getZip().generate({
        type: 'arraybuffer',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 9
        }
      });

      // Verify the updated content
      const verificationBuffer = Buffer.from(updatedDocx);
      this.log('Generated DOCX verification:', {
        size: verificationBuffer.length,
        hasContent: verificationBuffer.length > 0
      });

      // Convert to base64 for storage
      const base64Content = this.arrayBufferToBase64(updatedDocx);

      // Convert to HTML for preview using mammoth
      const htmlResult = await this.mammoth.convertToHtml({ arrayBuffer: updatedDocx });

      this.log('DOCX update complete:', {
        originalSize: originalDocx.byteLength,
        updatedSize: updatedDocx.byteLength,
        hasHtml: !!htmlResult.value,
        previewLength: htmlResult.value?.length
      });

      // Return the complete result
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
      console.error('[DocxService] Tailoring error:', error);
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
  }

  async generatePdf(docxData) {
    try {
      this.log('Starting PDF generation from DOCX', {
        dataType: typeof docxData,
        isBlob: docxData instanceof Blob,
        isArrayBuffer: docxData instanceof ArrayBuffer,
        hasData: !!docxData?.data
      });

      // Convert the input data to ArrayBuffer
      let arrayBuffer;
      if (docxData instanceof ArrayBuffer) {
        arrayBuffer = docxData;
      } else if (docxData?.type === 'ArrayBuffer' && docxData?.data) {
        arrayBuffer = this.base64ToArrayBuffer(docxData.data);
      } else if (docxData instanceof Blob) {
        arrayBuffer = await docxData.arrayBuffer();
      } else {
        throw new Error(`Invalid DOCX data format: ${typeof docxData}`);
      }

      // Create a new Blob with the correct MIME type
      const docxBlob = new Blob([arrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      // Create FormData with conversion options
      const formData = new FormData();
      formData.append('file', docxBlob, docxData.originalName || 'resume.docx');
      formData.append('options', JSON.stringify({
        marginTop: '1in',
        marginBottom: '1in',
        marginLeft: '1in',
        marginRight: '1in',
        pageSize: 'Letter',
        preserveFormat: true,
        fitToPage: true,
        maintainAspectRatio: true
      }));

      // Save DOCX first
      const saveResponse = await fetch(`${window.ServerManager.API_URL}/save-docx`, {
        method: 'POST',
        body: formData
      });

      if (!saveResponse.ok) {
        throw new Error(`Failed to save DOCX: ${saveResponse.status}`);
      }

      const saveResult = await saveResponse.json();

      // Request PDF conversion with formatting options
      const pdfResponse = await fetch(`${window.ServerManager.API_URL}/compile-docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileId: saveResult.fileId,
          originalName: docxData.originalName || 'resume.docx',
          options: {
            marginTop: '1in',
            marginBottom: '1in',
            marginLeft: '1in',
            marginRight: '1in',
            pageSize: 'Letter',
            fitToPage: true,
            maintainAspectRatio: true,
            autoFit: true
          }
        })
      });

      if (!pdfResponse.ok) {
        throw new Error(`PDF generation failed: ${pdfResponse.status}`);
      }

      const pdfBlob = await pdfResponse.blob();
      return pdfBlob;

    } catch (error) {
      this.log('PDF generation error:', error);
      throw error;
    }
  }

  validateDocxData(docxData) {
    if (!docxData) {
      throw new Error('DOCX data is required');
    }

    if (docxData instanceof Blob) {
      return {
        valid: true,
        type: 'Blob'
      };
    }

    if (docxData instanceof ArrayBuffer) {
      return {
        valid: true,
        type: 'ArrayBuffer'
      };
    }

    if (docxData?.type === 'ArrayBuffer' && typeof docxData.data === 'string') {
      try {
        // Test if the data is valid base64
        atob(docxData.data);
        return {
          valid: true,
          type: 'SerializedArrayBuffer'
        };
      } catch (e) {
        return {
          valid: false,
          error: 'Invalid base64 data'
        };
      }
    }

    return {
      valid: false,
      error: `Unsupported data type: ${typeof docxData}`
    };
  }

  async updateDocxContent(originalDocxData, newContent) {
    try {
      this.log('Updating DOCX content while preserving formatting:', {
        hasOriginalDocx: !!originalDocxData,
        newContentLength: newContent?.length,
        originalDocxType: originalDocxData?.type
      });

      // Convert original DOCX to ArrayBuffer if needed
      let docxBuffer;
      if (originalDocxData?.type === 'ArrayBuffer' && originalDocxData?.data) {
        docxBuffer = this.base64ToArrayBuffer(originalDocxData.data);
      } else if (originalDocxData instanceof ArrayBuffer) {
        docxBuffer = originalDocxData;
      } else {
        throw new Error('Invalid original DOCX format');
      }

      // Create zip from the original DOCX
      const zip = new this.PizZip(docxBuffer);
      
      // Load document
      const doc = new this.Docxtemplater();
      doc.loadZip(zip);

      // Get the document structure
      const documentXml = zip.files['word/document.xml'].asText();
      
      this.log('Original document structure loaded:', {
        hasDocumentXml: !!documentXml,
        xmlLength: documentXml?.length
      });

      // Create a temporary document to parse the new HTML content
      const tempDoc = document.createElement('div');
      tempDoc.innerHTML = newContent;

      // Extract text content while preserving paragraph breaks
      const textContent = Array.from(tempDoc.children)
        .map(node => node.textContent.trim())
        .filter(text => text.length > 0)
        .join('\n\n');

      this.log('Prepared new content:', {
        paragraphs: textContent.split('\n\n').length,
        totalLength: textContent.length
      });

      // Set the new content while preserving structure
      doc.setData({
        content: textContent
      });

      // Render the document
      doc.render();

      // Generate updated DOCX
      const updatedDocx = doc.getZip().generate({
        type: 'arraybuffer',
        compression: 'DEFLATE'
      });

      this.log('DOCX updated successfully:', {
        originalSize: docxBuffer.byteLength,
        updatedSize: updatedDocx.byteLength
      });

      // Return the updated DOCX in the same format as the original
      return {
        type: 'ArrayBuffer',
        data: this.arrayBufferToBase64(updatedDocx),
        originalName: originalDocxData.originalName,
        timestamp: Date.now()
      };

    } catch (error) {
      this.log('Error updating DOCX content:', error);
      throw error;
    }
  }

  // Add method to ensure consistent page formatting
  async updateDocxFormatting(docxBuffer) {
    try {
      const zip = new this.PizZip(docxBuffer);
      const doc = new this.Docxtemplater();
      doc.loadZip(zip);

      // Get the document settings
      const settingsXml = zip.files['word/settings.xml'];
      if (settingsXml) {
        const settings = settingsXml.asText();
        // Add or update compatibility settings
        if (!settings.includes('<w:compat>')) {
          const compatSettings = `
            <w:compat>
              <w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/>
              <w:compatSetting w:name="overrideTableStyleFontSizeAndJustification" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/>
              <w:compatSetting w:name="enableOpenTypeFeatures" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/>
              <w:compatSetting w:name="doNotFlipMirrorIndents" w:uri="http://schemas.microsoft.com/office/word" w:val="1"/>
            </w:compat>
          `;
          // Insert compatibility settings
          const newSettings = settings.replace('</w:settings>', `${compatSettings}</w:settings>`);
          zip.file('word/settings.xml', newSettings);
        }
      }

      // Update section properties in the document
      const documentXml = zip.files['word/document.xml'].asText();
      const updatedDocumentXml = documentXml.replace(
        /<w:sectPr[^>]*>.*?<\/w:sectPr>/s,
        `<w:sectPr>
          <w:pgSz w:w="12240" w:h="15840"/>
          <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
          <w:cols w:space="720"/>
          <w:docGrid w:linePitch="360"/>
        </w:sectPr>`
      );
      zip.file('word/document.xml', updatedDocumentXml);

      // Generate the updated DOCX
      return zip.generate({ type: 'arraybuffer' });
    } catch (error) {
      this.log('Error updating DOCX formatting:', error);
      throw error;
    }
  }

  // Add helper method for content processing
  _processDocxContent(content) {
    try {
      // Split content into sections
      const sections = content.split('\n\n').filter(Boolean);
      
      // Process each section
      const processedSections = sections.map(section => {
        const lines = section.split('\n').filter(Boolean);
        return {
          heading: lines[0],
          content: lines.slice(1).join('\n')
        };
      });

      return {
        sections: processedSections,
        rawContent: content
      };
    } catch (error) {
      console.error('[DocxService] Content processing error:', error);
      throw error;
    }
  }
}

window.DocxService = DocxService; 
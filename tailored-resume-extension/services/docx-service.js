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
      this.log('Starting DOCX tailoring process', {
        originalDocxType: typeof originalDocx,
        originalDocxInstance: originalDocx instanceof Blob ? 'Blob' : 
                            originalDocx instanceof ArrayBuffer ? 'ArrayBuffer' : 
                            'Other',
        originalDocxSize: originalDocx instanceof Blob ? originalDocx.size : 
                         originalDocx instanceof ArrayBuffer ? originalDocx.byteLength : 
                         'unknown',
        jobDescLength: jobDescription?.length,
        hasKnowledgeBase: !!knowledgeBase
      });

      // Validate input
      if (!originalDocx) {
        throw new Error('Original DOCX content is required');
      }

      // Convert to ArrayBuffer if it's a Blob
      let docxBuffer;
      if (originalDocx instanceof Blob) {
        this.log('Converting Blob to ArrayBuffer...');
        docxBuffer = await originalDocx.arrayBuffer();
      } else if (originalDocx instanceof ArrayBuffer) {
        this.log('Using existing ArrayBuffer...');
        docxBuffer = originalDocx;
      } else if (typeof originalDocx === 'string') {
        this.log('Converting base64 string to ArrayBuffer...');
        try {
          // Handle base64 string
          const binaryString = window.atob(originalDocx);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          docxBuffer = bytes.buffer;
        } catch (e) {
          throw new Error(`Failed to convert base64 string: ${e.message}`);
        }
      } else {
        throw new Error(`Invalid DOCX format: received ${typeof originalDocx}`);
      }

      this.log('DocxBuffer details:', {
        size: docxBuffer.byteLength,
        isArrayBuffer: docxBuffer instanceof ArrayBuffer
      });

      // First, extract text content
      const textContent = await this.extractText(docxBuffer);
      this.log('Extracted original text content', {
        length: textContent?.length
      });

      // Create AI service instance
      this.log('Initializing AI service');
      const aiService = new window.AIService();

      // Create tailoring prompt
      const prompt = `
        Original Resume:
        ${textContent}

        Job Description:
        ${jobDescription}

        Additional Experience:
        ${knowledgeBase || 'None provided'}

        Instructions:
        1. Analyze the job description for key requirements and skills
        2. Review the resume content and identify areas for improvement
        3. Incorporate relevant experience from additional experience section
        4. Maintain professional formatting and structure
        5. Ensure all modifications are factual and based on provided content
        6. Return the tailored content in a clear, structured format
        7. Highlight relevant skills and experience for the position
        8. Keep the same overall format and section organization

        Please provide the tailored content maintaining the original structure.
      `;

      this.log('Sending content to AI for tailoring');
      const tailoredText = await aiService.generateContent(prompt);
      this.log('Received tailored content', {
        length: tailoredText?.length
      });

      // Create new document from template
      this.log('Creating new document from template');
      const zip = new this.PizZip(docxBuffer);
      const doc = new this.Docxtemplater();
      doc.loadZip(zip);

      // Replace content
      this.log('Setting document data');
      doc.setData({
        content: tailoredText
      });

      this.log('Rendering tailored document');
      doc.render();

      const output = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      // Convert to HTML for preview
      this.log('Converting to HTML for preview');
      const arrayBuffer = await output.arrayBuffer();
      const htmlResult = await this.mammoth.convertToHtml({ arrayBuffer });

      this.log('Tailoring completed successfully');
      return {
        success: true,
        docx: output,
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
        hasType: docxData?.type !== undefined,
        hasData: !!docxData?.data,
        contentSize: docxData?.data?.length,
        contentType: docxData?.type
      });

      // Convert the input data to an ArrayBuffer
      let arrayBuffer;
      if (docxData instanceof ArrayBuffer) {
        arrayBuffer = docxData;
        this.log('Using direct ArrayBuffer');
      } else if (docxData?.type === 'ArrayBuffer' && docxData?.data) {
        this.log('Converting base64 to ArrayBuffer', {
          dataLength: docxData.data.length,
          dataPreview: docxData.data.substring(0, 100) + '...'
        });
        arrayBuffer = this.base64ToArrayBuffer(docxData.data);
      } else if (docxData instanceof Blob) {
        arrayBuffer = await docxData.arrayBuffer();
        this.log('Converted Blob to ArrayBuffer');
      } else {
        throw new Error(`Invalid DOCX data format: ${typeof docxData}`);
      }

      this.log('ArrayBuffer prepared:', {
        size: arrayBuffer.byteLength,
        firstBytes: Array.from(new Uint8Array(arrayBuffer.slice(0, 10))),
      });

      // Create a new Blob with the correct MIME type
      const docxBlob = new Blob([arrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      this.log('Created DOCX blob:', {
        size: docxBlob.size,
        type: docxBlob.type,
        lastModified: docxBlob.lastModified
      });

      // Create FormData with detailed logging
      const formData = new FormData();
      formData.append('file', docxBlob, 'resume.docx');

      // Save DOCX first
      const saveResponse = await fetch(`${window.ServerManager.API_URL}/save-docx`, {
        method: 'POST',
        body: formData
      });

      if (!saveResponse.ok) {
        const errorText = await saveResponse.text();
        this.log('Save DOCX failed:', {
          status: saveResponse.status,
          statusText: saveResponse.statusText,
          error: errorText
        });
        throw new Error(`Failed to save DOCX: ${saveResponse.status} - ${errorText}`);
      }

      const saveResult = await saveResponse.json();
      this.log('DOCX saved successfully:', saveResult);

      // Request PDF conversion with enhanced error handling
      const pdfResponse = await fetch(`${window.ServerManager.API_URL}/compile-docx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileId: saveResult.fileId,
          originalName: docxData.originalName || 'resume.docx'
        })
      });

      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text();
        this.log('PDF conversion failed:', {
          status: pdfResponse.status,
          statusText: pdfResponse.statusText,
          error: errorText
        });
        throw new Error(`PDF generation failed: ${pdfResponse.status} - ${errorText}`);
      }

      const pdfBlob = await pdfResponse.blob();
      this.log('PDF generated:', {
        size: pdfBlob.size,
        type: pdfBlob.type,
        lastModified: pdfBlob.lastModified
      });

      return pdfBlob;
    } catch (error) {
      this.log('PDF generation error:', {
        message: error.message,
        stack: error.stack
      });
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
}

window.DocxService = DocxService; 
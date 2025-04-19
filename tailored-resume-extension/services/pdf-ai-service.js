class PdfAIAnalyzer extends AIService {
    constructor() {
      super();
      console.log('[PdfAIAnalyzer] Initialized with Tesseract support');
    }
  
    async extractTextWithOCR(file) {
      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      const Tesseract = window.Tesseract;
  
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
      let fullText = '';
  
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
  
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
  
        await page.render({ canvasContext: context, viewport }).promise;
  
        const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
        fullText += `\n\n--- OCR Page ${i} ---\n\n${text}`;
      }
  
      return fullText.trim();
    }
  
    async analyzePDFWithOCR(file, modelType = 'gemini', contentType = 'latex') {
      const text = await this.extractTextWithOCR(file);
      return await this.generateContent(text, contentType, modelType);
    }
  }
  
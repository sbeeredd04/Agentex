class PdfAIAnalyzer extends AIService {
    constructor() {
      super();
      console.log('[PdfAIAnalyzer] Initialized with Tesseract support');
    }
  
    async extractTextWithOCR(file) {
      const pdfjsLib = window.pdfjsLib;

      pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('lib/pdfs/pdf.worker.min.js');
    
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
      let fullText = '';

      const worker = await Tesseract.createWorker({
        workerPath: chrome.runtime.getURL('lib/vendor/worker.min.js')
      });
      
      console.log(typeof worker.load);

      await worker.load();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
  
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
  
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
  
        await page.render({ canvasContext: context, viewport }).promise;
  
        const { data: { text } } = await worker.recognize(canvas);
        fullText += `\n\n--- OCR Page ${i} ---\n\n${text}`;
      }

      await worker.terminate();
  
      return fullText.trim();
    }
  
    async analyzePDFWithOCR(file, modelType = 'gemini', contentType = 'latex') {
      const text = await this.extractTextWithOCR(file);
      return await this.generateContent(text, contentType, modelType);
    }
  }

  window.PdfAIAnalyzer = PdfAIAnalyzer;
  console.log('[PdfAIAnalyzer] Class registered globally');
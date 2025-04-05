class DocxAIService extends AIService {
  constructor() {
    super(); // Call parent constructor to initialize endpoints and models
    console.log('[DocxAIService] Initializing DOCX-specific AI Service');
  }

  // Add the missing loadApiKeys method
  async loadApiKeys() {
    console.log('[DocxAIService] Loading API keys');
    await this.loadSettings();
    return true;
  }

  // Define the default prompt as a static property
  static DEFAULT_PROMPT = `You are an expert ATS resume optimizer. Your task is to enhance this resume for the provided job description.
        
        Original Resume:
        {originalText}

        Job Description:
        {jobDescription}

        Additional Experience:
        {knowledgeBase}

        Instructions:
        1. Analyze the job description for key requirements and skills
        2. Maintain the exact same format and structure as the original
        3. Keep all section headers, dates, and contact information unchanged
        4. Focus on enhancing bullet points with relevant achievements and skills
        5. Ensure all modifications are factual and based on provided content
        6. Return the complete updated resume in plain text format
        7. Do not add any formatting markers or LaTeX commands
        8. Keep the same number of bullet points per section

        IMPORTANT: Return ONLY the plain text content that should replace the original.`;

  async generateContent(originalText, jobDescription, knowledgeBase, modelType = 'gemini', model = null) {
    try {
      console.log('[DocxAIService] Generating content:', {
        textLength: originalText?.length,
        jobDescLength: jobDescription?.length,
        hasKnowledgeBase: !!knowledgeBase,
        modelType,
        model
      });

      // Get custom prompt from storage or use default
      const { docxCustomPrompt } = await chrome.storage.local.get('docxCustomPrompt');
      const promptTemplate = docxCustomPrompt || DocxAIService.DEFAULT_PROMPT;

      // Replace placeholders in the prompt template
      const prompt = promptTemplate
        .replace('{originalText}', originalText || '')
        .replace('{jobDescription}', jobDescription || '')
        .replace('{knowledgeBase}', knowledgeBase || 'None provided');

      // Use parent class's generateContent method with 'docx' content type
      const response = await super.generateContent(prompt, 'docx', modelType, model);
      
      // Clean the response
      const cleanedResponse = this.cleanResponse(response);
      
      console.log('[DocxAIService] Content generation complete:', {
        originalLength: response?.length,
        cleanedLength: cleanedResponse?.length,
        sample: cleanedResponse?.substring(0, 100) + '...'
      });
      
      return cleanedResponse;
    } catch (error) {
      console.error('[DocxAIService] Generation error:', error);
      throw error;
    }
  }

  cleanResponse(text) {
    if (!text) {
      console.error('[DocxAIService] Received empty response');
      throw new Error('Empty response from AI service');
    }

    console.log('[DocxAIService] Cleaning response:', {
      before: text.length
    });

    // Remove any formatting markers and clean up the text
    let cleaned = text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\\[a-zA-Z]+{([^}]*)}/g, '$1') // Remove LaTeX commands
      .replace(/\\[a-zA-Z]+/g, '') // Remove other LaTeX markers
      .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
      .replace(/\[.*?\]/g, '') // Remove markdown-style links
      .replace(/\*\*|\*/g, '') // Remove bold/italic markers
      .trim();

    console.log('[DocxAIService] Cleaned response:', {
      after: cleaned.length,
      sample: cleaned.substring(0, 100) + '...'
    });

    return cleaned;
  }
}

window.DocxAIService = DocxAIService;
console.log('[DocxAIService] Class registered globally'); 
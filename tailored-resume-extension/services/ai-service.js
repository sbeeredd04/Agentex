class AIService {
  constructor() {
    console.log('[AIService] Initializing Multi-Model AI Service');
    
    // Initialize endpoints
    this.endpoints = {
      gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      groq: 'https://api.groq.com/openai/v1/chat/completions'
    };

    // Initialize models without API keys
    this.models = {
      gemini: {
        model: 'gemini-2.0-flash-thinking-exp-01-21'
      },
      groq: {
        models: {
          'deepseek-r1-distill-qwen-32b': {},
          'deepseek-r1-distill-llama-70b': {}
        }
      }
    };

    // Load API keys
    this.loadApiKeys();
  }

  async loadApiKeys() {
    const keys = await chrome.storage.local.get(['geminiApiKey', 'groqApiKey']);
    this.models.gemini.apiKey = keys.geminiApiKey;
    this.models.groq.apiKey = keys.groqApiKey;

    console.log('[AIService] API keys loaded:', {
      gemini: Boolean(this.models.gemini.apiKey),
      groq: Boolean(this.models.groq.apiKey)
    });
  }

  async generateWithCurrentModel(prompt) {
    console.log('[AIService] Generating with current model:', {
      type: this.currentModelSelection?.type,
      model: this.currentModelSelection?.model
    });

    if (this.currentModelSelection?.type === 'groq') {
      return await this._generateWithGroq(prompt, this.currentModelSelection.model);
    } else {
      return await this._generateWithGemini(prompt);
    }
  }

  async generateContent(prompt, contentType = 'latex', modelType = 'gemini', model = null) {
    try {
      console.log('[AIService] Generating content:', {
        contentType,
        modelType,
        model,
        promptLength: prompt.length
      });

      this.currentModelSelection = { type: modelType, model };

      // Add content type specific instructions
      let finalPrompt = prompt;
      if (contentType === 'docx') {
        finalPrompt += "\nIMPORTANT: Return ONLY plain text content without any formatting markers or LaTeX commands.";
        console.log('[AIService] Using DOCX-specific prompt');
      } else {
        console.log('[AIService] Using LaTeX-specific prompt');
      }

      const response = await this.generateWithCurrentModel(finalPrompt);
      
      // Clean response based on content type
      if (contentType === 'docx') {
        console.log('[AIService] Cleaning DOCX response');
        return this.cleanDocxResponse(response);
      }
      console.log('[AIService] Cleaning LaTeX response');
      return this.cleanLatexResponse(response);

    } catch (error) {
      console.error(`[AIService] ${contentType.toUpperCase()} Generation error:`, error);
      throw error;
    }
  }

  async _generateWithGemini(prompt) {
    console.log('[AIService] Gemini Generation Start:', {
      promptPreview: prompt.substring(0, 100) + '...',
      promptLength: prompt.length
    });

    try {
      const requestBody = {
        contents: [{
          parts: [{ text: prompt }]
        }]
      };

      console.log('[AIService] Gemini Request:', {
        endpoint: this.endpoints.gemini,
        requestBody: JSON.stringify(requestBody, null, 2)
      });

      const response = await fetch(`${this.endpoints.gemini}?key=${this.models.gemini.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json();
      
      console.log('[AIService] Gemini Raw Response:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData
      });

      if (!response.ok) {
        throw new Error(`Gemini API Error: ${responseData.error?.message || response.statusText}`);
      }

      if (!responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error('[AIService] Invalid Gemini response structure:', responseData);
        throw new Error('Invalid Gemini response structure');
      }

      const generatedContent = responseData.candidates[0].content.parts[0].text;
      
      console.log('[AIService] Gemini Generation Success:', {
        contentLength: generatedContent.length,
        contentPreview: '...' + generatedContent.substring(Math.max(0, generatedContent.length - 400))
      });

      return this._cleanResponse(generatedContent);
    } catch (error) {
      console.error('[AIService] Gemini Generation Error:', {
        error,
        stack: error.stack
      });
      throw error;
    }
  }

  async _generateWithGroq(prompt, specificModel) {
    const modelId = specificModel || 'deepseek-r1-distill-llama-70b';
    
    console.log('[AIService] Groq Generation Start:', {
      modelId,
      promptPreview: prompt.substring(0, 100) + '...',
      promptLength: prompt.length
    });

    try {
      const requestBody = {
        model: modelId,
        messages: [{
          role: "user",
          content: prompt
        }],
        reasoning_format: "hidden"
      };

      console.log('[AIService] Groq Request:', {
        endpoint: this.endpoints.groq,
        model: modelId,
        requestBody: JSON.stringify(requestBody, null, 2)
      });

      const response = await fetch(this.endpoints.groq, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.models.groq.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      const responseData = await response.json();
      
      console.log('[AIService] Groq Raw Response:', {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data: responseData
      });

      if (!response.ok) {
        throw new Error(`Groq API Error: ${responseData.error?.message || response.statusText}`);
      }

      if (!responseData.choices?.[0]?.message?.content) {
        console.error('[AIService] Invalid Groq response structure:', responseData);
        throw new Error('Invalid Groq response structure');
      }

      const generatedContent = responseData.choices[0].message.content;
      
      console.log('[AIService] Groq Generation Success:', {
        contentLength: generatedContent.length,
        contentPreview: '...' + generatedContent.substring(Math.max(0, generatedContent.length - 400)),
        usage: responseData.usage,
        modelId
      });

      return this._cleanResponse(generatedContent);
    } catch (error) {
      console.error('[AIService] Groq Generation Error:', {
        error,
        modelId,
        stack: error.stack
      });
      throw error;
    }
  }

  _cleanResponse(text) {
    console.log('[AIService] Cleaning response:', {
      before: {
        length: text.length,
        preview: '...' + text.substring(Math.max(0, text.length - 400))
      }
    });

    const cleaned = text
      .replace(/```latex\n/g, '')
      .replace(/```\n?/g, '')
      .replace(/\\boxed{/g, '')
      .replace(/\{\\displaystyle\s+/g, '')
      .trim();

    console.log('[AIService] Cleaned response:', {
      after: {
        length: cleaned.length,
        preview: '...' + cleaned.substring(Math.max(0, cleaned.length - 400))
      }
    });

    return cleaned;
  }

  cleanDocxResponse(response) {
    // Remove any LaTeX commands or other formatting
    let cleaned = response.replace(/\\[a-zA-Z]+{([^}]*)}/g, '$1');
    cleaned = cleaned.replace(/\\[a-zA-Z]+/g, '');
    return cleaned.trim();
  }

  cleanLatexResponse(response) {
    return this._cleanResponse(response);
  }
}

// Register the service globally
window.AIService = AIService;
console.log('[AIService] Class registered globally'); 
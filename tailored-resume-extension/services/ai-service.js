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

  async generateContent(prompt, modelType = 'gemini', specificModel = null) {
    console.log('[AIService] Generating content with:', {
      modelType,
      specificModel,
      promptLength: prompt.length
    });

    try {
      switch(modelType.toLowerCase()) {
        case 'gemini':
          return await this._generateWithGemini(prompt);
        case 'groq':
          return await this._generateWithGroq(prompt, specificModel);
        default:
          throw new Error(`Unsupported model type: ${modelType}`);
      }
    } catch (error) {
      console.error('[AIService] Generation error:', error);
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
}

// Register the service globally
window.AIService = AIService;
console.log('[AIService] Class registered globally'); 
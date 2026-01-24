/**
 * Claude AI Service for Resume Tailoring
 * 
 * Handles interactions with Anthropic's Claude API for resume optimization
 * 
 * @class ClaudeService
 * @module services/claude-service
 */

class ClaudeService {
  constructor() {
    console.log('[ClaudeService] Initializing Claude AI Service');
    
    this.apiVersion = '2023-06-01';
    this.apiKey = null;
    this.defaultModel = 'claude-3-5-sonnet-20241022';
    
    this.loadSettings();
  }

  async loadSettings() {
    try {
      const settings = await chrome.storage.local.get(['claudeApiKey']);
      this.apiKey = settings.claudeApiKey || null;
      
      console.log('[ClaudeService] Settings loaded', {
        hasApiKey: !!this.apiKey
      });
    } catch (error) {
      console.error('[ClaudeService] Error loading settings:', error);
    }
  }

  async generateContent(prompt, modelId = null) {
    try {
      const model = modelId || this.defaultModel;
      const config = window.ModelConfig?.getModelConfig('claude', model);
      
      if (!config) {
        throw new Error(`Invalid Claude model: ${model}`);
      }

      if (!this.apiKey) {
        throw new Error('Claude API key not configured');
      }

      console.log('[ClaudeService] Generating content', {
        model,
        promptLength: prompt.length
      });

      const response = await this._callClaudeAPI(prompt, config);
      return this._cleanResponse(response);

    } catch (error) {
      console.error('[ClaudeService] Generation error:', error);
      throw new Error(`Claude generation failed: ${error.message}`);
    }
  }

  async _callClaudeAPI(prompt, config) {
    const requestBody = {
      model: config.name.toLowerCase().replace(/\s+/g, '-'),
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    };

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': this.apiVersion
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.content || !data.content[0] || !data.content[0].text) {
      throw new Error('Invalid response format from Claude API');
    }

    return data.content[0].text;
  }

  _cleanResponse(text) {
    let cleaned = text.trim();
    
    // Remove markdown code blocks
    cleaned = cleaned.replace(/```latex\n?/g, '');
    cleaned = cleaned.replace(/```tex\n?/g, '');
    cleaned = cleaned.replace(/```\n?/g, '');
    
    // Remove extra whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    return cleaned;
  }

  async generateTailoredResume(latex, jobDesc, knowledgeBase) {
    const prompt = this._buildResumePrompt(latex, jobDesc, knowledgeBase);
    return await this.generateContent(prompt);
  }

  _buildResumePrompt(latex, jobDesc, knowledgeBase) {
    const basePrompt = window.GeminiPrompts?.LATEX_TAILORING_PROMPT || '';
    
    return `${basePrompt}

Original LaTeX Resume:
${latex}

Job Description:
${jobDesc}

Knowledge Base / Additional Experience:
${knowledgeBase}

Provide the complete tailored LaTeX resume code.`;
  }
}

// Make service available globally
if (typeof window !== 'undefined') {
  window.ClaudeService = ClaudeService;
}

console.log('[ClaudeService] Claude service module loaded');

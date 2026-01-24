/**
 * Multi-Model Configuration for Agentex
 * 
 * Supports both Google Gemini and Anthropic Claude models
 * with automatic fallback and optimal model selection
 * 
 * @module services/model-config
 */

console.log('[ModelConfig] Loading multi-model configuration');

/**
 * Model configurations for supported AI providers
 */
const MODEL_CONFIGS = {
  gemini: {
    'gemini-2.0-flash-exp': {
      name: 'Gemini 2.0 Flash (Experimental)',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
      maxTokens: 8192,
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      features: ['thinking', 'fast', 'latest'],
      recommended: true
    },
    'gemini-1.5-pro': {
      name: 'Gemini 1.5 Pro',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
      maxTokens: 8192,
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      features: ['accurate', 'detailed']
    },
    'gemini-1.5-flash': {
      name: 'Gemini 1.5 Flash',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      maxTokens: 8192,
      temperature: 0.7,
      topP: 0.95,
      topK: 40,
      features: ['fast', 'efficient']
    }
  },
  claude: {
    'claude-3-5-sonnet-20241022': {
      name: 'Claude 3.5 Sonnet',
      endpoint: 'https://api.anthropic.com/v1/messages',
      maxTokens: 8192,
      temperature: 0.7,
      features: ['accurate', 'detailed', 'thinking'],
      recommended: true
    },
    'claude-3-5-haiku-20241022': {
      name: 'Claude 3.5 Haiku',
      endpoint: 'https://api.anthropic.com/v1/messages',
      maxTokens: 8192,
      temperature: 0.7,
      features: ['fast', 'efficient']
    },
    'claude-3-opus-20240229': {
      name: 'Claude 3 Opus',
      endpoint: 'https://api.anthropic.com/v1/messages',
      maxTokens: 4096,
      temperature: 0.7,
      features: ['accurate', 'powerful']
    }
  }
};

/**
 * Get model configuration by provider and model ID
 * @param {string} provider - Provider name (gemini or claude)
 * @param {string} modelId - Model identifier
 * @returns {Object|null} Model configuration or null if not found
 */
function getModelConfig(provider, modelId) {
  return MODEL_CONFIGS[provider]?.[modelId] || null;
}

/**
 * Get all available models for a provider
 * @param {string} provider - Provider name
 * @returns {Object} All models for the provider
 */
function getProviderModels(provider) {
  return MODEL_CONFIGS[provider] || {};
}

/**
 * Get recommended model for a provider
 * @param {string} provider - Provider name
 * @returns {string|null} Recommended model ID or null
 */
function getRecommendedModel(provider) {
  const models = MODEL_CONFIGS[provider];
  if (!models) return null;
  
  for (const [modelId, config] of Object.entries(models)) {
    if (config.recommended) return modelId;
  }
  
  return Object.keys(models)[0];
}

/**
 * Get all available providers
 * @returns {Array<string>} List of provider names
 */
function getAvailableProviders() {
  return Object.keys(MODEL_CONFIGS);
}

// Export configuration
if (typeof window !== 'undefined') {
  window.ModelConfig = {
    MODEL_CONFIGS,
    getModelConfig,
    getProviderModels,
    getRecommendedModel,
    getAvailableProviders
  };
}

console.log('[ModelConfig] Multi-model configuration loaded', {
  providers: Object.keys(MODEL_CONFIGS),
  totalModels: Object.values(MODEL_CONFIGS).reduce((sum, p) => sum + Object.keys(p).length, 0)
});

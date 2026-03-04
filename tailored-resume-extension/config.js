/**
 * Configuration — Agentex Resume Editor v4.1
 * 
 * Model registry, API endpoints, dev/prod detection, analytics helpers.
 */

console.log('[Config] Loading configuration module');

// Detect dev mode: unpacked extension has no update_url
const IS_DEV = false;

// (() => {
//   try {
//     const manifest = chrome.runtime.getManifest();
//     return !manifest.update_url;
//   } catch { return true; }
// })();

const config = {
  APP_NAME: 'Agentex Resume Editor',
  APP_VERSION: '4.1',
  IS_DEV,

  // ===========================================
  // AI MODEL REGISTRY (Updated Feb 2026)
  // ===========================================
  MODELS: {
    gemini: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', tier: 'recommended', description: 'Best price-performance, fast reasoning' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', tier: 'premium', description: 'Deep reasoning, 1M context' },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', tier: 'budget', description: 'Fastest, cheapest multimodal' },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', tier: 'preview', description: 'Frontier performance (preview)' },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', tier: 'preview', description: 'Most intelligent (preview)' },
    ],
    claude: [
      { id: 'claude-sonnet-4-6-20260217', name: 'Claude Sonnet 4.6', tier: 'recommended', description: 'Best balance, 200K context' },
      { id: 'claude-opus-4-6-20260205', name: 'Claude Opus 4.6', tier: 'premium', description: 'Most capable, complex tasks' },
      { id: 'claude-opus-4-5-20251124', name: 'Claude Opus 4.5', tier: 'premium', description: 'Coding, agents, extended thinking' },
      { id: 'claude-haiku-4-5-20251015', name: 'Claude Haiku 4.5', tier: 'budget', description: 'Fast, affordable, near-frontier' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', tier: 'standard', description: 'Balanced speed and quality' },
    ],
    groq: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', tier: 'recommended', description: 'Powerful, great reasoning' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Groq)', tier: 'budget', description: 'Fast, efficient' },
      { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1 Llama 70B (Groq)', tier: 'standard', description: 'Balanced performance' }
    ],
    openrouter: [
      { id: 'meta-llama/llama-3-8b-instruct:free', name: 'Llama 3 8B (Free)', tier: 'budget', description: 'Free model from Meta' },
      { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)', tier: 'budget', description: 'Free model from Mistral' },
      { id: 'openai/gpt-3.5-turbo', name: 'ChatGPT 3.5 Turbo', tier: 'standard', description: 'Fast, classic OpenAI model' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B (OR)', tier: 'recommended', description: 'Meta\'s powerful model' },
      { id: 'anthropic/claude-3.7-sonnet', name: 'Claude 3.7 Sonnet (OR)', tier: 'premium', description: 'Anthropic\'s newest model' }
    ]
  },

  DEFAULT_PROVIDER: 'gemini',
  DEFAULT_GEMINI_MODEL: 'gemini-2.5-flash',
  DEFAULT_CLAUDE_MODEL: 'claude-sonnet-4-6-20260217',

  // ===========================================
  // API ENDPOINTS
  // ===========================================
  GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models',
  CLAUDE_ENDPOINT: 'https://api.anthropic.com/v1/messages',
  ANTHROPIC_VERSION: '2023-06-01',
  GROQ_ENDPOINT: 'https://api.groq.com/openai/v1/chat/completions',
  OPENROUTER_ENDPOINT: 'https://openrouter.ai/api/v1/chat/completions',

  // ===========================================
  // SERVER (auto-detect dev/prod)
  // ===========================================
  get SERVER_URL() {
    return IS_DEV ? 'http://localhost:3000' : 'https://api.agentex.sriujjwalreddy.com';
  },

  // ===========================================
  // GENERATION SETTINGS
  // ===========================================
  GENERATION: {
    temperature: 0.3,
    maxOutputTokens: 8192,
    retryDelayMs: 2000,
    maxRetries: 2,
    cooldownMs: 3000,
  },

  // ===========================================
  // GUARDRAILS
  // ===========================================
  GUARDRAILS: {
    MAX_LENGTH_DEVIATION: 0.20,
    PROTECTED_SECTIONS: ['education', 'contact', 'name'],
    REQUIRED_LATEX_PATTERNS: [
      '\\\\documentclass',
      '\\\\begin\\{document\\}',
      '\\\\end\\{document\\}'
    ],
    FABRICATION_INDICATORS: [
      /\b(invented|fabricated|imaginary|fictional)\b/i,
      /\b(approximately|roughly|about)\s+\d+\s*(years|months)/i,
      /\b(various|many|several)\s+(companies|organizations|firms)/i
    ],
    MAX_VALIDATION_RETRIES: 2,
    SIMILARITY_THRESHOLD: 0.7,
  },

  INSTRUCTION_LIMITS: {
    MAX_CUSTOM_INSTRUCTIONS_LENGTH: 2000,
    MAX_PRESERVE_ITEMS: 10,
    MAX_FOCUS_AREAS: 5
  },

  // ===========================================
  // BUG REPORTING
  // ===========================================
  BUG_REPORT_URL: 'https://github.com/sbeeredd04/Agentex/issues/new',

  // ===========================================
  // HELPERS
  // ===========================================

  getModel(provider, modelId) {
    return this.MODELS[provider]?.find(m => m.id === modelId);
  },

  getRecommended(provider) {
    return this.MODELS[provider]?.find(m => m.tier === 'recommended');
  },

  getAllModels() {
    return [
      ...this.MODELS.gemini.map(m => ({ ...m, provider: 'gemini' })),
      ...this.MODELS.claude.map(m => ({ ...m, provider: 'claude' })),
      ...(this.MODELS.groq || []).map(m => ({ ...m, provider: 'groq' })),
      ...(this.MODELS.openrouter || []).map(m => ({ ...m, provider: 'openrouter' })),
    ];
  },

  geminiUrl(modelId) {
    return `${this.GEMINI_ENDPOINT}/${modelId}:generateContent`;
  },

  // Analytics helpers
  async trackGeneration(provider, modelId, success) {
    try {
      const data = await chrome.storage.local.get(['analytics']);
      const analytics = data.analytics || { generations: 0, errors: 0, models: {}, lastUsed: null };
      analytics.generations++;
      if (!success) analytics.errors++;
      const key = `${provider}:${modelId}`;
      analytics.models[key] = (analytics.models[key] || 0) + 1;
      analytics.lastUsed = new Date().toISOString();
      await chrome.storage.local.set({ analytics });
    } catch (e) { /* silent */ }
  },

  async getAnalytics() {
    const data = await chrome.storage.local.get(['analytics']);
    return data.analytics || { generations: 0, errors: 0, models: {}, lastUsed: null };
  }
};

// Export globally
if (typeof window !== 'undefined') {
  window.config = config;
  window.AgentexConfig = config;
}
if (typeof self !== 'undefined') {
  self.config = config;
  self.AgentexConfig = config;
}

console.log('[Config]', IS_DEV ? 'DEV mode' : 'PROD mode', {
  version: config.APP_VERSION,
  server: config.SERVER_URL,
  gemini: config.MODELS.gemini.length,
  claude: config.MODELS.claude.length,
  groq: config.MODELS.groq.length,
  openrouter: config.MODELS.openrouter.length
});
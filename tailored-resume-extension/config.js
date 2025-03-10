// Add debugging
console.log('Loading config.js');

const config = {
  GEMINI_API_KEY: 'AIzaSyCsVeBSru9Wu51L9QA8EIjWlP2_Zow4FC8',
  GROQ_API_KEY: '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',
};

// Make it available globally instead of using export
window.config = config;
console.log('Config loaded:', config);
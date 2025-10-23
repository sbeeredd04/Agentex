/**
 * Configuration module for Agentex Resume Editor
 * 
 * This module provides centralized configuration for the Chrome extension,
 * including API endpoints and default settings for the Gemini AI service.
 * 
 * @module config
 */

console.log('[Config] Loading configuration module');

/**
 * Application configuration object
 * @type {Object}
 * @property {string} GEMINI_API_KEY - Default Gemini API key (can be overridden in settings)
 * @property {string} GEMINI_MODEL - Default Gemini model to use
 * @property {string} GEMINI_ENDPOINT - Gemini API endpoint
 */
const config = {
  // Gemini AI Configuration
  GEMINI_API_KEY: 'AIzaSyCsVeBSru9Wu51L9QA8EIjWlP2_Zow4FC8',
  GEMINI_MODEL: 'gemini-2.0-flash',
  GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  
  // Application Settings
  APP_NAME: 'Agentex Resume Editor',
  APP_VERSION: '2.0',
  
  // Server Configuration
  SERVER_URL: 'https://agentex.onrender.com'
};

// Make configuration available globally
window.config = config;

console.log('[Config] Configuration loaded successfully', {
  appName: config.APP_NAME,
  version: config.APP_VERSION,
  geminiModel: config.GEMINI_MODEL
});
/**
 * Utility functions for text processing in the AI Service
 */

/**
 * Detect the language of a text string
 * @param {string} text - Input text
 * @returns {string} - Language code ('en', 'he', etc.)
 */
function detectLanguage(text) {
  if (!text || typeof text !== 'string') return 'en';
  
  // Simple language detection (just Hebrew/English for now)
  // Hebrew unicode range is generally 0x0590-0x05FF
  const hebrewPattern = /[\u0590-\u05FF]/;
  
  return hebrewPattern.test(text) ? 'he' : 'en';
}

/**
 * Normalize text for better matching
 * @param {string} text - Input text
 * @returns {string} - Normalized text
 */
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '') // Remove punctuation
    .replace(/\s{2,}/g, ' '); // Remove extra spaces
}

module.exports = {
  detectLanguage,
  normalizeText
}; 
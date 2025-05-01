/**
 * Chat utility functions
 */

/**
 * Detect if text contains Hebrew characters
 * @param {string} text - Text to analyze
 * @returns {boolean} - True if text contains Hebrew characters
 */
export const isHebrewText = (text) => {
  if (!text) return false;
  // Hebrew Unicode range is generally 0x0590-0x05FF
  const hebrewPattern = /[\u0590-\u05FF]/;
  return hebrewPattern.test(text);
};

const faqService = require('./services/faqService');
const openaiService = require('./services/openaiService');
const { detectLanguage } = require('./utils/textUtils');

/**
 * Process chat messages through the AI pipeline
 * @param {string} message - User message
 * @param {string} language - User language preference (optional, will auto-detect if not provided)
 * @returns {object} - AI response with metadata
 */
async function processMessage(message, language = null) {
  if (!message) {
    return {
      text: "Please provide a message",
      source: "system",
      success: false
    };
  }
  
  // Auto-detect language if not provided
  const detectedLanguage = language || detectLanguage(message);
  
  // Step 1: Check for FAQ match
  const faqMatch = faqService.matchFAQ(message, detectedLanguage);
  
  // Only use FAQ match if confidence is high enough (above 0.3)
  if (faqMatch && faqMatch.confidence >= 0.3) {
    return {
      text: faqMatch.response,
      source: "faq",
      confidence: faqMatch.confidence,
      language: detectedLanguage,
      success: true
    };
  }
  
  // Step 2: Use OpenAI if no FAQ match or low confidence
  try {
    const aiResponse = await openaiService.generateResponse(message, detectedLanguage);
    return {
      text: aiResponse.text,
      source: "openai",
      model: aiResponse.model,
      language: detectedLanguage,
      success: true
    };
  } catch (error) {
    console.error('Error generating AI response:', error);
    return {
      text: detectedLanguage === 'he' 
        ? 'מצטער, נתקלתי בשגיאה. אנא נסה שוב מאוחר יותר.'
        : 'Sorry, I encountered an error. Please try again later.',
      source: "system",
      language: detectedLanguage,
      success: false
    };
  }
}

module.exports = {
  processMessage
};
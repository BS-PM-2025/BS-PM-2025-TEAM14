const fs = require('fs');
const path = require('path');
const { normalizeText } = require('../utils/textUtils');

// Load FAQ data
let faqData = [];
try {
  const dataPath = path.join(__dirname, '../data/faq_data.json');
  const rawData = fs.readFileSync(dataPath, 'utf8');
  const parsedData = JSON.parse(rawData);
  faqData = parsedData.faqs;
} catch (error) {
  console.error('Error loading FAQ data:', error);
}

/**
 * Find the longest common subsequence between two arrays
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @returns {number} - Length of longest common subsequence
 */
function longestCommonSubsequence(arr1, arr2) {
  if (!arr1.length || !arr2.length) return 0;
  
  const dp = Array(arr1.length + 1)
    .fill(0)
    .map(() => Array(arr2.length + 1).fill(0));
  
  for (let i = 1; i <= arr1.length; i++) {
    for (let j = 1; j <= arr2.length; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  return dp[arr1.length][arr2.length];
}

/**
 * Calculate the similarity score between two strings
 * @param {string} query - User query
 * @param {string} pattern - FAQ pattern
 * @returns {number} - Similarity score between 0 and 1
 */
function calculateSimilarity(query, pattern) {
  // Case 1: Exact match
  if (query === pattern) return 1.0;
  
  // Case 2: One contains the other entirely
  if (query.includes(pattern)) return 0.9;
  if (pattern.includes(query)) return 0.8;
  
  // Split into words
  const queryWords = query.split(/\s+/).filter(w => w.length > 2);
  const patternWords = pattern.split(/\s+/).filter(w => w.length > 2);
  
  if (!queryWords.length || !patternWords.length) return 0;
  
  // Case 3: Check for individual word matches
  let matchedWords = 0;
  for (const word of queryWords) {
    if (patternWords.includes(word)) {
      matchedWords++;
    }
  }
  
  const wordMatchScore = matchedWords / Math.max(queryWords.length, patternWords.length);
  
  // Case 4: Check for word sequence matches using LCS
  const lcsLength = longestCommonSubsequence(queryWords, patternWords);
  const sequenceScore = lcsLength / Math.max(queryWords.length, patternWords.length);
  
  // Combined score with weights
  return Math.max(
    wordMatchScore * 0.7,
    sequenceScore * 0.9
  );
}

/**
 * Extract keywords from a question
 * @param {string} text - Input text
 * @returns {Array} - Array of keywords
 */
function extractKeywords(text) {
  // Simple keyword extraction - remove common words
  const stopWords = ['a', 'an', 'the', 'is', 'are', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 
                     'how', 'what', 'where', 'when', 'who', 'why', 'can', 'do', 'does', 'did',
                     'for', 'to', 'in', 'on', 'at', 'by', 'with', 'about', 'as', 'of'];
  
  return text
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));
}

/**
 * Find the best matching FAQ for a user query
 * @param {string} query - User's question
 * @param {string} language - Language code (en, he)
 * @returns {object|null} - Matching FAQ with response or null if no match
 */
function matchFAQ(query, language = 'en') {
  if (!query || !faqData.length) return null;
  
  // Normalize query for better matching
  const normalizedQuery = normalizeText(query);
  const queryKeywords = extractKeywords(normalizedQuery);
  
  let bestMatch = null;
  let highestScore = 0;
  
  // Check each FAQ for pattern matches
  for (const faq of faqData) {
    const patterns = faq.patterns[language] || faq.patterns.en; // Fallback to English
    
    // Try each pattern and find the best match
    for (const pattern of patterns) {
      const normalizedPattern = normalizeText(pattern);
      
      // Calculate main similarity
      const similarityScore = calculateSimilarity(normalizedQuery, normalizedPattern);
      
      // Calculate keyword overlap separately
      const patternKeywords = extractKeywords(normalizedPattern);
      let keywordMatches = 0;
      
      for (const keyword of queryKeywords) {
        if (patternKeywords.includes(keyword)) {
          keywordMatches++;
        }
      }
      
      const keywordScore = queryKeywords.length > 0 
        ? keywordMatches / queryKeywords.length 
        : 0;
      
      // Combined score with emphasis on keyword matching
      const finalScore = Math.max(
        similarityScore,
        keywordScore * 0.8
      );
      
      if (finalScore > highestScore) {
        highestScore = finalScore;
        bestMatch = {
          id: faq.id,
          response: faq.response[language] || faq.response.en,
          confidence: finalScore
        };
      }
    }
  }
  
  // Return best match if confidence is above threshold
  return highestScore > 0.1 ? bestMatch : null;
}

module.exports = {
  matchFAQ
};

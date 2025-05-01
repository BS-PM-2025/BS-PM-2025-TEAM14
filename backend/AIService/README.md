# AI Service

A multilingual FAQ matching and AI response service for the academic portal.

## Overview

The AI Service processes user queries in both English and Hebrew, attempting to match them against a database of frequently asked questions. If a match is found with sufficient confidence, the predefined answer is returned. Otherwise, the query is forwarded to a more general AI service (OpenAI).

## Setup

### Installation
```bash
cd backend/AIService
npm install
```

### OpenAI API Key Setup
To use the OpenAI integration:

1. Create a `.env` file in the `backend` directory with the following content:
```
OPENAI_API_KEY=your_openai_api_key_here
```

2. Replace `your_openai_api_key_here` with your actual OpenAI API key.

3. Make sure the `.env` file is added to your `.gitignore` to avoid committing the API key to version control.

## Components

- **FAQ Matching**: Uses a sophisticated text similarity algorithm to match user queries against patterns
- **Language Detection**: Automatically detects whether the user is using English or Hebrew 
- **Fallback to OpenAI**: For queries that don't match FAQ patterns

## Files

- `index.js` - Main entry point for the service
- `services/faqService.js` - FAQ matching implementation
- `services/openaiService.js` - OpenAI API integration (currently stubbed)
- `utils/textUtils.js` - Text processing utilities
- `data/faq_data.json` - Multilingual FAQ data
- `test.js` - Simple test script

## Usage

```javascript
const aiService = require('./AIService');

// Process a message with automatic language detection
const response = await aiService.processMessage("How do I appeal my grade?");
console.log(response);
// {
//   text: "You can submit a grade appeal through the 'Requests' section...",
//   source: "faq",
//   confidence: 0.85,
//   language: "en",
//   success: true
// }

// Process a message with specified language
const hebrewResponse = await aiService.processMessage("ערעור ציון", "he");
```

## FAQ Data Structure

The `faq_data.json` file contains patterns and responses in both English and Hebrew:

```json
{
  "faqs": [
    {
      "id": "grade_appeal",
      "patterns": {
        "en": ["grade appeal", "appeal grade", ...],
        "he": ["ערעור ציון", "לערער על ציון", ...]
      },
      "response": {
        "en": "You can submit a grade appeal through...",
        "he": "ניתן להגיש ערעור ציון דרך..."
      }
    },
    ...
  ]
}
```

## Improving FAQ Matching

The current matching algorithm uses:

1. Exact pattern matching
2. Substring matching
3. Word-level similarity
4. Sequence matching using longest common subsequence
5. Keyword extraction and matching

To improve matching:
- Add more patterns to frequently asked questions
- Adjust the confidence threshold in index.js
- Consider implementing more advanced NLP techniques

## Future Improvements

- Implement real OpenAI integration
- Add more sophisticated NLP for better matching
- Implement feedback loop for improving matching over time
- Add more language support 
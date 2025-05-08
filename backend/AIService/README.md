# AI Service

A multilingual FAQ matching and AI response service for the academic portal.

## Overview

The AI Service processes user queries in both English and Hebrew, attempting to match them against a database of frequently asked questions. If a match is found with sufficient confidence, the predefined answer is returned. Otherwise, the query is forwarded to OpenAI's API.

## Setup

### Installation
```bash
cd backend/AIService
pip install -r requirements.txt
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
- **OpenAI Integration**: For queries that don't match FAQ patterns
- **Real-time Voice Input**: Browser-based speech recognition for voice queries

## Files

- `__init__.py` - Main implementation of the AI Service
- `data/faq_data.json` - Multilingual FAQ data

## Usage

The AI service is imported by the FastAPI backend and exposed via the `/api/ai/chat` endpoint:

```python
from AIService import processMessage

# Used within FastAPI route:
async def chat_endpoint(request_data: dict):
    response = await processMessage(request_data["message"])
    return response
```

Example response:
```json
{
  "text": "You can submit a grade appeal through the 'Requests' section...",
  "source": "faq",
  "confidence": 0.85,
  "language": "en",
  "success": true
}
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

## Technical Implementation

The service uses Python with the following features:

1. OpenAI API integration via the official Python SDK
2. Language detection for multilingual support
3. FAQ matching using keyword extraction and similarity algorithms
4. Graceful fallbacks when the API is unavailable

## Frontend Integration

The frontend integrates with the AI service through:

1. Text chat interface with RTL/LTR language support
2. Voice input via browser's Web Speech API
3. Real-time typing indicators and message history 
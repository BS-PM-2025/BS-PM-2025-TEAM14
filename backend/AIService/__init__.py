"""
Python wrapper for the Node.js AI Service.
This allows using the AI service from FastAPI.
"""
import asyncio
import json
import os
import sys
import re
from typing import Optional, Dict, Any, List, Tuple
import dotenv
from pathlib import Path

# Load environment variables from .env file in backend directory
backend_dir = Path(__file__).parent.parent
dotenv_path = backend_dir / '.env'
print(f"DEBUG: Looking for .env file at: {dotenv_path}")
dotenv.load_dotenv(dotenv_path)

# Check if OpenAI is available; if not, use simulated responses
try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
    print("DEBUG: OpenAI module imported successfully")
    
    # Initialize OpenAI client
    openai_api_key = os.environ.get('OPENAI_API_KEY')
    print(f"DEBUG: OpenAI API key found: {openai_api_key is not None}")
    if openai_api_key:
        try:
            # Create the client as a global variable
            global openai_client
            openai_client = AsyncOpenAI(api_key=openai_api_key)
            print("DEBUG: OpenAI client initialized with API key")
        except Exception as e:
            print(f"ERROR: Failed to initialize OpenAI client: {e}")
            OPENAI_AVAILABLE = False
    else:
        print("DEBUG: OpenAI API key not found in environment variables")
        OPENAI_AVAILABLE = False
except ImportError:
    OPENAI_AVAILABLE = False
    print("DEBUG: OpenAI module not installed, using simulated responses")


# Load the FAQ data from the JSON file
def load_faq_data():
    """Load FAQ data from the JSON file"""
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        data_path = os.path.join(script_dir, 'data', 'faq_data.json')
        print(f"DEBUG: Loading FAQ data from {data_path}")
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"DEBUG: Loaded {len(data.get('faqs', []))} FAQs")
        return data.get('faqs', [])
    except Exception as e:
        print(f"ERROR loading FAQ data: {e}")
        return []


# Global variable to store FAQ data
FAQ_DATA = load_faq_data()


def process_keywords(text: str, language: str = "en") -> List[str]:
    """
    Extract keywords from text by removing stop words
    
    Args:
        text: The input text to process
        language: The language code (en or he)
        
    Returns:
        List of keywords
    """
    # Simple word tokenization by splitting on spaces and removing punctuation
    words = re.findall(r'\b\w+\b', text.lower())
    
    # Basic stop words (can be expanded)
    stop_words = {
        "en": {'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'in', 'on', 'at', 'to', 'for', 'with', 'my', 'can', 'i', 'do', 'how', 'where'},
        "he": {'אני', 'את', 'אתה', 'הוא', 'היא', 'הם', 'הן', 'אנחנו', 'אתם', 'אתן', 'של', 'שלי', 'שלך', 'שלו', 'שלה', 'שלנו', 'שלכם', 'שלכן', 'שלהם', 'שלהן', 'עם', 'על', 'אל', 'מן', 'כי', 'אם', 'או', 'אז', 'כן', 'לא', 'גם', 'רק', 'כמו', 'אבל', 'איך', 'מה'}
    }
    
    # Filter out stop words for the specified language or use English as fallback
    language_stop_words = stop_words.get(language, stop_words["en"])
    keywords = [word for word in words if word not in language_stop_words]
    
    # Handle Hebrew definite articles
    if language == "he":
        keywords = [word[1:] if word.startswith('ה') else word for word in keywords]
    
    return keywords


def calculate_match_score(query: str, pattern: str, language: str = "en") -> Tuple[float, str]:
    """
    Calculate match score between query and pattern
    
    Args:
        query: The user's query
        pattern: The FAQ pattern to match against
        language: The language code (en or he)
        
    Returns:
        Tuple of (confidence score, match type)
    """
    query_lower = query.lower()
    pattern_lower = pattern.lower()
    
    # Exact match
    if query_lower == pattern_lower:
        return 1.0, "exact"
    
    # Check if pattern is contained in query or vice versa
    if pattern_lower in query_lower:
        return 0.9 * (len(pattern_lower) / len(query_lower)), "pattern_in_query"
    if query_lower in pattern_lower:
        return 0.8 * (len(query_lower) / len(pattern_lower)), "query_in_pattern"
    
    # Keyword matching
    query_keywords = process_keywords(query_lower, language)
    pattern_keywords = process_keywords(pattern_lower, language)
    
    if not query_keywords or not pattern_keywords:
        return 0.0, "no_keywords"
    
    # Count matching keywords
    # Special handling for Hebrew to address compound words
    if language == "he":
        matches = 0
        for qk in query_keywords:
            for pk in pattern_keywords:
                # Check if one keyword is part of the other
                if qk in pk or pk in qk:
                    matches += 1
                    break
    else:
        # For English, count distinct matches
        matches = sum(1 for kw in query_keywords if any(kw in pkw or pkw in kw for pkw in pattern_keywords))
    
    # Calculate score based on keyword matches
    if matches > 0:
        # For Hebrew, we reduce the threshold to account for complex word forms
        multiplier = 0.8 if language == "en" else 0.7
        score = multiplier * (matches / max(len(query_keywords), len(pattern_keywords)))
        return score, "keyword"
    
    return 0.0, "no_match"


async def call_openai_api(message: str, language: str) -> Dict[str, Any]:
    """
    Call the OpenAI API to generate a response
    
    Args:
        message: The user's message
        language: The language code (en, he)
        
    Returns:
        Response data
    """
    try:
        # Check if we have a client available in the module's global scope
        client_available = OPENAI_AVAILABLE and 'openai_client' in globals()
        print(f"DEBUG: OpenAI client available: {client_available}")
        
        # If OpenAI is available and configured, use it
        if client_available:
            print(f"DEBUG: OpenAI API key available: {os.environ.get('OPENAI_API_KEY') is not None}")
            print(f"DEBUG: Attempting to call OpenAI API for: '{message}'")
            
            try:
                # Set system message based on language
                system_message = "You are a helpful assistant for an academic portal. Keep answers brief and focused."
                if language == "he":
                    system_message = "אתה עוזר מועיל לפורטל אקדמי. שמור על תשובות קצרות וממוקדות."
                
                # Call the API
                response = await openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_message},
                        {"role": "user", "content": message}
                    ],
                    max_tokens=150
                )
                
                print(f"DEBUG: OpenAI API call successful")
                return {
                    "text": response.choices[0].message.content,
                    "source": "openai",
                    "model": response.model,
                    "language": language,
                    "success": True
                }
            except Exception as api_error:
                print(f"DEBUG: OpenAI API call failed with error: {api_error}")
                raise  # Re-raise to be caught by outer try/except
        else:
            # Fall back to default responses if OpenAI is not available
            missing_reasons = []
            if not OPENAI_AVAILABLE:
                missing_reasons.append("OpenAI module not configured properly")
            if 'openai_client' not in globals():
                missing_reasons.append("OpenAI client not initialized")
                
            print(f"DEBUG: Using fallback response because: {', '.join(missing_reasons)}")
            default_responses = {
                "en": "I can help you with questions about the academic system. Please ask a more specific question.",
                "he": "אני יכול לעזור לך עם שאלות לגבי המערכת האקדמית. אנא שאל שאלה ספציפית יותר."
            }
            
            return {
                "text": default_responses.get(language, default_responses["en"]),
                "source": "openai_fallback",  # Changed from 'openai' to 'openai_fallback' to distinguish
                "model": "default_response",
                "language": language,
                "success": True
            }
    except Exception as e:
        print(f"ERROR with OpenAI API: {e}")
        error_messages = {
            "en": "Sorry, I encountered an error with the AI service. Please try again later.",
            "he": "מצטער, נתקלתי בשגיאה בשירות הבינה המלאכותית. אנא נסה שוב מאוחר יותר."
        }
        
        return {
            "text": error_messages.get(language, error_messages["en"]),
            "source": "openai_error",
            "language": language,
            "success": False
        }


async def processMessage(message: str, language: Optional[str] = None) -> Dict[str, Any]:
    """
    Process a message through the AI service.
    
    Args:
        message: The user's message text
        language: Optional language code (if not provided, will be auto-detected)
        
    Returns:
        Dictionary with AI response data
    """
    print(f"\nDEBUG: Processing message: '{message}', language: {language}")
    
    try:
        # Handle empty or None message
        if not message or not message.strip():
            error_messages = {
                "en": "Please provide a question or request.",
                "he": "אנא ספק שאלה או בקשה."
            }
            return {
                "text": error_messages.get(language, error_messages["en"]),
                "source": "system",
                "language": language or "en",
                "success": False
            }
        
        # Detect language (very basic)
        if not language:
            # Hebrew characters are in this Unicode range
            hebrew_pattern = any(ord(c) >= 0x0590 and ord(c) <= 0x05FF for c in message)
            detected_language = "he" if hebrew_pattern else "en"
        else:
            detected_language = language
            
        print(f"DEBUG: Detected language: {detected_language}")
            
        # Check if message matches any FAQ patterns
        normalized_message = message.lower().strip()
        best_match = None
        highest_confidence = 0
        match_type = ""
        
        print(f"DEBUG: Checking {len(FAQ_DATA)} FAQs")
        
        for faq in FAQ_DATA:
            patterns = faq.get('patterns', {}).get(detected_language, []) or faq.get('patterns', {}).get('en', [])
            for pattern in patterns:
                confidence, match_method = calculate_match_score(normalized_message, pattern, detected_language)
                
                if confidence > highest_confidence:
                    highest_confidence = confidence
                    best_match = faq
                    match_type = match_method
                
                # Early return on exact match
                if match_method == "exact":
                    print(f"DEBUG: Exact match found for: {normalized_message}")
                    response_text = faq.get('response', {}).get(detected_language) or faq.get('response', {}).get('en')
                    return {
                        "text": response_text,
                        "source": "faq",
                        "confidence": confidence,
                        "language": detected_language,
                        "match_type": match_method,
                        "success": True
                    }
                        
        # Return FAQ response if good match found (lower threshold for Hebrew)
        threshold = 0.2 if detected_language == "he" else 0.25
        print(f"DEBUG: Best match: {best_match['id'] if best_match else 'None'}, confidence: {highest_confidence}, match_type: {match_type}")
        
        if best_match and highest_confidence > threshold:
            response_text = best_match.get('response', {}).get(detected_language) or best_match.get('response', {}).get('en')
            if response_text:
                # Simulate processing delay
                await asyncio.sleep(0.2)
                print(f"DEBUG: Returning FAQ response with confidence {highest_confidence}")
                return {
                    "text": response_text,
                    "source": "faq",
                    "confidence": highest_confidence,
                    "language": detected_language,
                    "match_type": match_type,
                    "success": True
                }
        
        # If no FAQ match, use OpenAI API
        print(f"DEBUG: No FAQ match found, falling back to OpenAI")
        openai_response = await call_openai_api(message, detected_language)
        print(f"DEBUG: OpenAI response source: {openai_response.get('source')}")
        return openai_response
    
    except Exception as e:
        print(f"ERROR in processMessage: {e}")
        error_messages = {
            "en": "Sorry, I encountered an error. Please try again later.",
            "he": "מצטער, נתקלתי בשגיאה. אנא נסה שוב מאוחר יותר."
        }
        
        return {
            "text": error_messages.get(detected_language, error_messages["en"]),
            "source": "system",
            "language": detected_language,
            "success": False
        } 
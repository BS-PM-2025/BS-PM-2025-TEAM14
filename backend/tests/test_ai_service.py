import pytest
from backend.AIService import (
    processMessage,
    process_keywords,
    calculate_match_score,
    call_openai_api
)

# Test process_keywords function
def test_process_keywords_english():
    text = "How do I submit my assignment?"
    keywords = process_keywords(text, "en")
    assert "submit" in keywords
    assert "assignment" in keywords
    assert "how" not in keywords  # should be removed as stop word

def test_process_keywords_hebrew():
    text = "איך אני מגיש את המטלה שלי?"
    keywords = process_keywords(text, "he")
    assert "מגיש" in keywords
    assert "מטלה" in keywords
    assert "אני" not in keywords  # should be removed as stop word

# Test calculate_match_score function
def test_calculate_match_score_exact():
    score, match_type = calculate_match_score(
        "How to submit assignment",
        "How to submit assignment"
    )
    assert score == 1.0
    assert match_type == "exact"

def test_calculate_match_score_partial():
    score, match_type = calculate_match_score(
        "How to submit my assignment for CS101",
        "How to submit assignment"
    )
    assert score > 0.5  # Should have a good match score
    assert match_type in ["pattern_in_query", "query_in_pattern", "keyword"]

def test_calculate_match_score_no_match():
    score, match_type = calculate_match_score(
        "What is the weather?",
        "How to submit assignment"
    )
    assert score < 0.3  # Should have a low match score
    assert match_type in ["no_match", "no_keywords"]

# Test processMessage function
@pytest.mark.asyncio
async def test_process_message_english():
    response = await processMessage("How do I submit my assignment?", "en")
    assert isinstance(response, dict)
    assert "text" in response
    assert "source" in response
    assert "success" in response
    assert response["success"] is True

@pytest.mark.asyncio
async def test_process_message_hebrew():
    response = await processMessage("איך אני מגיש את המטלה שלי?", "he")
    assert isinstance(response, dict)
    assert "text" in response
    assert "source" in response
    assert "success" in response
    assert response["success"] is True

@pytest.mark.asyncio
async def test_process_message_empty():
    response = await processMessage("", "en")
    assert isinstance(response, dict)
    assert "text" in response
    assert "success" in response

@pytest.mark.asyncio
async def test_process_message_special_characters():
    response = await processMessage("!@#$%^&*()", "en")
    assert isinstance(response, dict)
    assert "text" in response
    assert "success" in response

# Test error handling
@pytest.mark.asyncio
async def test_process_message_error_handling():
    # Test with None input
    response = await processMessage(None, "en")
    assert isinstance(response, dict)
    assert "success" in response
    assert response["success"] is False

# Test language detection
@pytest.mark.asyncio
async def test_process_message_language_detection():
    # Test with Hebrew text without specifying language
    response = await processMessage("איך אני מגיש את המטלה שלי?")
    assert isinstance(response, dict)
    assert "language" in response
    assert response["language"] in ["he", "en"]

    # Test with English text without specifying language
    response = await processMessage("How do I submit my assignment?")
    assert isinstance(response, dict)
    assert "language" in response
    assert response["language"] in ["he", "en"]

# Test AI response functionality
@pytest.mark.asyncio
async def test_process_message_exact_faq_match():
    # Test exact FAQ match in English
    response = await processMessage("How to submit assignment", "en")
    assert response["success"] is True
    assert response["source"] == "faq"
    assert response["match_type"] == "exact"
    assert response["confidence"] == 1.0
    assert isinstance(response["text"], str)
    assert len(response["text"]) > 0

@pytest.mark.asyncio
async def test_process_message_partial_faq_match():
    # Test partial FAQ match in English
    response = await processMessage("I need help submitting my assignment for CS101", "en")
    assert response["success"] is True
    assert response["source"] == "faq"
    assert response["confidence"] > 0.3
    assert isinstance(response["text"], str)
    assert len(response["text"]) > 0

@pytest.mark.asyncio
async def test_process_message_hebrew_faq():
    # Test Hebrew FAQ matching
    response = await processMessage("איך מגישים מטלה?", "he")
    assert response["success"] is True
    assert response["source"] == "faq"
    assert response["language"] == "he"
    assert isinstance(response["text"], str)
    assert len(response["text"]) > 0

@pytest.mark.asyncio
async def test_process_message_openai_fallback():
    # Test OpenAI fallback for unknown queries
    response = await processMessage("What is the meaning of life?", "en")
    assert response["success"] is True
    assert response["source"] in ["openai", "openai_fallback"]
    assert isinstance(response["text"], str)
    assert len(response["text"]) > 0

@pytest.mark.asyncio
async def test_process_message_error_handling():
    # Test error handling with invalid input
    response = await processMessage("", "en")
    assert response["success"] is False
    assert response["source"] == "system"
    assert isinstance(response["text"], str)
    assert len(response["text"]) > 0

@pytest.mark.asyncio
async def test_openai_api_call():
    # Test direct OpenAI API call
    response = await call_openai_api("How do I submit my assignment?", "en")
    assert response["success"] is True
    assert response["source"] in ["openai", "openai_fallback"]
    assert isinstance(response["text"], str)
    assert len(response["text"]) > 0 
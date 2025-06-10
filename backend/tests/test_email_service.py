import pytest
from unittest.mock import patch, MagicMock
from backend.email_service import send_email

@pytest.fixture
def mock_email_config():
    with patch('backend.email_service.EMAIL_USER', 'test@example.com'), \
         patch('backend.email_service.EMAIL_PASS', 'test_password'):
        yield

@pytest.mark.asyncio
async def test_send_email_success(mock_email_config):
    # Mock the send function
    with patch('backend.email_service.send') as mock_send:
        mock_send.return_value = None
        
        # Test successful email sending
        result = await send_email(
            to="test@example.com",
            subject="Test Subject",
            content="Test Content"
        )
        
        assert result is True
        mock_send.assert_called_once()

@pytest.mark.asyncio
async def test_send_email_failure(mock_email_config):
    # Mock the send function to raise an exception
    with patch('backend.email_service.send') as mock_send:
        mock_send.side_effect = Exception("SMTP Error")
        
        # Test failed email sending
        result = await send_email(
            to="test@example.com",
            subject="Test Subject",
            content="Test Content"
        )
        
        assert result is False
        mock_send.assert_called_once()

@pytest.mark.asyncio
async def test_send_email_no_config():
    # Test when email configuration is not available
    with patch('backend.email_service.EMAIL_USER', ''), \
         patch('backend.email_service.EMAIL_PASS', ''):
        
        result = await send_email(
            to="test@example.com",
            subject="Test Subject",
            content="Test Content"
        )
        
        assert result is False

@pytest.mark.asyncio
async def test_send_email_html_content(mock_email_config):
    # Mock the send function
    with patch('backend.email_service.send') as mock_send:
        mock_send.return_value = None
        
        # Test sending HTML content
        html_content = "<h1>Test</h1><p>HTML Content</p>"
        result = await send_email(
            to="test@example.com",
            subject="Test Subject",
            content=html_content
        )
        
        assert result is True
        mock_send.assert_called_once()
        
        # Verify the message was created with HTML content
        call_args = mock_send.call_args[0][0]
        assert call_args["To"] == "test@example.com"
        assert call_args["Subject"] == "Test Subject"
        assert call_args.get_content_type() == "text/html" 
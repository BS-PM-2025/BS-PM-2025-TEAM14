import React, { useState, useRef, useEffect } from 'react';
import '../ai-styles/Chatwindow.css';
import { useUser } from '../../UserContext';
import axios from 'axios';
import VoiceRecorder from './VoiceRecorder';
import { isHebrewText } from '../ai-utils/chatUtils';

//Here i get the user's name from the user context (Showing the user's name in the chat window)
const getUserDisplayName = (user) => {
  if (!user) return '';
  if (user.username) return user.username;
  if (user.name) return user.name;
  if (user.user_email) return user.user_email.split('@')[0];
  return 'User';
};

// Initial welcome message for the chat
const getInitialMessages = () => [
  { 
    text: 'Hello! How can I assist you today?', 
    sender: 'bot',
    isGreeting: true
  }
];

const ChatWindow = ({ open, onClose }) => {
  const { user } = useUser();
  const displayName = getUserDisplayName(user);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState(getInitialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [isInputRTL, setIsInputRTL] = useState(false);
  const prevUserRef = useRef(user);
  
  const messagesEndRef = useRef(null);
  
  // Reset chat when user changes to null (logout)
  useEffect(() => {
    // If we had a user before and now we don't (logout)
    if (prevUserRef.current && !user) {
      console.log('User logged out, resetting chat...');
      setMessages(getInitialMessages());
      if (open) {
        // If the chat window is open, close it
        onClose();
      }
    }
    
    // Update the ref
    prevUserRef.current = user;
  }, [user, onClose, open]);
  
  // Update greeting message when user changes
  useEffect(() => {
    if (displayName) {
      setMessages(prevMessages => {
        // Create a new array with the updated greeting
        return prevMessages.map(message => {
          if (message.isGreeting) {
            return {
              ...message,
              text: `Hello, ${displayName}! How can I assist you today?`
            };
          }
          return message;
        });
      });
    } else {
      // If no user is logged in, ensure greeting is generic
      setMessages(prevMessages => {
        return prevMessages.map(message => {
          if (message.isGreeting) {
            return {
              ...message,
              text: 'Hello! How can I assist you today?'
            };
          }
          return message;
        });
      });
    }
  }, [displayName]);
  
  // Handle input change and detect if it contains Hebrew
  const handleInputChange = (e) => {
    const text = e.target.value;
    setInputMessage(text);
    setIsInputRTL(isHebrewText(text));
  };
  
  // Handle voice transcription from the VoiceRecorder
  const handleVoiceTranscription = (transcript) => {
    if (transcript) {
      setInputMessage(transcript);
      setIsInputRTL(isHebrewText(transcript));
    }
  };
  
  // Function to handle sending a message
  const handleSendMessage = async () => {
    if (inputMessage.trim() === '') return;
    
    const isHebrew = isHebrewText(inputMessage);
    
    // Add user message
    const newUserMessage = { 
      text: inputMessage, 
      sender: 'user',
      isRTL: isHebrew
    };
    setMessages([...messages, newUserMessage]);
    
    // Clear input field and set loading state
    setInputMessage('');
    setIsInputRTL(false);
    setIsLoading(true);
    
    try {
      // Call our new AI service endpoint with full URL
      const response = await axios.post('http://localhost:8000/api/ai/chat', {
        message: inputMessage,
        // We don't need to specify language as it will be auto-detected
      });
      
      // Check if the response text is in Hebrew
      const isResponseHebrew = isHebrewText(response.data.text);
      
      // Add bot response with source info
      const botResponse = { 
        text: response.data.text, 
        sender: 'bot',
        source: response.data.source, // 'faq' or 'openai'
        confidence: response.data.confidence,
        isRTL: isResponseHebrew || response.data.language === 'he'
      };
      
      setMessages(prevMessages => [...prevMessages, botResponse]);
    } catch (error) {
      console.error('Error calling AI service:', error);
      
      // Add error message
      const errorResponse = {
        text: "Sorry, I encountered an error. Please try again later.",
        sender: 'bot',
        error: true
      };
      
      setMessages(prevMessages => [...prevMessages, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle pressing Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={`chat-window-overlay${open ? ' open' : ''}`}>
      <div className="chat-window-card">
        <div className="chat-window-header">
          <h2 className="chat-window-title">Academic AI Assistant</h2>
          <div className="chat-window-status-close">
            <div className="chat-window-status">Online</div>
            <button onClick={onClose} className="chat-window-close">&times;</button>
          </div>
        </div>
        <div className="chat-window-messages" id="chatDisplay">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`chat-message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
            >
              <div 
                className="message-content"
                dir={message.isRTL ? 'rtl' : 'ltr'}
                style={{ textAlign: message.isRTL ? 'right' : 'left' }}
              >
                {message.text}
                {message.source === 'faq' && (
                  <div className="message-source faq-source">
                    ✓ From FAQ
                  </div>
                )}
                {message.error && (
                  <div className="message-source error-source">
                    ⚠ Error
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
          {isLoading && (
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
        </div>
        <div className="chat-window-input-container">
          <div className="chat-window-voice-recorder">
            <VoiceRecorder onTranscriptionComplete={handleVoiceTranscription} />
          </div>
          <div className="chat-window-input-row">
            <input
              placeholder="Type your message..."
              className="chat-window-input"
              id="chatInput"
              type="text"
              value={inputMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              dir={isInputRTL ? 'rtl' : 'ltr'}
              style={{ textAlign: isInputRTL ? 'right' : 'left' }}
            />
            <button 
              className="chat-window-send" 
              id="sendButton" 
              onClick={handleSendMessage}
              disabled={inputMessage.trim() === '' || isLoading}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
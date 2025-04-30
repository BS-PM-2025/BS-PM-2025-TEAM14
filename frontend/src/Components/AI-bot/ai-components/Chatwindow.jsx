import React, { useState, useRef, useEffect } from 'react';
import '../ai-styles/Chatwindow.css';
import { useUser } from '../../UserContext';

//Here i get the user's name from the user context (Showing the user's name in the chat window)
const getUserDisplayName = (user) => {
  if (!user) return '';
  if (user.username) return user.username;
  if (user.name) return user.name;
  if (user.user_email) return user.user_email.split('@')[0];
  return 'User';
};

// Initial messages for the chat
const getInitialMessages = () => [
  { 
    text: 'Hello! How can I assist you today?', 
    sender: 'bot',
    isGreeting: true
  },
  { text: 'Hello! I need a Chatbot!', sender: 'user' },
  { text: 'I\'m here to help with that! What specific requirements do you have for your chatbot?', sender: 'bot' },
  { text: 'I need it to answer questions about our university courses.', sender: 'user' },
  { text: 'Great! I can help you build a chatbot that specializes in university course information. Would you like it to have access to your course catalog?', sender: 'bot' },
  { text: 'Yes, that would be perfect. Can it also handle student inquiries about prerequisites?', sender: 'user' },
  { text: 'Absolutely! We can design it to understand course prerequisites, requirements, and even suggest courses based on a student\'s academic path.', sender: 'bot' },
  { text: 'Fantastic! How long would it take to implement?', sender: 'user' },
  { text: 'Implementation time varies based on complexity and data integration needs. For a basic version with your course catalog, we could have it running in about 2-3 weeks.', sender: 'bot' },
];

const ChatWindow = ({ open, onClose }) => {
  const { user } = useUser();
  const displayName = getUserDisplayName(user);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState(getInitialMessages);
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
  
  // Function to handle sending a message
  const handleSendMessage = () => {
    if (inputMessage.trim() === '') return;
    
    // Add user message
    const newUserMessage = { text: inputMessage, sender: 'user' };
    setMessages([...messages, newUserMessage]);
    
    // Clear input field
    setInputMessage('');
    
    // Simulate bot response (in a real app, this would call your AI service)
    setTimeout(() => {
      const botResponse = { 
        text: "I understand your request. I'm here to help with that!", 
        sender: 'bot' 
      };
      setMessages(prevMessages => [...prevMessages, botResponse]);
    }, 1000);
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
          <h2 className="chat-window-title">Chatbot Assistant</h2>
          <div className="chat-window-status-close">
            <div className="chat-window-status">Online</div>
            <button onClick={onClose} className="chat-window-close">&times;</button>
          </div>
        </div>
        <div className="chat-window-messages" id="chatDisplay">
          {messages.map((message, index) => (
            <div 
              key={index} 
              className={`chat-message ${message.sender === 'user' ? 'self-start' : 'self-end'}`}
            >
              {message.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="chat-window-input-row">
          <input
            placeholder="Type your message..."
            className="chat-window-input"
            id="chatInput"
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button 
            className="chat-window-send" 
            id="sendButton" 
            onClick={handleSendMessage}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
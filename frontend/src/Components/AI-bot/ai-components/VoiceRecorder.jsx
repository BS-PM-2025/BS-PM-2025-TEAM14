import React, { useState, useRef, useEffect } from 'react';
import '../ai-styles/VoiceRecorder.css';

const VoiceRecorder = ({ onTranscriptionComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const recognitionRef = useRef(null);
  const [micPermission, setMicPermission] = useState(null);

  // Check for microphone permission
  useEffect(() => {
    async function checkMicPermission() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately after getting it
        stream.getTracks().forEach(track => track.stop());
        setMicPermission('granted');
      } catch (error) {
        setMicPermission('denied');
      }
    }
    
    checkMicPermission();
  }, []);

  const startRecording = async () => {
    try {
      // Check if browser supports speech recognition
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        throw new Error('Speech recognition is not supported in this browser.');
      }

      // Initialize speech recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // Configure recognition
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = selectedLanguage;

      let finalTranscript = '';

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Update the transcription as we get results
        if (finalTranscript) {
          onTranscriptionComplete(finalTranscript.trim());
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        setIsProcessing(false);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        setIsProcessing(false);
      };

      // Start recording
      await recognitionRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsRecording(false);
      setIsProcessing(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsProcessing(true);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleLanguageChange = (e) => {
    setSelectedLanguage(e.target.value);
  };

  // If mic permission is denied, show message
  if (micPermission === 'denied') {
    return (
      <div className="voice-recorder-wrapper">
        <div className="voice-recorder-mic-disabled">
          🎤 Microphone access denied
        </div>
      </div>
    );
  }

  return (
    <div className="voice-recorder-wrapper">
      <select 
        className="voice-recorder-language-selector"
        value={selectedLanguage}
        onChange={handleLanguageChange}
        disabled={isRecording || isProcessing}
      >
        <option value="en-US">English</option>
        <option value="he-IL">עברית</option>
      </select>
      
      <div>
        <input 
          type="checkbox" 
          id="voice-recorder-checkbox" 
          className="voice-recorder-checkbox"
          checked={isRecording}
          onChange={toggleRecording}
          disabled={isProcessing}
        />
        <label 
          className={`voice-recorder-switch ${isProcessing ? 'processing' : ''}`} 
          htmlFor="voice-recorder-checkbox"
          title={isProcessing ? 'Processing...' : isRecording ? 'Stop Recording' : 'Start Recording'}
        >
          <div className="voice-recorder-mic-on">
            <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} fill="currentColor" className="bi bi-mic-fill" viewBox="0 0 16 16"> 
              <path d="M5 3a3 3 0 0 1 6 0v5a3 3 0 0 1-6 0V3z" /> 
              <path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z" /> 
            </svg>
          </div>
          <div className="voice-recorder-mic-off">
            <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} fill="currentColor" className="bi bi-mic-mute-fill" viewBox="0 0 16 16"> 
              <path d="M13 8c0 .564-.094 1.107-.266 1.613l-.814-.814A4.02 4.02 0 0 0 12 8V7a.5.5 0 0 1 1 0v1zm-5 4c.818 0 1.578-.245 2.212-.667l.718.719a4.973 4.973 0 0 1-2.43.923V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 1 0v1a4 4 0 0 0 4 4zm3-9v4.879L5.158 2.037A3.001 3.001 0 0 1 11 3z" /> 
              <path d="M9.486 10.607 5 6.12V8a3 3 0 0 0 4.486 2.607zm-7.84-9.253 12 12 .708-.708-12-12-.708.708z" /> 
            </svg>
          </div>
        </label>
      </div>
      
      {isRecording && (
        <div className="voice-recorder-indicator">Recording...</div>
      )}
    </div>
  );
};

export default VoiceRecorder; 
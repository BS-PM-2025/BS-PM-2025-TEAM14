import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SystemNotificationBar.css';

const SystemNotificationBar = () => {
    const [tickerContent, setTickerContent] = useState('📢 Loading announcements...');

    useEffect(() => {
        console.log('🔴 SystemNotificationBar component mounted!');
        fetchAndDisplayMessages();
    }, []);

    const fetchAndDisplayMessages = async () => {
        console.log('🔴 Starting to fetch announcements...');
        try {
            console.log('🔴 Making API call to http://localhost:8000/api/announcements');
            const response = await axios.get('http://localhost:8000/api/announcements');
            console.log('🔴 API response received:', response.data);
            
            const messages = response.data
                .filter(ann => ann && ann.message)
                .map(announcement => {
                    const icon = announcement.announcement_type === 'admin' ? '📢' : '🌍';
                    const prefix = announcement.announcement_type === 'admin' ? 'Admin message: ' : '';
                    const content = announcement.title && announcement.title !== announcement.message 
                        ? `${announcement.title} - ${announcement.message}`
                        : announcement.message;
                    return `${icon} ${prefix}${content}`;
                });

            console.log('🔴 Processed messages:', messages);

            if (messages.length > 0) {
                // Create infinite loop content with gaps
                const separator = '     •••     ';
                const fullContent = messages.join(separator) + separator;
                const finalContent = fullContent + fullContent; // Duplicate for seamless loop
                console.log('🔴 Setting ticker content:', finalContent);
                setTickerContent(finalContent);
            } else {
                console.log('🔴 No messages found, showing default message');
                setTickerContent('📢 No announcements available');
            }
        } catch (err) {
            console.error('🔴 Error fetching announcements:', err);
            setTickerContent('⚠️ Unable to load announcements');
        }
    };

    console.log('🔴 Rendering component with tickerContent:', tickerContent);

    return (
        <div className="notification-bar">
            <div className="notification-content">
                <div className="ticker-wrapper">
                    <span className="notification-header">
                        Announcements and News:
                    </span>
                    <div className="ticker-container">
                        <div className="ticker-text">
                            {tickerContent}
                        </div>
                    </div>
                    <div className="ticker-info">
                        <div className="live-indicator">🔴 LIVE</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemNotificationBar; 
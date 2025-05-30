import React, { useState, useEffect } from 'react';
import { useUser } from '../UserContext';
import { getToken } from '../../utils/auth';
import axios from 'axios';
import './AdminAnnouncementPanel.css';

const AdminAnnouncementPanel = () => {
  const { user } = useUser();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [expiresDate, setExpiresDate] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'secretary') {
      fetchAnnouncements();
    }
  }, [user]);

  useEffect(() => {
    if (error || success) {
      const timeout = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [error, success]);

  const fetchAnnouncements = async () => {
    try {
      const token = getToken();
      const response = await axios.get('http://localhost:8000/api/admin/announcements', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnnouncements(response.data);
      setLoadingAnnouncements(false);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      setError('Failed to load announcements');
      setLoadingAnnouncements(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      setError('Title and message are required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = getToken();
      const announcementData = {
        title: title.trim(),
        message: message.trim(),
        expires_date: expiresDate || null
      };

      await axios.post('http://localhost:8000/api/admin/announcements', announcementData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Announcement created successfully!');
      setTitle('');
      setMessage('');
      setExpiresDate('');
      fetchAnnouncements(); // Refresh the list
    } catch (err) {
      console.error('Error creating announcement:', err);
      setError(err.response?.data?.detail || 'Failed to create announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (announcementId) => {
    if (!window.confirm('Are you sure you want to deactivate this announcement?')) {
      return;
    }

    try {
      const token = getToken();
      await axios.delete(`http://localhost:8000/api/admin/announcements/${announcementId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Announcement deactivated successfully');
      fetchAnnouncements(); // Refresh the list
    } catch (err) {
      console.error('Error deactivating announcement:', err);
      setError(err.response?.data?.detail || 'Failed to deactivate announcement');
    }
  };

  const handleGenerateAINews = async () => {
    setGeneratingAI(true);
    setError('');
    setSuccess('');

    try {
      const token = getToken();
      const response = await axios.post('http://localhost:8000/api/admin/generate-ai-news', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Use the response data to provide better feedback
      const successMessage = response.data?.message || 'AI news generated successfully!';
      const newsCount = response.data?.count || 'multiple';
      setSuccess(`${successMessage} Generated ${newsCount} news items.`);
      fetchAnnouncements(); // Refresh the list
    } catch (err) {
      console.error('Error generating AI news:', err);
      setError(err.response?.data?.detail || 'Failed to generate AI news');
    } finally {
      setGeneratingAI(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if user has admin permissions
  if (!user || (user.role !== 'admin' && user.role !== 'secretary')) {
    return (
      <div className="admin-panel">
        <div className="access-denied">
          <h3>Access Denied</h3>
          <p>You don't have permission to access this panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <div className="panel-header">
        <h2>📢 System Announcements Management</h2>
        <p>Create and manage system-wide announcements for all users</p>
      </div>

      {/* Alert Messages */}
      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          <span className="alert-icon">✅</span>
          {success}
        </div>
      )}

      {/* Create Announcement Form */}
      <div className="create-announcement">
        <h3>Create New Announcement</h3>
        <form onSubmit={handleSubmit} className="announcement-form">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter announcement title..."
              maxLength={200}
              required
            />
            <small>{title.length}/200 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="message">Message *</label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your announcement message..."
              rows={4}
              maxLength={500}
              required
            />
            <small>{message.length}/500 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="expiresDate">Expiration Date (Optional)</label>
            <input
              type="datetime-local"
              id="expiresDate"
              value={expiresDate}
              onChange={(e) => setExpiresDate(e.target.value)}
              min={getTodayDate()}
            />
            <small>Leave empty for permanent announcement</small>
          </div>

          <button 
            type="submit" 
            className="submit-button"
            disabled={loading || !title.trim() || !message.trim()}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Creating...
              </>
            ) : (
              '📤 Create Announcement'
            )}
          </button>
        </form>
      </div>

      {/* AI News Generation Section */}
      <div className="ai-news-section">
        <h3>🌍 Real-World News Generation</h3>
        <p>Generate 10 real-world news items covering economics, politics, sports, technology, and more. News expires after 24 hours and auto-refreshes when needed.</p>
        <button 
          className="ai-news-button"
          onClick={handleGenerateAINews}
          disabled={generatingAI}
        >
          {generatingAI ? (
            <>
              <span className="spinner"></span>
              Generating 10 World News
            </>
          ) : (
            '🌍 Generate 10 World News'
          )}
        </button>
      </div>

      {/* Announcements List */}
      <div className="announcements-list">
        <h3>Existing Announcements</h3>
        
        {loadingAnnouncements ? (
          <div className="loading-state">
            <span className="spinner"></span>
            Loading announcements...
          </div>
        ) : announcements.length === 0 ? (
          <div className="empty-state">
            <p>No announcements found.</p>
          </div>
        ) : (
          <div className="announcements-grid">
            {announcements.map((announcement) => (
              <div 
                key={announcement.id} 
                className={`announcement-card ${!announcement.is_active ? 'inactive' : ''}`}
              >
                <div className="announcement-header">
                  <h4>{announcement.title}</h4>
                  <span className={`status-badge ${announcement.is_active ? 'active' : 'inactive'}`}>
                    {announcement.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <p className="announcement-message">{announcement.message}</p>
                
                <div className="announcement-meta">
                  <small>
                    <strong>Created:</strong> {formatDate(announcement.created_date)}
                    {announcement.admin_email && (
                      <><br /><strong>By:</strong> {announcement.admin_email}</>
                    )}
                    {announcement.expires_date && (
                      <><br /><strong>Expires:</strong> {formatDate(announcement.expires_date)}</>
                    )}
                  </small>
                </div>
                
                {announcement.is_active && (
                  <button 
                    className="deactivate-button"
                    onClick={() => handleDeactivate(announcement.id)}
                  >
                    🚫 Deactivate
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAnnouncementPanel; 
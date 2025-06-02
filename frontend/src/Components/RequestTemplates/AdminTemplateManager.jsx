import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import TemplateEditor from "./TemplateEditor";
import TemplateList from "./TemplateList";
import "../../CSS/RequestTemplates/AdminTemplateManager.css";
import { getToken, getUserFromToken } from "../../utils/auth";

const AdminTemplateManager = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const checkAuth = () => {
      const token = getToken();
      if (token) {
        const userData = getUserFromToken(token);
        if (userData.role !== "admin") {
          navigate("/home");
          return;
        }
        setUser(userData);
      } else {
        navigate("/login");
      }
    };

    checkAuth();
    window.addEventListener("storage", checkAuth);
    window.addEventListener("focus", checkAuth);

    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("focus", checkAuth);
    };
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user, refreshTrigger]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const response = await axios.get("http://localhost:8000/api/request_templates?active_only=false", {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setTemplates(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch templates");
      console.error("Error fetching templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setShowEditor(true);
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm("Are you sure you want to delete this template? This action cannot be undone.")) {
      return;
    }

    try {
      const token = getToken();
      await axios.delete(`http://localhost:8000/api/request_templates/${templateId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setError("Failed to delete template");
      console.error("Error deleting template:", err);
    }
  };

  const handleSaveSuccess = () => {
    setShowEditor(false);
    setEditingTemplate(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleCancel = () => {
    setShowEditor(false);
    setEditingTemplate(null);
  };

  if (loading) {
    return (
      <div className="admin-template-manager">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-template-manager">
      <div className="header">
        <h1>Request Template Manager</h1>
        <p>Create and manage dynamic request types for your institution</p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {showEditor ? (
        <TemplateEditor
          template={editingTemplate}
          onSave={handleSaveSuccess}
          onCancel={handleCancel}
        />
      ) : (
        <>
          <div className="actions-bar">
            <button 
              className="btn-primary create-new-btn"
              onClick={handleCreateNew}
            >
              <span className="btn-icon">+</span>
              Create New Template
            </button>
          </div>

          <TemplateList
            templates={templates}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
};

export default AdminTemplateManager; 
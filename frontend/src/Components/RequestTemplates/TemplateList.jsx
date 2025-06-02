import React from "react";
import "../../CSS/RequestTemplates/TemplateList.css";

const TemplateList = ({ templates, onEdit, onDelete }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFieldTypeIcon = (fieldType) => {
    const icons = {
      text: "📝",
      textarea: "📄",
      select: "📋",
      file: "📎",
      date: "📅",
      number: "🔢",
      email: "📧",
      tel: "📞"
    };
    return icons[fieldType] || "📝";
  };

  const getStatusBadge = (isActive) => {
    return (
      <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  if (templates.length === 0) {
    return (
      <div className="template-list">
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No Templates Found</h3>
          <p>Create your first request template to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="template-list">
      <div className="templates-grid">
        {templates.map((template) => (
          <div key={template.id} className="template-card">
            <div className="template-header">
              <div className="template-title">
                <h3>{template.name}</h3>
                {getStatusBadge(template.is_active)}
              </div>
              <div className="template-actions">
                <button
                  className="btn-secondary edit-btn"
                  onClick={() => onEdit(template)}
                  title="Edit template"
                >
                  ✏️
                </button>
                <button
                  className="btn-danger delete-btn"
                  onClick={() => onDelete(template.id)}
                  title="Delete template"
                >
                  🗑️
                </button>
              </div>
            </div>

            {template.description && (
              <div className="template-description">
                <p>{template.description}</p>
              </div>
            )}

            <div className="template-meta">
              <div className="meta-item">
                <span className="meta-label">Fields:</span>
                <span className="meta-value">{template.fields.length}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Created:</span>
                <span className="meta-value">{formatDate(template.created_date)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Updated:</span>
                <span className="meta-value">{formatDate(template.updated_date)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Created by:</span>
                <span className="meta-value">{template.created_by}</span>
              </div>
            </div>

            {template.fields.length > 0 && (
              <div className="template-fields-preview">
                <h4>Fields Preview:</h4>
                <div className="fields-list">
                  {template.fields.slice(0, 3).map((field) => (
                    <div key={field.id} className="field-preview">
                      <span className="field-icon">
                        {getFieldTypeIcon(field.field_type)}
                      </span>
                      <span className="field-name">{field.field_label}</span>
                      {field.is_required && (
                        <span className="required-indicator">*</span>
                      )}
                    </div>
                  ))}
                  {template.fields.length > 3 && (
                    <div className="field-preview more-fields">
                      <span className="field-icon">⋯</span>
                      <span className="field-name">
                        +{template.fields.length - 3} more fields
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TemplateList; 
import React, { useState, useEffect } from "react";
import axios from "axios";
import "../../CSS/RequestTemplates/TemplateEditor.css";
import { getToken } from "../../utils/auth";

const TemplateEditor = ({ template, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    fields: []
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fieldTypes = [
    { value: "text", label: "Text Input", icon: "📝" },
    { value: "textarea", label: "Text Area", icon: "📄" },
    { value: "select", label: "Dropdown", icon: "📋" },
    { value: "file", label: "File Upload", icon: "📎" },
    { value: "date", label: "Date", icon: "📅" },
    { value: "number", label: "Number", icon: "🔢" },
    { value: "email", label: "Email", icon: "📧" },
    { value: "tel", label: "Phone", icon: "📞" }
  ];

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || "",
        fields: template.fields.map(field => ({
          ...field,
          tempId: Math.random().toString(36).substr(2, 9)
        }))
      });
    } else {
      setFormData({
        name: "",
        description: "",
        fields: []
      });
    }
  }, [template]);

  const handleBasicFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addField = () => {
    const newField = {
      tempId: Math.random().toString(36).substr(2, 9),
      field_name: "",
      field_label: "",
      field_type: "text",
      field_options: null,
      is_required: false,
      field_order: formData.fields.length,
      validation_rules: null,
      placeholder: "",
      help_text: ""
    };

    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
  };

  const removeField = (tempId) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.tempId !== tempId)
        .map((field, index) => ({ ...field, field_order: index }))
    }));
  };

  const updateField = (tempId, fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(field => 
        field.tempId === tempId 
          ? { ...field, [fieldName]: value }
          : field
      )
    }));
  };

  const moveField = (tempId, direction) => {
    const currentIndex = formData.fields.findIndex(f => f.tempId === tempId);
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === formData.fields.length - 1)
    ) {
      return;
    }

    const newFields = [...formData.fields];
    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    
    [newFields[currentIndex], newFields[swapIndex]] = 
    [newFields[swapIndex], newFields[currentIndex]];

    // Update field_order
    newFields.forEach((field, index) => {
      field.field_order = index;
    });

    setFormData(prev => ({
      ...prev,
      fields: newFields
    }));
  };

  const handleSelectOptionsChange = (tempId, optionsText) => {
    const options = optionsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    updateField(tempId, 'field_options', { options });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError("Template name is required");
      return false;
    }

    if (formData.fields.length === 0) {
      setError("At least one field is required");
      return false;
    }

    for (let field of formData.fields) {
      if (!field.field_name.trim()) {
        setError("All fields must have a field name");
        return false;
      }
      if (!field.field_label.trim()) {
        setError("All fields must have a label");
        return false;
      }
      if (field.field_type === 'select' && (!field.field_options || !field.field_options.options || field.field_options.options.length === 0)) {
        setError("Dropdown fields must have at least one option");
        return false;
      }
    }

    // Check for duplicate field names
    const fieldNames = formData.fields.map(f => f.field_name.trim().toLowerCase());
    const uniqueNames = new Set(fieldNames);
    if (fieldNames.length !== uniqueNames.size) {
      setError("Field names must be unique");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        fields: formData.fields.map(field => ({
          field_name: field.field_name.trim(),
          field_label: field.field_label.trim(),
          field_type: field.field_type,
          field_options: field.field_options,
          is_required: field.is_required,
          field_order: field.field_order,
          validation_rules: field.validation_rules,
          placeholder: field.placeholder?.trim() || null,
          help_text: field.help_text?.trim() || null
        }))
      };

      const token = getToken();
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      if (template) {
        await axios.put(`http://localhost:8000/api/request_templates/${template.id}`, payload, config);
      } else {
        await axios.post("http://localhost:8000/api/request_templates", payload, config);
      }

      onSave();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save template");
      console.error("Error saving template:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="template-editor">
      <div className="editor-header">
        <h2>{template ? "Edit Template" : "Create New Template"}</h2>
        <p>Define the structure and fields for your request template</p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="editor-content">
        <div className="basic-info-section">
          <h3>Basic Information</h3>
          
          <div className="form-group">
            <label htmlFor="template-name">Template Name *</label>
            <input
              id="template-name"
              type="text"
              value={formData.name}
              onChange={(e) => handleBasicFieldChange("name", e.target.value)}
              placeholder="e.g., Equipment Request, Academic Appeal, etc."
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="template-description">Description</label>
            <textarea
              id="template-description"
              value={formData.description}
              onChange={(e) => handleBasicFieldChange("description", e.target.value)}
              placeholder="Brief description of when to use this template..."
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <div className="fields-section">
          <div className="fields-header">
            <h3>Template Fields</h3>
            <button 
              type="button" 
              className="btn-secondary add-field-btn"
              onClick={addField}
            >
              <span className="btn-icon">+</span>
              Add Field
            </button>
          </div>

          {formData.fields.length === 0 ? (
            <div className="empty-fields">
              <p>No fields added yet. Click "Add Field" to get started.</p>
            </div>
          ) : (
            <div className="fields-list">
              {formData.fields.map((field, index) => (
                <FieldEditor
                  key={field.tempId}
                  field={field}
                  index={index}
                  totalFields={formData.fields.length}
                  fieldTypes={fieldTypes}
                  onUpdate={updateField}
                  onRemove={removeField}
                  onMove={moveField}
                  onSelectOptionsChange={handleSelectOptionsChange}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="editor-actions">
        <button 
          type="button" 
          className="btn-secondary"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button 
          type="button" 
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : (template ? "Update Template" : "Create Template")}
        </button>
      </div>
    </div>
  );
};

// Field Editor Component
const FieldEditor = ({ 
  field, 
  index, 
  totalFields, 
  fieldTypes, 
  onUpdate, 
  onRemove, 
  onMove, 
  onSelectOptionsChange 
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleFieldChange = (fieldName, value) => {
    onUpdate(field.tempId, fieldName, value);
  };

  const getSelectOptionsText = () => {
    return field.field_options?.options?.join('\n') || '';
  };

  return (
    <div className="field-editor">
      <div className="field-header">
        <div className="field-info">
          <span className="field-type-icon">
            {fieldTypes.find(ft => ft.value === field.field_type)?.icon || "📝"}
          </span>
          <span className="field-label">
            {field.field_label || "Untitled Field"}
          </span>
          {field.is_required && <span className="required-indicator">*</span>}
        </div>
        
        <div className="field-actions">
          <button
            type="button"
            className="btn-icon"
            onClick={() => onMove(field.tempId, "up")}
            disabled={index === 0}
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            className="btn-icon"
            onClick={() => onMove(field.tempId, "down")}
            disabled={index === totalFields - 1}
            title="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            className="btn-icon expand-btn"
            onClick={() => setExpanded(!expanded)}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? "−" : "+"}
          </button>
          <button
            type="button"
            className="btn-icon delete-btn"
            onClick={() => onRemove(field.tempId)}
            title="Remove field"
          >
            ×
          </button>
        </div>
      </div>

      {expanded && (
        <div className="field-content">
          <div className="field-row">
            <div className="form-group">
              <label>Field Name *</label>
              <input
                type="text"
                value={field.field_name}
                onChange={(e) => handleFieldChange("field_name", e.target.value)}
                placeholder="e.g., equipment_type, reason, etc."
              />
              <small>Used internally (no spaces or special characters)</small>
            </div>

            <div className="form-group">
              <label>Label *</label>
              <input
                type="text"
                value={field.field_label}
                onChange={(e) => handleFieldChange("field_label", e.target.value)}
                placeholder="e.g., Equipment Type, Reason for Request"
              />
              <small>Displayed to users</small>
            </div>
          </div>

          <div className="field-row">
            <div className="form-group">
              <label>Field Type *</label>
              <select
                value={field.field_type}
                onChange={(e) => handleFieldChange("field_type", e.target.value)}
              >
                {fieldTypes.map(ft => (
                  <option key={ft.value} value={ft.value}>
                    {ft.icon} {ft.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={field.is_required}
                  onChange={(e) => handleFieldChange("is_required", e.target.checked)}
                />
                Required Field
              </label>
            </div>
          </div>

          {field.field_type === 'select' && (
            <div className="form-group">
              <label>Options (one per line) *</label>
              <textarea
                value={getSelectOptionsText()}
                onChange={(e) => onSelectOptionsChange(field.tempId, e.target.value)}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
                rows={4}
              />
            </div>
          )}

          <div className="field-row">
            <div className="form-group">
              <label>Placeholder Text</label>
              <input
                type="text"
                value={field.placeholder || ""}
                onChange={(e) => handleFieldChange("placeholder", e.target.value)}
                placeholder="Placeholder text for the field..."
              />
            </div>

            <div className="form-group">
              <label>Help Text</label>
              <input
                type="text"
                value={field.help_text || ""}
                onChange={(e) => handleFieldChange("help_text", e.target.value)}
                placeholder="Additional help or instructions..."
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateEditor; 
import React, { useState, useEffect } from "react";
import axios from "axios";
import "../../CSS/RequestTemplates/DynamicRequestForm.css";

const DynamicRequestForm = ({ selectedTemplate, onFormDataChange, errors }) => {
  const [formData, setFormData] = useState({});
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedTemplate) {
      fetchTemplate();
    } else {
      setTemplate(null);
      setFormData({});
    }
  }, [selectedTemplate]);

  useEffect(() => {
    onFormDataChange(formData);
  }, [formData, onFormDataChange]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:8000/api/request_templates/by_name/${encodeURIComponent(selectedTemplate)}`
      );
      
      if (response.data) {
        setTemplate(response.data);
        // Initialize form data with empty values
        const initialData = {};
        response.data.fields.forEach(field => {
          initialData[field.field_name] = getInitialValue(field.field_type);
        });
        setFormData(initialData);
      } else {
        // Legacy template - no custom fields
        setTemplate(null);
        setFormData({});
      }
    } catch (error) {
      console.error("Error fetching template:", error);
      setTemplate(null);
      setFormData({});
    } finally {
      setLoading(false);
    }
  };

  const getInitialValue = (fieldType) => {
    switch (fieldType) {
      case "file":
        return [];
      case "number":
        return "";
      case "date":
        return "";
      default:
        return "";
    }
  };

  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleFileChange = (fieldName, files) => {
    const fileArray = Array.from(files);
    handleFieldChange(fieldName, fileArray);
  };

  const validateField = (field, value) => {
    const rules = field.validation_rules || {};
    
    if (field.is_required && (!value || (Array.isArray(value) && value.length === 0))) {
      return `${field.field_label} is required`;
    }

    if (field.field_type === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Please enter a valid email address";
    }

    if (field.field_type === "tel" && value && !/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/\s/g, ""))) {
      return "Please enter a valid phone number";
    }

    if (field.field_type === "number" && value) {
      const num = parseFloat(value);
      if (isNaN(num)) {
        return "Please enter a valid number";
      }
      if (rules.min !== undefined && num < rules.min) {
        return `Value must be at least ${rules.min}`;
      }
      if (rules.max !== undefined && num > rules.max) {
        return `Value must be at most ${rules.max}`;
      }
    }

    if (field.field_type === "text" || field.field_type === "textarea") {
      if (rules.min_length && value.length < rules.min_length) {
        return `Must be at least ${rules.min_length} characters`;
      }
      if (rules.max_length && value.length > rules.max_length) {
        return `Must be at most ${rules.max_length} characters`;
      }
    }

    return null;
  };

  const renderField = (field) => {
    const value = formData[field.field_name] || getInitialValue(field.field_type);
    const error = errors[field.field_name];
    const fieldId = `dynamic-field-${field.field_name}`;

    const commonProps = {
      id: fieldId,
      value: field.field_type === "file" ? undefined : value,
      onChange: (e) => {
        if (field.field_type === "file") {
          handleFileChange(field.field_name, e.target.files);
        } else {
          handleFieldChange(field.field_name, e.target.value);
        }
      },
      placeholder: field.placeholder || "",
      required: field.is_required
    };

    let fieldElement;

    switch (field.field_type) {
      case "textarea":
        fieldElement = (
          <textarea
            {...commonProps}
            rows={4}
            className={`form-control ${error ? 'error' : ''}`}
          />
        );
        break;

      case "select":
        fieldElement = (
          <select
            {...commonProps}
            className={`form-control ${error ? 'error' : ''}`}
          >
            <option value="">Select an option</option>
            {field.field_options?.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
        break;

      case "file":
        fieldElement = (
          <div className="file-input-wrapper">
            <input
              type="file"
              id={fieldId}
              onChange={(e) => handleFileChange(field.field_name, e.target.files)}
              multiple
              className={`form-control ${error ? 'error' : ''}`}
            />
            {value && value.length > 0 && (
              <div className="file-list">
                {value.map((file, index) => (
                  <div key={index} className="file-item">
                    <span className="file-name">{file.name}</span>
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={() => {
                        const newFiles = value.filter((_, i) => i !== index);
                        handleFieldChange(field.field_name, newFiles);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
        break;

      case "date":
        fieldElement = (
          <input
            {...commonProps}
            type="date"
            className={`form-control ${error ? 'error' : ''}`}
          />
        );
        break;

      case "number":
        fieldElement = (
          <input
            {...commonProps}
            type="number"
            className={`form-control ${error ? 'error' : ''}`}
          />
        );
        break;

      case "email":
        fieldElement = (
          <input
            {...commonProps}
            type="email"
            className={`form-control ${error ? 'error' : ''}`}
          />
        );
        break;

      case "tel":
        fieldElement = (
          <input
            {...commonProps}
            type="tel"
            className={`form-control ${error ? 'error' : ''}`}
          />
        );
        break;

      default: // text
        fieldElement = (
          <input
            {...commonProps}
            type="text"
            className={`form-control ${error ? 'error' : ''}`}
          />
        );
        break;
    }

    return (
      <div key={field.field_name} className="dynamic-form-group">
        <label htmlFor={fieldId} className="form-label">
          {field.field_label}
          {field.is_required && <span className="required-indicator">*</span>}
        </label>
        
        {fieldElement}
        
        {field.help_text && (
          <small className="help-text">{field.help_text}</small>
        )}
        
        {error && (
          <div className="field-error">{error}</div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dynamic-form-loading">
        <div className="loading-spinner"></div>
        <p>Loading template...</p>
      </div>
    );
  }

  if (!selectedTemplate) {
    return null;
  }

  if (!template) {
    // Legacy template - no custom fields to render
    return (
      <div className="dynamic-form-legacy">
        <p className="legacy-message">
          This is a standard request type. Use the main form fields above.
        </p>
      </div>
    );
  }

  return (
    <div className="dynamic-form">
      <div className="template-info">
        <h4>{template.name}</h4>
        {template.description && (
          <p className="template-description">{template.description}</p>
        )}
      </div>

      <div className="dynamic-fields">
        {template.fields
          .sort((a, b) => a.field_order - b.field_order)
          .map(renderField)}
      </div>
    </div>
  );
};

export default DynamicRequestForm; 
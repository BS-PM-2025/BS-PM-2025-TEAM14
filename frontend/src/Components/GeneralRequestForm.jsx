import React, { useState } from "react";
import axios from "axios";
import "../CSS/GeneralRequestForm.css";
import { useNavigate } from "react-router-dom"; // Add this import


const RequestForm = ({ studentEmail }) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
  
    if (!title || !details) {
      setError("Title or details are missing.");
      return;
    }
  
    try {
      // First, upload all files if any exist
      const uploadedFiles = [];
      if (files.length > 0) {
        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("fileType", "general"); // This will create Documents/email/general/
  
          // Upload each file
          await axios.post(
            `http://localhost:8000/uploadfile/${studentEmail}`,
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );
          uploadedFiles.push(file.name);
        }
      }
  
      // Then create the request with file information
      const response = await axios.post(
        "http://localhost:8000/general_request/create",
        {
          title,
          student_email: studentEmail,
          details,
          files: uploadedFiles.length > 0 ? uploadedFiles : [],
        }
      );
  
      setMessage("Request created successfully");
      setTimeout(() => {
        navigate('/'); // Redirect to home page
      }, 1000);
      setTitle("");
      setDetails("");
      setFiles([]);
    } catch (error) {
      setError(
        error.response?.data?.detail ||
          "An error occurred while creating the request"
      );
    }
  };

  return (
    <div className="request-form-container">
      <h2>Submit a New General Request</h2>
      <form onSubmit={handleSubmit} className="request-form">
        <div className="form-group">
          <label htmlFor="title">Title*</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="details">Details*</label>
          <textarea
            id="details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="files">Attach Files (Optional)</label>
          <input type="file" id="files" multiple onChange={handleFileChange} />
        </div>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <button type="submit" className="submit-button">
          Submit Request
        </button>
      </form>
    </div>
  );
};

export default RequestForm;

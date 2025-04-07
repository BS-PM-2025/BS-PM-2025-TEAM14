import React, { useState } from "react";
import axios from "axios";
import "../CSS/GeneralRequestForm.css";

const RequestForm = ({ studentId }) => {
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
      const formData = new FormData();
      formData.append("title", title);
      formData.append("student_id", studentId);
      formData.append("details", details);

      if (files.length > 0) {
        files.forEach((file) => {
          formData.append("files", file);
        });
      }

      const repsonse = await axios.post(
        "http://localhost:8000/general_request/create",
        {
          title,
          student_id: studentId,
          details,
          files: files.length > 0 ? files.map((file) => file.name) : [],
        }
      );

      setMessage("Request created successfully");
      setTitle("");
      setDetails("");
      setFiles([]);
    } catch (error) {
      setError(
        error.repsonse?.data?.detail ||
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

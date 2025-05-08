import React, { useState, useEffect } from "react";
import axios from "axios";
import "../CSS/SubmitRequestForm.css";
import { useNavigate } from "react-router-dom";
import { getToken, getUserFromToken } from "../utils/auth";
import "../CSS/TransferRequests.css";

const TransferRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkLoginStatus = () => {
      const token = getToken();
      if (token) {
        const userData = getUserFromToken(token);
        console.log("User data from token:", userData);

        if (userData.role !== "secretary" && userData.role !== "admin") {
          console.log("Non-secretary/admin user detected, redirecting to home");
          navigate("/home");
          return;
        }

        setUser(userData);
        fetchRequests(userData.user_email);
      } else {
        setUser(null);
        navigate("/login");
      }
    };

    checkLoginStatus();
    window.addEventListener("storage", checkLoginStatus);
    window.addEventListener("focus", checkLoginStatus);

    return () => {
      window.removeEventListener("storage", checkLoginStatus);
      window.removeEventListener("focus", checkLoginStatus);
    };
  }, [navigate]);

  const fetchRequests = async (userEmail) => {
    try {
      const token = getToken();
      const response = await axios.get(
        `http://localhost:8000/secretary/transfer-requests/${userEmail}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setRequests(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError("Failed to fetch transfer requests");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="transfer-requests-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="transfer-requests-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="transfer-requests-container">
      <h1>Department Transfer Requests</h1>
      <div className="requests-grid">
        {requests.length === 0 ? (
          <div className="no-requests">
            <p>No transfer requests found for your department.</p>
          </div>
        ) : (
          requests.map((request) => {
            let type = "other";
            switch (request.title) {
              case "General Request":
                type = "general";
                break;
              case "Grade Appeal Request":
                type = "gradeAppeal";
                break;
              case "Military Serviece Request":
                type = "militaryServiece";
                break;
              case "Schedule Change Request":
                type = "scheduleChange";
                break;
              case "Exam Accommodations Request":
                type = "examAccommodation";
                break;
              default:
                type = "other";
            }

            return (
              <div key={request.id} className="request-card">
                <div className="request-header">
                  <h3>{request.title}</h3>
                  <span
                    className={`status-badge ${request.status?.toLowerCase()}`}
                  >
                    {request.status || "Pending"}
                  </span>
                </div>
                <div className="request-details">
                  <div className="detail-row">
                    <span className="label">Student:</span>
                    <span className="value">{request.student_name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Email:</span>
                    <span className="value">{request.student_email}</span>
                  </div>
                  {request.course_id && (
                    <div className="detail-row">
                      <span className="label">Course:</span>
                      <span className="value">{request.course_id}</span>
                    </div>
                  )}
                  {request.course_component && (
                    <div className="detail-row">
                      <span className="label">Component:</span>
                      <span className="value">{request.course_component}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">Date:</span>
                    <span className="value">
                      {new Date(request.created_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="request-description">
                  <p>{request.details}</p>
                </div>
                {request.files && request.files.length > 0 && (
                  <div className="request-files">
                    <h4>Attached Files:</h4>
                    <ul>
                      {request.files.map((file, index) => {
                        const filePath = `Documents/${request.student_email}/${type}/${file}`;
                        const encodedPath = encodeURIComponent(filePath);
                        const downloadUrl = `http://localhost:8000/downloadFile/${request.student_email}/${encodedPath}`;

                        return (
                          <li key={index}>
                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="download-link"
                              onClick={(e) => {
                                e.preventDefault();
                                window.open(downloadUrl, "_blank");
                              }}
                            >
                              {file}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TransferRequests;

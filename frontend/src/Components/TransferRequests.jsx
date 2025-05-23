import React, {useState, useEffect, useCallback} from "react";
import axios from "axios";
import "../CSS/SubmitRequestForm.css";
import { useNavigate } from "react-router-dom";
import { getToken, getUserFromToken } from "../utils/auth";
import "../CSS/TransferRequests.css";

const TransferRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [transferReason, setTransferReason] = useState("");

  // Filter states
  const [filters, setFilters] = useState({
    student: "",
    course: "",
    dateFrom: "",
    dateTo: "",
    status: "",
    type: "",
    department: "", // New filter for department
  });

  // Get unique values for filter options
  const getUniqueValues = (key) => {
    return [...new Set(requests.map((request) => request[key]))].filter(
      Boolean
    );
  };

  // Apply filters
  const applyFilters = useCallback(() => {
    let filtered = [...requests];

    if (filters.student) {
      filtered = filtered.filter(
        (request) =>
          request.student_email
            .toLowerCase()
            .includes(filters.student.toLowerCase()) ||
          request.student_name
            .toLowerCase()
            .includes(filters.student.toLowerCase())
      );
    }

    if (filters.course) {
      filtered = filtered.filter(
        (request) => request.course_id === filters.course
      );
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(
        (request) =>
          new Date(request.created_date) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(
        (request) => new Date(request.created_date) <= new Date(filters.dateTo)
      );
    }

    if (filters.type) {
      filtered = filtered.filter((request) => request.title === filters.type);
    }

    if (filters.department) {
      filtered = filtered.filter(
        (request) => request.department_id === filters.department
      );
    }

    setFilteredRequests(filtered);
  }, [filters, requests]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Apply filters when filter values change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

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
        fetchRequests(userData);
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

  const fetchRequests = async (userData) => {
    try {
      const token = getToken();
      let response;

      if (userData.role === "admin") {
        // Admin endpoint to get all requests
        response = await axios.get(
          `http://localhost:8000/admin/transfer-requests`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } else {
        // Secretary endpoint to get department-specific requests
        response = await axios.get(
          `http://localhost:8000/secretary/transfer-requests/${userData.user_email}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }

      setRequests(response.data);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching requests:", err);
      setError("Failed to fetch transfer requests");
      setLoading(false);
    }
  };

  const handleTransferClick = async (request) => {
    try {
      const token = getToken();
      const response = await axios.get(
        `http://localhost:8000/request/${request.id}/student_courses`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setAvailableCourses(response.data);
      setSelectedRequest(request);
      setShowTransferModal(true);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError("Failed to fetch available courses");
    }
  };

  const handleTransfer = async () => {
    if (!selectedRequest || !selectedCourse || !transferReason.trim()) {
      if (!transferReason.trim()) {
        alert("Please provide a reason for the transfer");
      }
      return;
    }

    try {
      const token = getToken();
      await axios.put(
        `http://localhost:8000/request/${selectedRequest.id}/transfer`,
        {
          new_course_id:
            selectedCourse === "department_secretary" ? null : selectedCourse,
          reason: transferReason,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Refresh the requests list
      fetchRequests(user);
      setShowTransferModal(false);
      setSelectedRequest(null);
      setSelectedCourse("");
      setTransferReason("");
    } catch (err) {
      console.error("Error transferring request:", err);
      setError("Failed to transfer request");
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
      <h1>
        <strong>{user?.role === "admin"
          ? "Transfer All Requests"
            : "Department Transfer Requests"}</strong>
      </h1>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filter-group">
          <input
            type="text"
            name="student"
            placeholder="Filter by student name or email"
            value={filters.student}
            onChange={handleFilterChange}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <select
            name="course"
            value={filters.course}
            onChange={handleFilterChange}
            className="filter-select"
          >
            <option value="">All Courses</option>
            {getUniqueValues("course_id").map((courseId) => (
              <option key={courseId} value={courseId}>
                {courseId}
              </option>
            ))}
          </select>
        </div>

        {user?.role === "admin" && (
          <div className="filter-group">
            <select
              name="department"
              value={filters.department}
              onChange={handleFilterChange}
              className="filter-select"
            >
              <option value="">All Departments</option>
              {getUniqueValues("department_id").map((deptId) => (
                <option key={deptId} value={deptId}>
                  {deptId}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="filter-group">
          <input
            type="date"
            name="dateFrom"
            value={filters.dateFrom}
            onChange={handleFilterChange}
            className="filter-input"
            placeholder="From Date"
          />
          <input
            type="date"
            name="dateTo"
            value={filters.dateTo}
            onChange={handleFilterChange}
            className="filter-input"
            placeholder="To Date"
          />
        </div>

        <div className="filter-group">
          <select
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            className="filter-select"
          >
            <option value="">All Types</option>
            {getUniqueValues("title").map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="requests-grid">
        {filteredRequests.length === 0 ? (
          <div className="no-requests">
            <p>No requests match the current filters.</p>
          </div>
        ) : (
          filteredRequests.map((request) => {
            let type = "other";
            switch (request.title) {
              case "General Request":
                type = "general";
                break;
              case "Grade Appeal Request":
                type = "gradeAppeal";
                break;
              case "Military Service Request":
                type = "militaryService";
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
                  <h3><strong>{request.title}</strong></h3>
                  <span
                    // className={`status-badge ${request.status?.toLowerCase()}`}
                    className={`status-badge ${getStatusClass(request.status)}`}
                  >
                    {/*{request.status || "Pending"}*/}
                    {getStatusText(request.status) || "Pending"}
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
                      {new Date(request.created_date).toLocaleDateString("he-IL")}
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
                <button
                  className="transfer-button"
                  onClick={() => handleTransferClick(request)}
                >
                  <strong>Transfer Request</strong>
                </button>
              </div>
            );
          })
        )}
      </div>

      {showTransferModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Transfer Request</h2>
            <p>Select a new course for this request:</p>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="course-select"
            >
              <option value="">Select a course</option>
              <option value="department_secretary">Department Secretary</option>
              {availableCourses.map((course) => (
                <option key={course.course_id} value={course.course_id}>
                  {course.course_name} ({course.course_id})
                </option>
              ))}
            </select>
            <div style={{ marginTop: "20px" }}>
              <label
                htmlFor="transferReason"
                style={{ display: "block", marginBottom: "8px" }}
              >
                Reason for Transfer:
              </label>
              <textarea
                id="transferReason"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="Please provide a reason for transferring this request..."
                style={{
                  width: "100%",
                  minHeight: "100px",
                  padding: "8px",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                  marginBottom: "20px",
                }}
                required
              />
            </div>
            <div className="modal-buttons">
              <button
                onClick={handleTransfer}
                className="confirm-button"
                disabled={!transferReason.trim()}
              >
                Transfer
              </button>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferReason("");
                }}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getStatusClass(status) {
  switch (status) {
    case "pending":
      return "bg-warning text-dark";
    case "in process":
      return "bg-info text-white";
    case "require editing":
      return "bg-warning text-dark";
    case "approved":
      return "bg-success text-white";
    case "rejected":
      return "bg-danger text-white";
    case "not read":
      return "bg-secondary text-white";
    case "responded":
      return "bg-secondary text-white";
    default:
      return "bg-light text-dark";
  }
}

function getStatusText(status) {
  switch (status) {
    case "pending":
      return "Pending";
    case "in process":
      return "In Process";
    case "require editing":
      return "Editing Required";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "not read":
      return "Not Read";
    case "responded":
      return "Responded";
    default:
      return status;
  }
}


export default TransferRequests;

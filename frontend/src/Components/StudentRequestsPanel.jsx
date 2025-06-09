import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "../CSS/StudentRequestsPanel.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileAlt,
  faSort,
  faSortUp,
  faSortDown,
  faFilter
} from "@fortawesome/free-solid-svg-icons";
import { getToken, getUserFromToken } from "../utils/auth";
import { useUser } from "./UserContext";
import { useNavigate } from "react-router-dom";
import { Fab } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import RequestCard from "./RequestCard";

// Status utility functions
const getStatusClass = (status) => {
  const statusClasses = {
    pending: "bg-warning text-dark",
    "in process": "bg-info text-white",
    "require editing": "bg-warning text-dark",
    approved: "bg-success text-white",
    rejected: "bg-danger text-white",
    "not read": "bg-secondary text-white",
    responded: "bg-secondary text-white",
    expired: "bg-dark text-white"
  };
  return statusClasses[status] || "bg-light text-dark";
};

const getStatusText = (status) => {
  const statusTexts = {
    pending: "Pending",
    "in process": "In Process",
    "require editing": "Editing Required",
    approved: "Approved",
    "not read": "Not Read",
    responded: "Responded",
    expired: "Expired"
  };
  return statusTexts[status] || status;
};

// Deadline utility functions
const isDeadlineApproaching = (deadlineDate) => {
  if (!deadlineDate) return false;
  const deadline = new Date(deadlineDate);
  const today = new Date();
  const timeDiff = deadline.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return daysDiff <= 3 && daysDiff >= 0;
};

const shouldShowDeadlineWarning = (request) => {
  const activeStatuses = ["pending", "in process", "require editing", "not read"];
  return (
      activeStatuses.includes(request.status) &&
      isDeadlineApproaching(request.deadline_date)
  );
};

const getDeadlineDisplayColor = (request) => {
  return shouldShowDeadlineWarning(request) ? "#f39c12" : "#6c757d";
};

function StudentRequests({ emailUser }) {
  const navigate = useNavigate();

  // State management
  const [user, setUser] = useState(null);
  const [allRequests, setAllRequests] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [visibleRequests, setVisibleRequests] = useState([]);

  // Modal state
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editDetails, setEditDetails] = useState("");

  // Sorting and filtering state
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Authentication check
  useEffect(() => {
    const checkLoginStatus = () => {
      const token = getToken();
      if (token) {
        const userData = getUserFromToken(token);
        console.log("User data from token:", userData);

        if (userData.role !== "student") {
          console.log("Non-student user detected, redirecting to home");
          navigate("/home");
          return;
        }

        setUser(userData);
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

  // Fetch user requests
  useEffect(() => {
    if (!user?.user_email) return;

    const fetchRequests = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/requests/${user.user_email}`);
        setAllRequests(response.data);
      } catch (error) {
        console.error("Error fetching requests:", error);
      }
    };

    fetchRequests();
  }, [user?.user_email]);

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axios.get('http://localhost:8000/courses');
        setAllCourses(response.data);
      } catch (error) {
        console.error("Error fetching courses:", error);
        setAllCourses([]);
      }
    };

    fetchCourses();
  }, []);

  // Fetch responses for selected request
  useEffect(() => {
    const fetchResponses = async () => {
      if (!selectedRequest) return;

      try {
        setLoadingResponses(true);
        const response = await axios.get(`http://localhost:8000/request/responses/${selectedRequest.id}`);
        setResponses(response.data);
      } catch (error) {
        console.error("Error fetching responses:", error);
        setResponses([]);
      } finally {
        setLoadingResponses(false);
      }
    };

    fetchResponses();
  }, [selectedRequest]);

  // Get unique courses for filter
  const uniqueCourses = useMemo(() => {
    const courses = [...new Set(allRequests.map(req => req.course).filter(Boolean))];
    return courses.sort();
  }, [allRequests]);

  // Filter and sort requests
  const filteredAndSortedRequests = useMemo(() => {
    let filtered = [...allRequests];

    // Apply filters
    if (filterStatus !== 'all') {
      filtered = filtered.filter(req => req.status === filterStatus);
    }

    if (filterCourse !== 'all') {
      filtered = filtered.filter(req => req.course === filterCourse);
    }

    if (filterDateFrom) {
      filtered = filtered.filter(req =>
          new Date(req.created_date) >= new Date(filterDateFrom)
      );
    }

    if (filterDateTo) {
      filtered = filtered.filter(req =>
          new Date(req.created_date) <= new Date(filterDateTo)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'date':
          aVal = new Date(a.created_date);
          bVal = new Date(b.created_date);
          break;
        case 'status':
          const statusPriority = {
            'pending': 1,
            'require editing': 2,
            'in process': 3,
            'not read': 4,
            'responded': 5,
            'approved': 6,
            'rejected': 7,
            'expired': 8
          };
          aVal = statusPriority[a.status] || 9;
          bVal = statusPriority[b.status] || 9;
          break;
        case 'Course':
          aVal = (a.title || '').toLowerCase();
          bVal = (b.title || '').toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allRequests, sortBy, sortOrder, filterStatus, filterCourse, filterDateFrom, filterDateTo]);

  // Animate visible requests
  useEffect(() => {
    setVisibleRequests([]);
    setTimeout(() => {
      filteredAndSortedRequests.forEach((request, index) => {
        setTimeout(() => {
          setVisibleRequests(prev => [...prev, request]);
        }, index * 100);
      });
    }, 0);
  }, [filteredAndSortedRequests]);

  // Event handlers
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return faSort;
    return sortOrder === 'asc' ? faSortUp : faSortDown;
  };

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterCourse('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const handleRequestClick = (request) => {
    setSelectedRequest(request);
  };

  const closeModal = () => {
    setSelectedRequest(null);
    setIsEditing(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this request?")) return;

    try {
      await axios.delete(`http://localhost:8000/Requests/${id}`);
      setAllRequests(prev => prev.filter(r => r.id !== id));
      setSelectedRequest(null);
    } catch (error) {
      console.error("Error deleting request:", error);
      alert("An error has occurred.");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!["pending", "require editing"].includes(selectedRequest.status)) {
        alert(`Cannot edit request with status: ${selectedRequest.status}`);
        return;
      }

      await axios.put(
          `http://localhost:8000/Requests/EditRequest/${selectedRequest.id}`,
          { details: editDetails },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getToken()}`,
            },
          }
      );

      setAllRequests(prev =>
          prev.map(r =>
              r.id === selectedRequest.id ? { ...r, details: editDetails } : r
          )
      );
      setSelectedRequest(r => ({ ...r, details: editDetails }));
      setIsEditing(false);
      alert("Request updated successfully.");
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "An error has occurred.";
      alert(errorMessage);
      setIsEditing(false);
    }
  };

  const canEditRequest = (request) => {
    return (
        ["pending", "require editing"].includes(request.status) &&
        request.status !== "expired"
    );
  };

  const canDeleteRequest = (request) => {
    return (
        ["pending", "not read"].includes(request.status) &&
        request.status !== "expired"
    );
  };

  return (
      <div className="container mt-4">
        <h2 className="text-center mb-4">
          <strong>My Requests</strong>
        </h2>

        {/* Controls Section */}
        <div className="card mb-4">
          <div className="card-body">
            {/* Sort Controls */}
            <div className="row mb-3">
              <div className="col-md-6">
                <h6>Sort by:</h6>
                <div className="btn-group" role="group">
                  {['date', 'status', 'Course'].map(field => (
                      <button
                          key={field}
                          type="button"
                          className={`btn ${sortBy === field ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => handleSort(field)}
                      >
                        {field.charAt(0).toUpperCase() + field.slice(1)}{' '}
                        <FontAwesomeIcon icon={getSortIcon(field)} className="ms-1" />
                      </button>
                  ))}
                </div>
              </div>
              <div className="col-md-6 text-end">
                <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowFilters(!showFilters)}
                >
                  <FontAwesomeIcon icon={faFilter} className="me-2" />
                  {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
              </div>
            </div>

            {/* Filter Controls */}
            {showFilters && (
                <div className="border-top pt-3">
                  <h6>Filters:</h6>
                  <div className="row">
                    <div className="col-md-3">
                      <label className="form-label">Status:</label>
                      <select
                          className="form-select form-select-sm"
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                      >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="in process">In Process</option>
                        <option value="require editing">Editing Required</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="not read">Not Read</option>
                        <option value="responded">Responded</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Course:</label>
                      <select
                          className="form-select form-select-sm"
                          value={filterCourse}
                          onChange={(e) => setFilterCourse(e.target.value)}
                      >
                        <option value="all">All Courses</option>
                        {allCourses.map(course => (
                            <option key={course.id || course.course_name} value={course.name}>
                              {course.name}
                            </option>
                        ))}
                        {uniqueCourses.map(course => (
                            <option key={course} value={course}>{course}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">From Date:</label>
                      <input
                          type="date"
                          className="form-control form-control-sm"
                          value={filterDateFrom}
                          onChange={(e) => setFilterDateFrom(e.target.value)}
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">To Date:</label>
                      <input
                          type="date"
                          className="form-control form-control-sm"
                          value={filterDateTo}
                          onChange={(e) => setFilterDateTo(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="row mt-2">
                    <div className="col-12">
                      <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={clearFilters}
                      >
                        Clear All Filters
                      </button>
                      <span className="ms-3 text-muted">
                    Showing {filteredAndSortedRequests.length} of {allRequests.length} requests
                  </span>
                    </div>
                  </div>
                </div>
            )}
          </div>
        </div>

        {/* Requests Grid */}
        <div className="row">
          {visibleRequests.length === 0 && filteredAndSortedRequests.length === 0 ? (
              <div className="col-12 text-center">
                <div className="alert alert-info">
                  No requests found matching your criteria.
                </div>
              </div>
          ) : (
              visibleRequests.map((request, index) => (
                  <RequestCard
                      key={`${request.id}-${index}`}
                      request={request}
                      onClick={handleRequestClick}
                  />
              ))
          )}
        </div>

        {/* Modal */}
        <AnimatePresence>
          {selectedRequest && (
              <div className="modal-backdrop" onClick={closeModal}>
                <motion.div
                    className="modal-container"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                  <div className="modal-content card shadow-lg p-4" dir="ltr">
                    {/* Modal Header */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h3 className="m-0 text-center d-flex justify-content-center" style={{ fontWeight: "bold" }}>
                        {selectedRequest.title}
                      </h3>
                    </div>

                    {/* Request Details */}
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <p><strong>Request ID:</strong> {selectedRequest.id}</p>
                        <p><strong>Date:</strong> {selectedRequest.created_date}</p>
                        {selectedRequest.deadline_date && (
                            <p>
                              <strong>Deadline:</strong>{" "}
                              <span
                                  style={{
                                    color: getDeadlineDisplayColor(selectedRequest),
                                    fontWeight: shouldShowDeadlineWarning(selectedRequest) ? "bold" : "normal",
                                  }}
                              >
                          {new Date(selectedRequest.deadline_date).toLocaleDateString()}
                                {shouldShowDeadlineWarning(selectedRequest) && " ⚠️ Approaching deadline!"}
                        </span>
                            </p>
                        )}
                        <p>
                          <strong>Status:</strong>{" "}
                          <span className={`badge ${getStatusClass(selectedRequest.status)}`}>
                        {getStatusText(selectedRequest.status)}
                      </span>
                        </p>
                        <p><strong>Details:</strong> {selectedRequest.details}</p>
                      </div>

                      {/* Attached Documents */}
                      <div className="col-md-6 attached-documents">
                        <p><strong>Attached Documents:</strong></p>
                        <ul className="list-group">
                          {(selectedRequest.files || []).map((doc, index) => (
                              <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                          <span>
                            <FontAwesomeIcon icon={faFileAlt} className="me-2 text-primary" />
                            {doc}
                          </span>
                                <a
                                    className="btn btn-sm btn-outline-primary"
                                    href={`http://localhost:8000/downloadFile/${emailUser}/${encodeURIComponent(doc)}`}
                                    download
                                >
                                  Download
                                </a>
                              </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="mb-3">
                      <h5>Request Timeline:</h5>
                      <div className="timeline">
                        {(selectedRequest?.timeline?.status_changes || []).map((statusChange, index) => (
                            <div className="timeline-item" key={index}>
                              <div className="timeline-date">
                                {new Date(statusChange.date).toLocaleDateString("he-IL")}
                              </div>
                              <div className="timeline-content">
                                <p>Status: {getStatusText(statusChange.status)}</p>
                              </div>
                            </div>
                        ))}
                      </div>
                    </div>

                    {/* Staff Responses */}
                    <div className="mb-3">
                      <h5>Staff Responses:</h5>
                      {loadingResponses ? (
                          <p>Loading...</p>
                      ) : responses.length === 0 ? (
                          <p className="text-muted">There are no replies for this request.</p>
                      ) : (
                          <div className="timeline">
                            {responses.map((resp, index) => (
                                <div key={index} className="timeline-item">
                                  <div className="timeline-date">
                                    {new Date(resp.created_date).toLocaleDateString("he-IL")} - {resp.professor_email}
                                  </div>
                                  <div className="timeline-content">
                                    <p>{resp.response_text}</p>
                                    {resp.files && resp.files.length > 0 && (
                                        <div className="mt-2">
                                          <h6>Attached Files:</h6>
                                          <ul className="list-group">
                                            {resp.files.map((doc, idx) => (
                                                <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                                      <span>
                                        <FontAwesomeIcon icon={faFileAlt} className="me-2 text-primary" />
                                        {doc}
                                      </span>
                                                  <a
                                                      className="btn btn-sm btn-outline-primary"
                                                      href={`http://localhost:8000/downloadFile/${emailUser}/${encodeURIComponent(doc)}`}
                                                      download
                                                  >
                                                    Download
                                                  </a>
                                                </li>
                                            ))}
                                          </ul>
                                        </div>
                                    )}
                                  </div>
                                </div>
                            ))}
                          </div>
                      )}
                    </div>

                    {/* Edit Request Form */}
                    {isEditing && (
                        <div className="mb-3">
                          <form onSubmit={handleEditSubmit}>
                            <div className="mb-2">
                              <label>Details:</label>
                              <textarea
                                  className="form-control"
                                  value={editDetails}
                                  onChange={(e) => setEditDetails(e.target.value)}
                                  rows={4}
                              />
                            </div>
                            <button type="submit" className="btn btn-primary me-2">
                              Save
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setIsEditing(false)}
                            >
                              Cancel
                            </button>
                          </form>
                        </div>
                    )}

                    {/* Modal Actions */}
                    <div className="text-end mt-3">
                      {selectedRequest.status === "expired" && (
                          <div className="alert alert-warning mb-3" style={{
                            backgroundColor: "#f8d7da",
                            borderColor: "#f5c6cb",
                            color: "#721c24",
                          }}>
                            <strong>⏰ Request Expired:</strong> This request has passed its deadline and cannot be edited or deleted.
                          </div>
                      )}

                      {canEditRequest(selectedRequest) && !isEditing && (
                          <Fab
                              color="secondary"
                              aria-label="edit"
                              style={{ marginRight: "185px" }}
                              onClick={() => {
                                setIsEditing(true);
                                setEditDetails(selectedRequest.details);
                              }}
                          >
                            <EditIcon />
                          </Fab>
                      )}

                      {canDeleteRequest(selectedRequest) && (
                          <button
                              className="btn btn-danger requestDeleteBTN"
                              onClick={() => handleDelete(selectedRequest.id)}
                          >
                            Delete Request
                          </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
          )}
        </AnimatePresence>
      </div>
  );
}

export default StudentRequests;
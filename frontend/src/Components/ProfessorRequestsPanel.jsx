import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getToken, getUserFromToken } from "../utils/auth";
import {
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Box,
  Grid,
} from "@mui/material";
import "../CSS/ProfessorRequestsPanel.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileAlt } from "@fortawesome/free-solid-svg-icons";

const isRTL = (str) => {
  const hebrew = /[\u0590-\u05FF]/;
  return hebrew.test(str);
};

function ProfessorRequestsPanel() {
  const [requests, setRequests] = useState([]);
  const [sortBy, setSortBy] = useState("created_desc");
  const [sortedRequests, setSortedRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const navigate = useNavigate();
  const [responseText, setResponseText] = useState("");
  const [responseFiles, setResponseFiles] = useState([]);
  const [user, setUser] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogData, setDialogData] = useState({
    requestId: null,
    newStatus: "",
  });
  const [templates, setTemplates] = useState([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ title: "", content: "" });

  // New state variables for filtering
  const [studentFilter, setStudentFilter] = useState("");
  const [departmentStudents, setDepartmentStudents] = useState([]);
  const [hideCompleted, setHideCompleted] = useState(false);

  const handleOpenDialog = (requestId, newStatus) => {
    setDialogData({ requestId, newStatus });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleConfirmStatusChange = async () => {
    try {
      await axios.post("http://localhost:8000/update_status", {
        request_id: dialogData.requestId,
        status: dialogData.newStatus,
      });

      // Update the local state to reflect the status change
      setRequests((prevRequests) =>
        prevRequests.map((req) =>
          req.id === dialogData.requestId
            ? { ...req, status: dialogData.newStatus }
            : req
        )
      );

      // Update the selected request state if it's the one currently selected
      if (selectedRequest && selectedRequest.id === dialogData.requestId) {
        setSelectedRequest({
          ...selectedRequest,
          status: dialogData.newStatus,
        });
      }

      alert("Status updated successfully");
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Error updating status");
    } finally {
      handleCloseDialog();
    }
  };

  const checkAuth = useCallback(async () => {
    const token = getToken();
    if (!token) return navigate("/login");
    const user = getUserFromToken(token);
    setUser(user);

    let apiUrl = "";
    if (user.role === "professor") {
      apiUrl = `http://localhost:8000/requests/professor/${user?.user_email}`;
    } else if (user.role === "secretary") {
      apiUrl = `http://localhost:8000/requests/${user?.user_email}`;
      // Add student filter if selected
      if (studentFilter) {
        apiUrl += `?student_email=${encodeURIComponent(studentFilter)}`;
      }
    } else {
      return navigate("/home");
    }

    try {
      const response = await axios.get(apiUrl);
      setRequests(response.data);

      // If user is secretary, also fetch department students for filter
      if (user.role === "secretary") {
        try {
          const studentsResponse = await axios.get(
            `http://localhost:8000/secretary/department-students/${user?.user_email}`
          );
          setDepartmentStudents(studentsResponse.data);
        } catch (err) {
          console.error("Error fetching department students:", err);
        }
      }
    } catch (err) {
      console.error("Error fetching requests:", err);
    }
  }, [navigate, studentFilter]);

  const handleResponseSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("request_id", selectedRequest.id);
    formData.append("professor_email", user?.user_email);
    formData.append("response_text", responseText);

    for (let i = 0; i < responseFiles.length; i++) {
      formData.append("files", responseFiles[i], responseFiles[i].name);
    }

    try {
      for (let pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }
      await axios.post("http://localhost:8000/submit_response", formData);

      alert("Response sent successfully.");
      setSelectedRequest(null);
      setResponseText("");
      setResponseFiles([]);
      checkAuth();
    } catch (error) {
      console.error("Error submitting response:", error);
      alert("An error has occurred.");
    }
  };

  const loadTemplates = async () => {
    try {
      const token = getToken();
      const response = await axios.get(
        "http://localhost:8000/comment_templates",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setTemplates(response.data);
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      const token = getToken();
      await axios.post("http://localhost:8000/comment_templates", newTemplate, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setShowTemplateDialog(false);
      setNewTemplate({ title: "", content: "" });
      loadTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      const token = getToken();
      await axios.delete(
        `http://localhost:8000/comment_templates/${templateId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      loadTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user?.role === "professor") {
      loadTemplates();
    }
  }, [user]);

  useEffect(() => {
    let filteredRequests = [...requests];

    // Filter out completed requests if toggle is enabled
    if (hideCompleted) {
      filteredRequests = filteredRequests.filter(
        (req) =>
          !["approved", "responded", "rejected", "expired"].includes(req.status)
      );
    }

    // Sort the filtered requests
    const sorted = filteredRequests.sort((a, b) => {
      switch (sortBy) {
        case "created_desc":
          return new Date(b.created_date) - new Date(a.created_date);
        case "created_asc":
          return new Date(a.created_date) - new Date(b.created_date);
        case "title_asc":
          return a.title.localeCompare(b.title);
        case "title_desc":
          return b.title.localeCompare(a.title);
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
    setSortedRequests(sorted);
  }, [sortBy, requests, hideCompleted]);

  const handleSortChange = (e) => setSortBy(e.target.value);

  const clearSort = () => {
    setSortBy("created_desc");
  };

  const clearFilters = () => {
    setStudentFilter("");
    setHideCompleted(false);
    setSortBy("created_desc");
  };

  return (
    <div className="container-fluid mt-4">
      <h1 className="text-center mb-4">
        <strong>
          {hideCompleted ? "Active Requests" : "Pending Requests"}
          {studentFilter && departmentStudents.length > 0 && (
            <span
              className="text-muted"
              style={{ fontSize: "0.7em", display: "block" }}
            >
              Filtered by:{" "}
              {departmentStudents.find((s) => s.email === studentFilter)?.name}
            </span>
          )}
        </strong>
      </h1>

      <div className="d-flex justify-content-end mb-3">
        {/* Student Filter for Secretaries */}
        {user?.role === "secretary" && (
          <FormControl
            variant="outlined"
            className="me-2"
            sx={{ minWidth: 200 }}
          >
            <InputLabel id="student-filter-label">Filter by Student</InputLabel>
            <Select
              labelId="student-filter-label"
              value={studentFilter}
              onChange={(e) => setStudentFilter(e.target.value)}
              label="Filter by Student"
              size="small"
            >
              <MenuItem value="">All Students</MenuItem>
              {departmentStudents.map((student) => (
                <MenuItem key={student.email} value={student.email}>
                  {student.name} ({student.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl
          variant="outlined"
          className="me-2 sort-select"
          sx={{ minWidth: 120 }}
        >
          <InputLabel id="sort-label">Sort By</InputLabel>
          <Select
            labelId="sort-label"
            value={sortBy}
            onChange={handleSortChange}
            label="Sort By"
            defaultValue="created_desc"
            size="small"
            variant={"outlined"}
          >
            <MenuItem value="created_desc">Date (New to Old)</MenuItem>
            <MenuItem value="created_asc">Date (Old to New)</MenuItem>
            <MenuItem value="title_asc">Title (A-Z)</MenuItem>
            <MenuItem value="title_desc">Title (Z-A)</MenuItem>
            <MenuItem value="status">Status</MenuItem>
          </Select>
        </FormControl>

        {/* Hide Completed Toggle */}
        <Button
          variant={hideCompleted ? "contained" : "outlined"}
          color={hideCompleted ? "primary" : "secondary"}
          className="me-2"
          onClick={() => setHideCompleted(!hideCompleted)}
          size="large"
          sx={{
            minWidth: 160,
            textTransform: "none",
            fontSize: "16px",
          }}
        >
          {hideCompleted ? "Show All" : "Hide Completed"}
        </Button>

        <Button
          variant="outlined"
          color="secondary"
          className="clear-sort-button"
          onClick={studentFilter || hideCompleted ? clearFilters : clearSort}
          size="large"
          sx={{
            minWidth: 120,
            alignSelf: "flex-start",
            marginLeft: "10px",
            textTransform: "none",
            fontSize: "20px",
          }}
        >
          {studentFilter || hideCompleted ? "Clear All" : "Clear Sort"}
        </Button>
      </div>

      <div className="row">
        {sortedRequests.map((req, i) => (
          <motion.div
            key={req.id}
            className="col-md-4 col-sm-6 mb-3"
            onClick={() => setSelectedRequest(req)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.1 }}
          >
            <div className="card request-card shadow-lg">
              <div className="card-body">
                <h5 className="card-title">
                  <strong>{req.title}</strong>
                </h5>
                <p className="card-text">
                  <strong>Date :</strong> {req.created_date}
                </p>
                <p className="card-text">
                  <strong>From :</strong> {req.student_email}
                </p>
                {req.deadline_date && (
                  <p
                    className="card-text"
                    style={{
                      color: getDeadlineDisplayColor(req),
                      fontWeight: shouldShowDeadlineWarning(req)
                        ? "bold"
                        : "normal",
                    }}
                  >
                    <strong>Deadline:</strong>{" "}
                    {new Date(req.deadline_date).toLocaleDateString()}
                    {shouldShowDeadlineWarning(req) && " ⚠️"}
                  </p>
                )}
                <p className={`badge ${getStatusClass(req.status)}`}>
                  {getStatusText(req.status)}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {selectedRequest && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedRequest(null)}
        >
          <motion.div
            className="modal-container"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="modal-content card shadow-lg p-4" dir="ltr">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3
                  className="m-0 text-center d-flex justify-content-center"
                  style={{ fontWeight: "bold" }}
                >
                  {selectedRequest.title}
                </h3>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <p>
                    <strong>Request ID:</strong> {selectedRequest.id}
                  </p>
                  <p>
                    <strong>Date:</strong> {selectedRequest.created_date}
                  </p>
                  {selectedRequest.deadline_date && (
                    <p>
                      <strong>Deadline:</strong>{" "}
                      <span
                        style={{
                          color: getDeadlineDisplayColor(selectedRequest),
                          fontWeight: shouldShowDeadlineWarning(selectedRequest)
                            ? "bold"
                            : "normal",
                        }}
                      >
                        {new Date(
                          selectedRequest.deadline_date
                        ).toLocaleDateString()}
                        {shouldShowDeadlineWarning(selectedRequest) &&
                          " ⚠️ Approaching deadline!"}
                      </span>
                    </p>
                  )}
                  <p>
                    <strong>Status:</strong>{" "}
                    <span
                      className={`badge ${getStatusClass(
                        selectedRequest.status
                      )}`}
                    >
                      {getStatusText(selectedRequest.status)}
                    </span>
                  </p>
                  <p>
                    <strong>From:</strong> {selectedRequest.student_email}
                  </p>
                  <div style={{ marginBottom: "10px" }}>
                    <strong>Details:</strong>
                    <div style={{ marginLeft: "10px" }}>
                      {parseDetails(selectedRequest.details)}
                    </div>
                  </div>
                  <p>
                    <strong>Course:</strong> {selectedRequest.course_id}
                  </p>
                  <p>
                    <strong>Course Component:</strong>{" "}
                    {selectedRequest.course_component}
                  </p>
                </div>
                <div className="col-md-6 attached-documents">
                  <p>
                    <strong>Attached Documents:</strong>
                  </p>
                  <ul className="list-group">
                    {(selectedRequest.files || []).map((doc, index) => (
                      <li
                        key={index}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        <span
                          style={{
                            maxWidth: "180px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={doc}
                        >
                          <FontAwesomeIcon
                            icon={faFileAlt}
                            className="me-2 text-primary"
                          />
                          {doc}
                        </span>
                        <a
                          className="btn btn-sm btn-outline-primary"
                          href={`http://localhost:8000/downloadFile/${encodeURIComponent(
                            selectedRequest.student_email
                          )}/${encodeURIComponent(doc)}`}
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
                  {(selectedRequest?.timeline?.status_changes || []).map(
                    (statusChange, index) => (
                      <div className="timeline-item" key={index}>
                        <div className="timeline-date">
                          {new Date(statusChange.date).toLocaleDateString(
                            "he-IL"
                          )}
                        </div>
                        <div className="timeline-content">
                          <p>Status: {getStatusText(statusChange.status)}</p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
              {/* Staff Responses Section (if any) */}
              <div className="mb-3">
                <h5>Staff Responses:</h5>
                <p className="text-muted">
                  There are no replies for this request.
                </p>
              </div>
              {/* Reply and Status Controls */}
              {selectedRequest.status === "expired" && (
                <div
                  className="alert alert-warning mt-3"
                  style={{
                    backgroundColor: "#f8d7da",
                    borderColor: "#f5c6cb",
                    color: "#721c24",
                  }}
                >
                  <strong>⏰ Request Expired:</strong> This request has passed
                  its deadline and cannot be processed further.
                </div>
              )}
              {(user?.role === "professor" || user?.role === "secretary") &&
                selectedRequest.status !== "expired" && (
                  <>
                    <hr />
                    <h5 className="mt-3">Reply :</h5>
                    <form onSubmit={handleResponseSubmit} method="POST">
                      {user?.role === "professor" && (
                        <div className="mb-3">
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs>
                              <FormControl fullWidth>
                                <InputLabel id="template-select-label">
                                  Select Template
                                </InputLabel>
                                <Select
                                  labelId="template-select-label"
                                  label="Select Template"
                                  value=""
                                  onChange={(e) => {
                                    const template = templates.find(
                                      (t) => t.id === e.target.value
                                    );
                                    if (template)
                                      setResponseText(template.content);
                                  }}
                                >
                                  {templates.map((template) => (
                                    <MenuItem
                                      key={template.id}
                                      value={template.id}
                                    >
                                      <Box
                                        sx={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                          width: "100%",
                                        }}
                                      >
                                        <span>{template.title}</span>
                                        <Button
                                          size="small"
                                          variant="text"
                                          color="error"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (
                                              window.confirm(
                                                "Are you sure you want to delete this template?"
                                              )
                                            ) {
                                              handleDeleteTemplate(template.id);
                                            }
                                          }}
                                          sx={{ ml: 2 }}
                                        >
                                          Delete
                                        </Button>
                                      </Box>
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item>
                              <Button
                                variant="contained"
                                onClick={() => setShowTemplateDialog(true)}
                                sx={{ whiteSpace: "nowrap" }}
                              >
                                Create New Template
                              </Button>
                            </Grid>
                          </Grid>
                        </div>
                      )}
                      <div className="mb-3">
                        <textarea
                          className="form-control"
                          rows="4"
                          placeholder="submit your reply here..."
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          required
                          style={{
                            direction: isRTL(responseText) ? "rtl" : "ltr",
                          }}
                        ></textarea>
                      </div>
                      <div className="mb-3 file-upload-section">
                        <label className="form-label mb-1">
                          Attach Documents (Optional):
                        </label>
                        <button
                          type="button"
                          className="custom-file-btn btn btn-secondary mb-2"
                          onClick={() =>
                            document.getElementById("response-files").click()
                          }
                          style={{ display: "block" }}
                        >
                          Choose Files
                        </button>
                        <input
                          type="file"
                          id="response-files"
                          multiple
                          style={{ display: "none" }}
                          onChange={(e) =>
                            setResponseFiles([...e.target.files])
                          }
                        />
                        {responseFiles.length > 0 && (
                          <div className="selected-files mt-2">
                            <ul style={{ paddingLeft: 0, marginBottom: 0 }}>
                              {Array.from(responseFiles).map((file, idx) => (
                                <li
                                  key={idx}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    maxWidth: "250px",
                                    listStyle: "none",
                                    marginBottom: "4px",
                                  }}
                                >
                                  <span
                                    style={{
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      maxWidth: "180px",
                                    }}
                                    title={file.name}
                                  >
                                    {file.name}
                                  </span>
                                  <button
                                    type="button"
                                    className="remove-file-btn btn btn-sm btn-outline-danger ms-2"
                                    onClick={() =>
                                      setResponseFiles((prev) =>
                                        Array.from(prev).filter(
                                          (_, i) => i !== idx
                                        )
                                      )
                                    }
                                    aria-label="Remove file"
                                  >
                                    ×
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <button className="btn btn-primary mt-2" type="submit">
                        Submit
                      </button>
                    </form>
                  </>
                )}
              {(user?.role === "secretary" || user?.role === "professor") &&
                selectedRequest.status !== "expired" && (
                  <div className="mt-3">
                    <FormControl
                      variant="outlined"
                      className="me-2"
                      sx={{ minWidth: 200 }}
                    >
                      <InputLabel id="status-label">Update Status</InputLabel>
                      <Select
                        labelId="status-label"
                        value={selectedRequest.status}
                        onChange={(e) =>
                          handleOpenDialog(selectedRequest.id, e.target.value)
                        }
                        label="Change Request Status"
                      >
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="in process">In Process</MenuItem>
                        <MenuItem value="require editing">
                          Editing Required
                        </MenuItem>
                        <MenuItem value="approved">Approve</MenuItem>
                        <MenuItem value="rejected">Reject</MenuItem>
                      </Select>
                    </FormControl>
                  </div>
                )}
              <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
              >
                <DialogTitle id="alert-dialog-title">
                  {"Confirm Status Update"}
                </DialogTitle>
                <DialogContent>
                  <DialogContentText id="alert-dialog-description">
                    <strong>
                      Are you sure you want to change the status to{" "}
                      {dialogData.newStatus} ?
                    </strong>
                  </DialogContentText>
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleCloseDialog} color="secondary">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmStatusChange}
                    color="primary"
                    autoFocus
                  >
                    Approve
                  </Button>
                </DialogActions>
              </Dialog>
              <Dialog
                open={showTemplateDialog}
                onClose={() => setShowTemplateDialog(false)}
              >
                <DialogTitle>Create New Comment Template</DialogTitle>
                <DialogContent>
                  <TextField
                    autoFocus
                    margin="dense"
                    label="Template Title"
                    fullWidth
                    value={newTemplate.title}
                    onChange={(e) =>
                      setNewTemplate({ ...newTemplate, title: e.target.value })
                    }
                    inputProps={{
                      style: {
                        direction: isRTL(newTemplate.title) ? "rtl" : "ltr",
                      },
                    }}
                  />
                  <TextField
                    margin="dense"
                    label="Template Content"
                    fullWidth
                    multiline
                    rows={4}
                    value={newTemplate.content}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        content: e.target.value,
                      })
                    }
                    inputProps={{
                      style: {
                        direction: isRTL(newTemplate.content) ? "rtl" : "ltr",
                      },
                    }}
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setShowTemplateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveTemplate} color="primary">
                    Save
                  </Button>
                </DialogActions>
              </Dialog>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function isDeadlineApproaching(deadlineDate) {
  if (!deadlineDate) return false;
  const deadline = new Date(deadlineDate);
  const today = new Date();
  const timeDiff = deadline.getTime() - today.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return daysDiff <= 3 && daysDiff >= 0; // Within 3 days
}

function shouldShowDeadlineWarning(request) {
  // Only show warnings for active requests that can still be acted upon
  const activeStatuses = [
    "pending",
    "in process",
    "require editing",
    "not read",
  ];
  return (
    activeStatuses.includes(request.status) &&
    isDeadlineApproaching(request.deadline_date)
  );
}

function getDeadlineDisplayColor(request) {
  // Only use warning color for active requests
  if (shouldShowDeadlineWarning(request)) {
    return "#f39c12"; // Warning orange
  }
  return "#6c757d"; // Normal gray
}

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
    case "expired":
      return "bg-dark text-white";
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
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

function parseDetails(details) {
  if (!details) return null;
  // Try to split by known keys for grade appeal
  const regex =
    /Course: ([^ ]+) Component: ([^ ]+) Current Grade: ([^ ]+) Appeal Details: (.*)/;
  const match = details.match(regex);
  if (match) {
    return (
      <>
        <div>
          <strong>Course:</strong> {match[1]}
        </div>
        <div>
          <strong>Component:</strong> {match[2]}
        </div>
        <div>
          <strong>Current Grade:</strong> {match[3]}
        </div>
        <div>
          <strong>Appeal Details:</strong> {match[4]}
        </div>
      </>
    );
  }
  // Fallback: split by newlines or colons
  return details.split(/\n|\r|;/).map((line, i) => <div key={i}>{line}</div>);
}

export default ProfessorRequestsPanel;

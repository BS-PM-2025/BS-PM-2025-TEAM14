import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "../CSS/StudentRequestsPanel.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileAlt } from "@fortawesome/free-solid-svg-icons";
import {getToken, getUserFromToken} from "../utils/auth";
import {useUser} from "./UserContext";
import {useNavigate} from "react-router-dom";
import {Fab} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';


function StudentRequests({ emailUser }) {
    const navigate = useNavigate();
    const [visibleRequests, setVisibleRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editDetails, setEditDetails] = useState("");
    const [user, setUser] = useState(null);
    const [responses, setResponses] = useState([]);
    const [loadingResponses, setLoadingResponses] = useState(false);

    useEffect(() => {
        const checkLoginStatus = () => {
            const token = getToken();
            if (token) {
                const userData = getUserFromToken(token);
                console.log("User data from token:", userData);

                // Check if user is a student
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
    }, []);

    useEffect(() => {
        const fetchResponses = async () => {
            if (!selectedRequest) return;
            try {
                setLoadingResponses(true);
                const res = await axios.get(`http://localhost:8000/request/responses/${selectedRequest.id}`);
                setResponses(res.data);
            } catch (err) {
                console.error("Error fetching responses:", err);
                setResponses([]);
            } finally {
                setLoadingResponses(false);
            }
        };

        fetchResponses();
    }, [selectedRequest]);


    useEffect(() => {
        const fetchRequests = async () => {
            try {
                const response = await axios.get(`http://localhost:8000/requests/${user?.user_email}`);
                const data = response.data;
                console.log(data);

                setVisibleRequests([]);
                setTimeout(() => {
                    data.forEach((request, index) => {
                        setTimeout(() => {
                            setVisibleRequests(prev => [...prev, request]);
                        }, index * 300);
                    });
                }, 0);

            } catch (error) {
                console.error("Error fetching requests:", error);
            }
        };

        fetchRequests();
    }, [user]);

    const handleRequestClick = (request) => {
        setSelectedRequest(request);
    };

    const closeModal = () => {
        setSelectedRequest(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this request?")) return;
        try {
            // call your FastAPI DELETE endpoint
            await axios.delete(`http://localhost:8000/Requests/${id}`);
            // remove it from the list so the UI updates
            setVisibleRequests(prev => prev.filter(r => r.id !== id));
            // close the modal
            setSelectedRequest(null);
            alert("Request deleted Successfully.")
        } catch (err) {
            console.error("An error has occurred.", err);
            alert("An error has occurred.");
        }
    };

    const handleEditSubmit = async e => {
        e.preventDefault();
        try {
            // Validate request status before attempting edit
            if (!["pending", "require editing"].includes(selectedRequest.status)) {
                alert(`Cannot edit request with status: ${selectedRequest.status}`);
                return;
            }

            const response = await axios.put(
                `http://localhost:8000/Requests/EditRequest/${selectedRequest.id}`,
                {
                    details: editDetails
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${getToken()}`
                    }
                }
            );

            // 1) update the list
            setVisibleRequests(prev =>
                prev.map(r =>
                    r.id === selectedRequest.id
                        ? { ...r, details: editDetails }
                        : r
                )
            );
            // 2) update the selectedRequest so the modal shows the new text
            setSelectedRequest(r => ({ ...r, details: editDetails }));
            // 3) exit edit-mode
            setIsEditing(false);
            alert("Request updated successfully.");
        } catch (err) {
            let errorMessage = "An error has occurred.";
            if (err.response?.data?.detail) {
                errorMessage = err.response.data.detail;
            }
            alert(errorMessage);

            // If there's an error, exit edit mode
            setIsEditing(false);
        }
    };

    return (
        <div className="container mt-4">
            <h2 className="text-center mb-4"><strong>My Requests</strong></h2>
            <div className="row">
                {visibleRequests.map((request, index) => (
                    <motion.div
                        key={`${request.id}-${index}`}
                        className="col-md-4 col-sm-6 mb-3 fade-in"
                        onClick={() => handleRequestClick(request)}
                        style={{ cursor: "pointer" }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="card shadow-lg p-3 request-card">
                            <div className="card-body">
                                <h5 className="card-title d-flex align-items-center">
                                    {request.title}
                                    {request.files && request.files.length > 0 && (
                                        <FontAwesomeIcon
                                            icon={faFileAlt}
                                            size="sm"
                                            style={{ marginLeft: "8px", color: "#007bff" }}
                                        />
                                    )}
                                </h5>
                                <p className="card-text"><strong>Date:</strong> {request.created_date}</p>
                                <p className={`badge ${getStatusClass(request.status)}`}>
                                    {getStatusText(request.status)}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

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
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h3 className="m-0 text-center d-flex justify-content-center" style={{ fontWeight: "bold" }}>{selectedRequest.title}</h3>
                                    {/*<button*/}
                                    {/*    type="button"*/}
                                    {/*    className="btn-close"*/}
                                    {/*    onClick={closeModal}*/}
                                    {/*    aria-label="Close"*/}
                                    {/*></button>*/}
                                </div>
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <p><strong>Request ID:</strong> {selectedRequest.id}</p>
                                        <p><strong>Date:</strong> {selectedRequest.created_date}</p>
                                        <p><strong>Status:</strong> <span
                                            className={`badge ${getStatusClass(selectedRequest.status)}`}>
                                            {getStatusText(selectedRequest.status)}
                                        </span></p>
                                        <p><strong>Details:</strong> {selectedRequest.details}</p>
                                        <br/>
                                    </div>
                                    <div className="col-md-6 attached-documents">
                                        <p><strong>Attached Documents:</strong></p>
                                        <ul className="list-group">
                                            {(selectedRequest.files || []).map((doc, index) => (
                                                <li key={index}
                                                    className="list-group-item d-flex justify-content-between align-items-center">
                                                    <span>
                                                        <FontAwesomeIcon icon={faFileAlt}
                                                                         className="me-2 text-primary"/>
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
                                <div className="mb-3">
                                    <h5>Staff Replies:</h5>
                                    {loadingResponses ? (
                                        <p>loading...</p>
                                    ) : responses.length === 0 ? (
                                        <p className="text-muted">There are no replies for this requests.</p>
                                    ) :
                                        (
                                        <div className="timeline">
                                            {responses.map((resp, index) => (
                                                <div key={index} className="timeline-item">
                                                    <div className="timeline-date">
                                                        {new Date(resp.created_date).toLocaleDateString("he-IL")} - {resp.professor_email}
                                                    </div>
                                                    <div className="timeline-content">
                                                        <p>{resp.response_text}</p>

                                                        {/* If there are files attached to the response */}
                                                        {resp.files && resp.files.length > 0 && (
                                                            <div className="mt-2">
                                                                <h6>Attached Documents:</h6>
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
                                                download>
                                                Download</a>
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
                                {/*Edit Request form*/}
                                <div className="mb-3">
                                    {isEditing && (
                                        <form onSubmit={handleEditSubmit}>
                                            <div className="mb-2">
                                                <label>Details:</label>
                                                <textarea
                                                    className="form-control"
                                                    value={editDetails}
                                                    onChange={e => setEditDetails(e.target.value)}
                                                    rows={4}
                                                />
                                            </div>
                                            <button type="submit" className="btn btn-primary me-2" style={{marginLeft: '15px'}}>
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
                                    )}
                                </div>
                                {/*End Edit Request form*/}

                                <div className="text-end mt-3">
                                    {/*<button*/}
                                    {/*    className="btn btn-secondary me-2 requestCloseBTN"*/}
                                    {/*    onClick={closeModal}*/}
                                    {/*>*/}
                                    {/*    Close*/}
                                    {/*</button>*/}

                                    {(selectedRequest.status === "pending" || selectedRequest.status === "require editing") && !isEditing && (
                                        <Fab
                                            color="secondary"
                                            aria-label="edit"
                                            style={{ marginRight: '185px' }}
                                            onClick={() => {
                                                setIsEditing(true)
                                                setEditDetails(selectedRequest.details);
                                                // setEditFiles(selectedRequest.files || []);
                                            }}
                                        >
                                            <EditIcon />
                                        </Fab>
                                    )}

                                    {(selectedRequest.status === "pending" || selectedRequest.status === "not read") && (
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

function getStatusClass(status) {
    switch (status) {
        case "pending":
            return "bg-warning text-dark";
        case "approved":
            return "bg-success text-white";
        case "rejected":
            return "bg-danger text-white";
        case "not read":
            return "bg-secondary text-white";
        default:
            return "bg-secondary text-white";
    }
}

function getStatusText(status) {
    switch (status) {
        case "pending":
            return "Pending";
        case "approved":
            return "Approved";
        case "rejected":
            return "Rejected";
        case "not read":
            return "Not Read";
        default:
            return status;
    }
}

export default StudentRequests;

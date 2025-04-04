import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "bootstrap/dist/css/bootstrap.min.css";
import "../CSS/StudentRequestsPanel.css";

const sampleRequests = [
    { id: 1, title: "אישור מחלה", status: "pending", date: "2025-04-01", documents: ["illness_certificate.pdf"] },
    { id: 2, title: "ערעור על ציון", status: "approved", date: "2025-03-28", documents: ["illness_certificate.pdf"] },
    { id: 3, title: "בקשה להארכת מועד הגשה", status: "rejected", date: "2025-03-25", documents: ["illness_certificate.pdf"] },
    { id: 4, title: "אישור מילואים", status: "pending", date: "2025-03-22", documents: ["illness_certificate.pdf"] },
    { id: 5, title: "בקשה להקלות", status: "approved", date: "2025-03-20", documents: ["illness_certificate.pdf"] },
];

function StudentRequests({ UserId }) {
    const [visibleRequests, setVisibleRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);

    useEffect(() => {
        sampleRequests.forEach((request, index) => {
            setTimeout(() => {
                setVisibleRequests((prev) => [...prev, request]);
            }, index * 300); 
        });
    }, []);

    const handleRequestClick = (request) => {
        setSelectedRequest(request);
    };

    const closeModal = () => {
        setSelectedRequest(null);
    };

    return (
        <div className="container mt-4">
            <h2 className="text-center mb-4">הבקשות שלי</h2>
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
                                <h5 className="card-title">{request.title}</h5>
                                <p className="card-text"><strong>תאריך:</strong> {request.date}</p>
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
                            <div className="modal-content card shadow-lg p-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h3 className="m-0">{selectedRequest.title}</h3>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={closeModal}
                                        aria-label="Close"
                                    ></button>
                                </div>
                                <div className="row mb-3">
                                    <div className="col-md-6">
                                        <p><strong>מזהה בקשה:</strong> {selectedRequest.id}</p>
                                        <p><strong>תאריך:</strong> {selectedRequest.date}</p>
                                        <p><strong>סטטוס:</strong> <span className={`badge ${getStatusClass(selectedRequest.status)}`}>
                                            {getStatusText(selectedRequest.status)}
                                        </span></p>
                                    </div>
                                    <div className="col-md-6">
                                        <p><strong>מסמכים מצורפים:</strong></p>
                                        <ul className="list-group">
                                            {selectedRequest.documents.map((doc, index) => (
                                                <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                                                    {doc}
                                                    <button className="btn btn-sm btn-outline-primary">להורדה</button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <h5>היסטוריית הבקשה</h5>
                                    <div className="timeline">
                                        <div className="timeline-item">
                                            <div className="timeline-date">{selectedRequest.date}</div>
                                            <div className="timeline-content">
                                                <p>בקשה נשלחה</p>
                                            </div>
                                        </div>
                                        {selectedRequest.status !== "waiting" && (
                                            <div className="timeline-item">
                                                <div className="timeline-date">{new Date(new Date(selectedRequest.date).getTime() + 86400000 * 2).toISOString().split('T')[0]}</div>
                                                <div className="timeline-content">
                                                    <p>בקשה {selectedRequest.status === "accept" ? "אושרה" : "נדחתה"}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-end mt-3">
                                    <button className="btn btn-secondary me-2" onClick={closeModal}>סגירה</button>
                                    {selectedRequest.status === "waiting" && (
                                        <button className="btn btn-warning">עריכת בקשה</button>
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
        default:
            return "bg-secondary text-white";
    }
}

function getStatusText(status) {
    switch (status) {
        case "pending":
            return "ממתין לאישור";
        case "approved":
            return "אושר";
        case "rejected":
            return "נדחה";
        case "not read":
            return "טרם טופל"
        default:
            return status;
    }
}

export default StudentRequests;
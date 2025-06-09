// components/RequestCard.jsx
import React from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileAlt } from "@fortawesome/free-solid-svg-icons";

const getStatusClass = (status) => {
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
        case "responded":
            return "bg-secondary text-white";
        case "expired":
            return "bg-dark text-white";
        default:
            return "bg-light text-dark";
    }
};

const getStatusText = (status) => {
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
};

const isDeadlineApproaching = (deadlineDate) => {
    if (!deadlineDate) return false;
    const deadline = new Date(deadlineDate);
    const today = new Date();
    const diff = deadline - today;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days <= 3 && days >= 0;
};

const shouldShowDeadlineWarning = (request) => {
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
};

const getDeadlineDisplayColor = (request) => {
    if (shouldShowDeadlineWarning(request)) return "#f39c12";
    return "#6c757d";
};

export default function RequestCard({ request, onClick }) {
    return (
        <motion.div
            className="col-md-4 col-sm-6 mb-3 fade-in"
            onClick={() => onClick(request)}
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
                        <strong>{request.title}</strong>
                        {request.files?.length > 0 && (
                            <FontAwesomeIcon
                                icon={faFileAlt}
                                size="sm"
                                className="ms-2 text-primary"
                            />
                        )}
                    </h5>
                    <p className="card-text">
                        <strong>Date:</strong> {request.created_date}
                    </p>
                    <p className="card-text">
                        <strong>Status:</strong>{" "}
                        <span className={`badge ${getStatusClass(request.status)}`}>
              {getStatusText(request.status)}
            </span>
                    </p>
                    {request.deadline_date && (
                        <p
                            className="card-text"
                            style={{
                                color: getDeadlineDisplayColor(request),
                                fontWeight: shouldShowDeadlineWarning(request)
                                    ? "bold"
                                    : "normal",
                            }}
                        >
                            <strong>Deadline:</strong>{" "}
                            {new Date(request.deadline_date).toLocaleDateString()}{" "}
                            {shouldShowDeadlineWarning(request) && " ⚠️"}
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

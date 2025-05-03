import React, { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getToken, getUserFromToken } from "../utils/auth";
import { Button, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import "../CSS/ProfessorRequestsPanel.css";

function ProfessorRequestsPanel() {
    const [requests, setRequests] = useState([]);
    const [sortBy, setSortBy] = useState("created_desc");
    const [sortedRequests, setSortedRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const navigate = useNavigate();
    const [responseText, setResponseText] = useState("");
    const [responseFiles, setResponseFiles] = useState([]);
    const [user, setUser] = useState(null);

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
            await axios.post("http://localhost:8000/submit_request", formData);

            alert("תגובתך נשלחה בהצלחה");
            setSelectedRequest(null);
            setResponseText("");
            setResponseFiles([]);
            checkAuth();
        } catch (error) {
            console.error("Error submitting response:", error);
            alert("שגיאה בשליחת תגובה");
        }
    };

    const checkAuth = async () => {
        const token = getToken();
        if (!token) return navigate("/login");
        const user = getUserFromToken(token);
        setUser(user);
        if (user.role !== "professor") return navigate("/home");
        try {
            const response = await axios.get(`http://localhost:8000/requests/professor/${user?.user_email}`);
            setRequests(response.data);
        } catch (err) {
            console.error("Error fetching professor requests:", err);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        const sorted = [...requests].sort((a, b) => {
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
    }, [sortBy, requests]);

    const handleSortChange = (e) => setSortBy(e.target.value);

    const clearSort = () => {
        setSortBy("created_desc");
    };

    return (
        <div className="container mt-4">
            <h2 className="text-center mb-4">כל הבקשות שהוגשו</h2>

            <div className="d-flex justify-content-end mb-3">
                <FormControl variant="outlined" className="me-2" sx={{ minWidth: 200 }}>
                    <InputLabel id="sort-label">מיין לפי</InputLabel>
                    <Select
                        labelId="sort-label"
                        value={sortBy}
                        onChange={handleSortChange}
                        label="מיין לפי"
                        defaultValue="created_desc"
                    >
                        <MenuItem value="created_desc">תאריך (חדש לישן)</MenuItem>
                        <MenuItem value="created_asc">תאריך (ישן לחדש)</MenuItem>
                        <MenuItem value="title_asc">נושא (א'-ת')</MenuItem>
                        <MenuItem value="title_desc">נושא (ת'-א')</MenuItem>
                        <MenuItem value="status">סטטוס</MenuItem>
                    </Select>
                </FormControl>
                <Button
                    variant="outlined"
                    color="secondary"
                    onClick={clearSort}
                    sx={{ minWidth: 120, alignSelf: 'flex-start', marginLeft: '10px' }}
                >
                    ניקוי מיון
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
                                <h5 className="card-title">{req.title}</h5>
                                <p className="card-text"><strong>תאריך:</strong> {req.created_date}</p>
                                <p className={`badge ${getStatusClass(req.status)}`}>{getStatusText(req.status)}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {selectedRequest && (
                <div className="modal-backdrop" onClick={() => setSelectedRequest(null)}>
                    <motion.div
                        className="modal-container"
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        <div className="modal-content card shadow-lg p-4">
                            <h4>{selectedRequest.title}</h4>
                            <p><strong>נשלח בתאריך:</strong> {selectedRequest.created_date}</p>
                            <p><strong>סטטוס:</strong> <span className={`badge ${getStatusClass(selectedRequest.status)}`}>{getStatusText(selectedRequest.status)}</span></p>
                            <p><strong>תוכן:</strong> {selectedRequest.details}</p>

                            {/* טופס תגובה */}
                            <hr />
                            <h5 className="mt-3">הגב על בקשה זו:</h5>
                            <form onSubmit={handleResponseSubmit}>
                                <div className="mb-3">
                                    <textarea
                                        className="form-control"
                                        rows="4"
                                        placeholder="כתוב תגובה כאן..."
                                        value={responseText}
                                        onChange={(e) => setResponseText(e.target.value)}
                                        required
                                    ></textarea>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">צרף קבצים (לא חובה):</label>
                                    <input
                                        type="file"
                                        className="form-control"
                                        multiple
                                        onChange={(e) => setResponseFiles([...e.target.files])}
                                    />
                                </div>
                                <button className="btn btn-primary" type="submit">שלח תגובה</button>
                            </form>

                            <button className="btn btn-secondary mt-3" onClick={() => setSelectedRequest(null)}>סגירה</button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

function getStatusClass(status) {
    switch (status) {
        case "pending": return "bg-warning text-dark";
        case "approved": return "bg-success text-white";
        case "rejected": return "bg-danger text-white";
        case "not read": return "bg-secondary text-white";
        default: return "bg-light text-dark";
    }
}

function getStatusText(status) {
    switch (status) {
        case "pending": return "ממתין";
        case "approved": return "אושר";
        case "rejected": return "נדחה";
        case "not read": return "טרם נקרא";
        default: return status;
    }
}

export default ProfessorRequestsPanel;

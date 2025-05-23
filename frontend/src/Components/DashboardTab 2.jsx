import React, { useEffect, useState } from 'react';
import { Grid, Card, CardContent, Typography, CircularProgress, Alert, Box, Button } from '@mui/material';
import axios from 'axios';

const DashboardTab = ({ userEmail }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRequests = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await axios.get(`http://localhost:8000/requests/dashboard/${userEmail}`);
                setRequests(response.data);
                console.log(response.data)
            } catch (err) {
                setError('Failed to fetch requests');
            }
            setLoading(false);
        };

        if (userEmail) {
            fetchRequests();
        }
    }, [userEmail]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    if (requests.length === 0) {
        return (
            <Typography variant="h6" align="center" color="textSecondary" sx={{ marginTop: '20px' }}>
                No requests found.
            </Typography>
        );
    }

    return (
        <Grid container spacing={2} sx={{ marginTop: '20px' }}>
            {requests.map((request) => {
                let type = "other";
                switch (request.title) {
                    case "General Request":
                        type = "general";
                        break;
                    case "Grade Appeal Request":
                        type = "gradeAppeal";
                        break;
                    case "Military Service Request":
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
                    <Grid item xs={12} md={6} lg={4} key={request.id}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6">{request.title}</Typography>
                                <Typography color="textSecondary">{request.status || 'Pending'}</Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Student: {request.student_name}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Email: {request.student_email}
                                </Typography>
                                {request.course_id && (
                                    <Typography variant="body2" color="textSecondary">
                                        Course: {request.course_id}
                                    </Typography>
                                )}
                                {request.course_component && (
                                    <Typography variant="body2" color="textSecondary">
                                        Component: {request.course_component}
                                    </Typography>
                                )}
                                <Typography variant="body2" color="textSecondary">
                                    Date: {new Date(request.created_date).toLocaleDateString()}
                                </Typography>
                                <Typography sx={{ marginTop: '10px' }}>{request.details}</Typography>

                                {request.files && request.files.length > 0 && (
                                    <Box sx={{ marginTop: '10px' }}>
                                        <Typography variant="subtitle1">Attached Files:</Typography>
                                        <ul>
                                            {request.files.map((file, index) => {
                                                const filePath = `Documents/${request.student_email}/${type}/${file}`;
                                                const encodedPath = encodeURIComponent(filePath);
                                                const downloadUrl = `http://localhost:8000/downloadFile/${request.student_email}/${encodedPath}`;

                                                return (
                                                    <li key={index}>
                                                        <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                                                            {file}
                                                        </a>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                );
            })}
        </Grid>
    );
};

export default DashboardTab;


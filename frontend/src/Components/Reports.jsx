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
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  Alert,
  TextField,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { enGB } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  FileDownload,
  FilterList,
  Analytics,
  Timeline,
} from "@mui/icons-material";
import "../CSS/Reports.css";

const Reports = () => {
  const [user, setUser] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Filter states
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedRequestType, setSelectedRequestType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Chart colors
  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
  ];

  const checkAuth = useCallback(async () => {
    const token = getToken();
    if (!token) return navigate("/login");

    const user = getUserFromToken(token);
    if (user.role == "student") {
      return navigate("/home");
    }
    setUser(user);
  }, [navigate]);

  const fetchReportData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedCourse) params.append("course_id", selectedCourse);
      if (selectedRequestType)
        params.append("request_type", selectedRequestType);
      if (selectedStatus) params.append("status", selectedStatus);
      if (selectedStudent) params.append("student_email", selectedStudent);
      if (startDate)
        params.append("start_date", startDate.toISOString().split("T")[0]);
      if (endDate)
        params.append("end_date", endDate.toISOString().split("T")[0]);

      const response = await axios.get(
        `http://localhost:8000/reports/${user.role}/${
          user.user_email
        }?${params.toString()}`
      );
      setReportData(response.data);
    } catch (err) {
      console.error("Error fetching report data:", err);
      setError("Failed to fetch report data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [
    user,
    selectedCourse,
    selectedRequestType,
    selectedStatus,
    selectedStudent,
    endDate,
  ]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user) {
      fetchReportData();
    }
  }, [fetchReportData]);

  const handleFilterReset = () => {
    setSelectedCourse("");
    setSelectedRequestType("");
    setSelectedStatus("");
    setSelectedStudent("");
    setStartDate(null);
    setEndDate(null);
  };

  const exportToPDF = async () => {
    const element = document.getElementById("reports-content");
    const canvas = await html2canvas(element, {
      scale: 2,
      allowTaint: true,
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const currentDate = new Date().toISOString().split("T")[0];
    pdf.save(`Reports_${currentDate}.pdf`);
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading reports...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!reportData) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No data available for reports.</Alert>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={enGB}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="reports-container"
      >
        <Box sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              <Analytics sx={{ mr: 2, verticalAlign: "middle" }} />
              Analytics Dashboard
            </Typography>
            <Typography variant="subtitle1" color="textSecondary">
              Comprehensive insights into student requests and course activities
            </Typography>
          </Box>

          {/* Filters Section */}
          <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              <FilterList sx={{ mr: 1, verticalAlign: "middle" }} />
              Filters
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Course</InputLabel>
                  <Select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    label="Course"
                  >
                    <MenuItem value="">All Courses</MenuItem>
                    {reportData?.courses?.map((course) => (
                      <MenuItem key={course.id} value={course.id}>
                        {course.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Request Type</InputLabel>
                  <Select
                    value={selectedRequestType}
                    onChange={(e) => setSelectedRequestType(e.target.value)}
                    label="Request Type"
                  >
                    <MenuItem value="">All Types</MenuItem>
                    {reportData?.requestTypes?.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="denied">Denied</MenuItem>
                    <MenuItem value="in_progress">In Progress</MenuItem>
                    <MenuItem value="expired">Expired</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Student</InputLabel>
                  <Select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    label="Student"
                  >
                    <MenuItem value="">All Students</MenuItem>
                    {reportData?.students?.map((student) => (
                      <MenuItem key={student.email} value={student.email}>
                        {student.name} ({student.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="Start Date"
                  value={startDate}
                  onChange={setStartDate}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <DatePicker
                  label="End Date"
                  value={endDate}
                  onChange={setEndDate}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="outlined"
                  onClick={handleFilterReset}
                  fullWidth
                  sx={{ height: "56px" }}
                >
                  Reset Filters
                </Button>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Button
                  variant="contained"
                  onClick={exportToPDF}
                  startIcon={<FileDownload />}
                  fullWidth
                  sx={{ height: "56px" }}
                >
                  Export PDF
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Main Content */}
          <div id="reports-content">
            {/* Key Metrics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Total Requests
                    </Typography>
                    <Typography variant="h4" component="div">
                      {reportData?.summary?.totalRequests || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Pending Requests
                    </Typography>
                    <Typography
                      variant="h4"
                      component="div"
                      color="warning.main"
                    >
                      {reportData?.summary?.pendingRequests || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Approved Requests
                    </Typography>
                    <Typography
                      variant="h4"
                      component="div"
                      color="success.main"
                    >
                      {reportData?.summary?.approvedRequests || 0}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>
                      Average Response Time
                    </Typography>
                    <Typography variant="h4" component="div">
                      {reportData?.summary?.avgResponseTime || 0}
                      <Typography variant="caption" display="block">
                        days
                      </Typography>
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Charts Section */}
            <Grid container spacing={3}>
              {/* Requests by Course - Bar Chart */}
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Requests by Course
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={reportData?.chartData?.requestsByCourse || []}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="courseName" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              {/* Request Status Distribution - Pie Chart */}
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Request Status Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportData?.chartData?.statusDistribution || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {(reportData?.chartData?.statusDistribution || []).map(
                          (entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          )
                        )}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              {/* Requests Over Time - Line Chart */}
              <Grid item xs={12}>
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    <Timeline sx={{ mr: 1, verticalAlign: "middle" }} />
                    Requests Over Time
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={reportData?.chartData?.requestsOverTime || []}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#8884d8"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              {/* Requests by Student - Bar Chart */}
              <Grid item xs={12} md={6}>
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Top Students by Request Count
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={reportData?.chartData?.requestsByStudent || []}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="studentName"
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>

              {/* Student Activity Over Time - Line Chart (shown only when student is selected) */}
              {selectedStudent && (
                <Grid item xs={12} md={6}>
                  <Paper elevation={2} sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Selected Student Activity Over Time
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={reportData?.chartData?.studentActivity || []}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#ff7300"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Paper>
                </Grid>
              )}

              {/* Student Latest Requests (shown only when student is selected) */}
              {selectedStudent &&
                reportData?.studentLatestRequests?.length > 0 && (
                  <Grid item xs={12}>
                    <Paper elevation={2} sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>
                        Latest Requests from Selected Student
                      </Typography>
                      <Grid container spacing={2}>
                        {reportData.studentLatestRequests.map((request) => (
                          <Grid item xs={12} md={6} key={request.id}>
                            <Card variant="outlined" sx={{ p: 2 }}>
                              <Typography variant="h6" gutterBottom>
                                {request.title}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="textSecondary"
                                gutterBottom
                              >
                                Course: {request.courseName}
                              </Typography>
                              <Chip
                                label={request.status}
                                color={
                                  request.status === "approved"
                                    ? "success"
                                    : request.status === "denied"
                                    ? "error"
                                    : request.status === "pending"
                                    ? "warning"
                                    : "default"
                                }
                                size="small"
                                sx={{ mb: 1 }}
                              />
                              <Typography variant="body2" gutterBottom>
                                <strong>Created:</strong>{" "}
                                {new Date(
                                  request.created_date
                                ).toLocaleDateString("en-GB")}
                              </Typography>
                              <Typography variant="body2" gutterBottom>
                                <strong>Details:</strong>{" "}
                                {request.details?.substring(0, 100)}
                                {request.details?.length > 100 && "..."}
                              </Typography>
                              {request.files &&
                                Object.keys(request.files).length > 0 && (
                                  <Typography variant="body2" color="primary">
                                    📎 {Object.keys(request.files).length}{" "}
                                    file(s) attached
                                  </Typography>
                                )}
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Paper>
                  </Grid>
                )}

              {/* Detailed Requests Table */}
              <Grid item xs={12}>
                <Paper elevation={2} sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Detailed Requests Overview
                  </Typography>
                  <Box sx={{ overflowX: "auto" }}>
                    <table className="requests-table">
                      <thead>
                        <tr>
                          <th>Request ID</th>
                          <th>Student</th>
                          <th>Student Email</th>
                          <th>Course</th>
                          <th>Request Type</th>
                          <th>Status</th>
                          <th>Created Date</th>
                          <th>Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(reportData?.detailedRequests || []).map((request) => (
                          <tr key={request.id}>
                            <td>#{request.id}</td>
                            <td>{request.studentName}</td>
                            <td>{request.studentEmail}</td>
                            <td>{request.courseName}</td>
                            <td>{request.title}</td>
                            <td>
                              <Chip
                                label={request.status}
                                color={
                                  request.status === "approved"
                                    ? "success"
                                    : request.status === "denied"
                                    ? "error"
                                    : request.status === "pending"
                                    ? "warning"
                                    : "default"
                                }
                                size="small"
                              />
                            </td>
                            <td>
                              {new Date(
                                request.created_date
                              ).toLocaleDateString("en-GB")}
                            </td>
                            <td>
                              <Box
                                sx={{
                                  maxWidth: 200,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={request.details}
                              >
                                {request.details?.substring(0, 50)}
                                {request.details?.length > 50 && "..."}
                              </Box>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Box>

                  {selectedStudent && (
                    <Box
                      sx={{
                        mt: 2,
                        p: 2,
                        bgcolor: "info.light",
                        borderRadius: 1,
                      }}
                    >
                      <Typography variant="body2" color="info.dark">
                        📊 Showing {reportData?.detailedRequests?.length || 0}{" "}
                        request(s)
                        {selectedStudent &&
                          ` for ${
                            reportData?.students?.find(
                              (s) => s.email === selectedStudent
                            )?.name || "selected student"
                          }`}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </div>
        </Box>
      </motion.div>
    </LocalizationProvider>
  );
};

export default Reports;

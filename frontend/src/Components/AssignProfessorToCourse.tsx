// @ts-nocheck
import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Button,
  CircularProgress,
  Divider,
  Grid,
  Box,
} from "@mui/material";
import { motion } from "framer-motion";
import axios from "axios";
import { TransferList } from "./TransferList";
import "../CSS/AssignProfessorToCourse.css";
import { FaChalkboardTeacher, FaBookOpen } from "react-icons/fa";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";

interface Lecturer {
  email: string;
  first_name: string;
  last_name: string;
}

interface Course {
  id: string;
  name: string;
}

export default function AssignProfessorToCourse() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignedCourses, setAssignedCourses] = useState<string[]>([]);
  const [selectedLecturer, setSelectedLecturer] = useState("");
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lecturersRes, coursesRes] = await Promise.all([
          axios.get("http://localhost:8000/users?role=professor"),
          axios.get("http://localhost:8000/courses"),
        ]);
        setLecturers(lecturersRes.data);
        setCourses(coursesRes.data);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchAssignedCourses = async () => {
      if (selectedLecturer) {
        try {
          const response = await axios.get(
            `http://localhost:8000/professor/courses/${selectedLecturer}`
          );
          const assignedCourseIds = response.data.courses.map(
            (course: Course) => course.id
          );
          setAssignedCourses(assignedCourseIds);
        } catch (err) {
          console.error("Error loading assigned courses:", err);
        }
      }
    };
    fetchAssignedCourses();
  }, [selectedLecturer]);

  const handleSave = async () => {
    if (!selectedLecturer || assignedCourses.length === 0) return;
    try {
      await axios.post("http://localhost:8000/assign_professor", {
        professor_email: selectedLecturer,
        course_ids: assignedCourses,
      });
      setSnackbar({
        open: true,
        message: "Courses assigned successfully",
        severity: "success",
      });
      setSelectedLecturer(selectedLecturer);
    } catch (error) {
      console.error("Error assigning courses:", error);
      setSnackbar({
        open: true,
        message: "Failed to assign courses",
        severity: "error",
      });
    }
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        bgcolor="#f7fafd"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bgcolor="#f7fafd"
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: "100%", maxWidth: 900, margin: "auto" }}
      >
        <Card elevation={4} sx={{ borderRadius: 4, p: 4 }}>
          <CardContent sx={{ p: 0 }}>
            <Typography
              variant="h4"
              fontWeight={700}
              color="#2d3a4b"
              align="center"
              mb={4}
            >
              Assign Lecturer to Course
            </Typography>
            <FormControl fullWidth sx={{ mb: 4 }}>
              <InputLabel id="lecturer-label">
                <Box component="span" display="flex" alignItems="center">
                  <FaChalkboardTeacher style={{ marginLeft: 8 }} /> Choose
                  Lecturer
                </Box>
              </InputLabel>
              <Select
                labelId="lecturer-label"
                value={selectedLecturer}
                onChange={(e) => setSelectedLecturer(e.target.value)}
                label="Choose Lecturer"
                sx={{ minWidth: 320, fontSize: "1.1rem", height: 56 }}
              >
                {lecturers.map((lecturer) => (
                  <MenuItem key={lecturer.email} value={lecturer.email}>
                    {lecturer.email}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Divider sx={{ my: 3 }} />
            <Box
              sx={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
                mb: 4,
              }}
            >
              <TransferList
                left={courses.filter((c) => !assignedCourses.includes(c.id))}
                right={courses.filter((c) => assignedCourses.includes(c.id))}
                onChange={(ids) => setAssignedCourses(ids)}
                leftTitle={
                  <>
                    <FaBookOpen
                      style={{ marginLeft: 6, verticalAlign: "middle" }}
                    />
                    Available Courses
                  </>
                }
                rightTitle={
                  <>
                    <FaBookOpen
                      style={{ marginLeft: 6, verticalAlign: "middle" }}
                    />
                    Assigned Courses
                  </>
                }
                disabled={!selectedLecturer}
              />
            </Box>
            <Box display="flex" justifyContent="flex-end" mt={2}>
              <Button className="save-button" variant="contained" color="primary" onClick={handleSave}>
                Save Assignment
              </Button>
            </Box>
          </CardContent>
        </Card>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3500}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <MuiAlert
            onClose={handleSnackbarClose}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
            elevation={6}
            variant="filled"
          >
            {snackbar.message}
          </MuiAlert>
        </Snackbar>
      </motion.div>
    </Box>
  );
}

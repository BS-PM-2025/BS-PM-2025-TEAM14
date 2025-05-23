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
import { FaUserGraduate, FaBookOpen } from "react-icons/fa";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";

interface Student {
  email: string;
  first_name: string;
  last_name: string;
}

interface Course {
  id: string;
  name: string;
}

export default function AssignStudentsToCourse() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [assignedStudents, setAssignedStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, studentsRes] = await Promise.all([
          axios.get("http://localhost:8000/courses"),
          axios.get("http://localhost:8000/users?role=student"),
        ]);
        setCourses(coursesRes.data);
        setStudents(studentsRes.data);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchAssignedStudents = async () => {
      if (!selectedCourse) return;

      try {
        const response = await axios.get(
          `http://localhost:8000/assigned_students?course_id=${selectedCourse}`
        );
        const assignedStudentEmails = response.data.map(
          (student: Student) => student.email
        );
        setAssignedStudents(assignedStudentEmails);
      } catch (err) {
        console.error("Error fetching assigned students:", err);
      }
    };

    fetchAssignedStudents();
  }, [selectedCourse]);

  const handleSave = async () => {
    if (!selectedCourse || assignedStudents.length === 0) return;

    try {
      await axios.post("http://localhost:8000/assign_student", {
        student_emails: assignedStudents,
        course_id: selectedCourse,
      });
      setSnackbar({
        open: true,
        message: "Students assigned successfully",
        severity: "success",
      });
    } catch (error) {
      console.error("Error assigning students:", error);
      setSnackbar({
        open: true,
        message: "Failed to assign students",
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
              Assign Students to Course
            </Typography>
            <FormControl fullWidth sx={{ mb: 4 }}>
              <InputLabel id="course-label">
                <Box component="span" display="flex" alignItems="center">
                  <FaBookOpen style={{ marginRight: 8 }} /> Choose Course
                </Box>
              </InputLabel>
              <Select
                labelId="course-label"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                label="Choose Course"
                sx={{ minWidth: 320, fontSize: "1.1rem", height: 56 }}
              >
                {courses.map((course) => (
                  <MenuItem key={course.id} value={course.id}>
                    {course.name}
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
                left={students.filter(
                  (s) => !assignedStudents.includes(s.email)
                )}
                right={students.filter((s) =>
                  assignedStudents.includes(s.email)
                )}
                onChange={(ids) => setAssignedStudents(ids)}
                leftTitle={
                  <>
                    <FaUserGraduate
                      style={{ marginLeft: 6, verticalAlign: "middle" }}
                    />
                    Available Students
                  </>
                }
                rightTitle={
                  <>
                    <FaUserGraduate
                      style={{ marginLeft: 6, verticalAlign: "middle" }}
                    />
                    Assigned Students
                  </>
                }
                disabled={!selectedCourse}
              />
            </Box>
            <Box display="flex" justifyContent="flex-end" mt={2}>
              <Button
                className="save-button"
                variant="contained"
                color="primary"
                onClick={handleSave}
              >
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

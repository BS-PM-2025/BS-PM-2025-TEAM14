import React, { useEffect, useState } from "react";
import {
    Box,
    Typography,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    Button,
    CircularProgress,
} from "@mui/material";
import { motion } from "framer-motion";
import axios from "axios";
import { TransferList } from "./TransferList";
import "../CSS/AssignProfessorToCourse.css";

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
    const [lecturers, setLecturers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [assignedCourses, setAssignedCourses] = useState([]);
    const [selectedLecturer, setSelectedLecturer] = useState("");
    const [loading, setLoading] = useState(true);

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
                    const assignedCourseIds = response.data.courses.map((course: Course) => course.id);
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
            alert("Courses assigned successfully");
            setSelectedLecturer(selectedLecturer);
        } catch (error) {
            console.error("Error assigning courses:", error);
            alert("Failed to assign courses");
        }
    };

    if (loading) {
        return (
            <Box className="flex justify-center items-center h-64">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <motion.div
            className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-md space-y-6"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            <Typography variant="h5" className="font-semibold text-center">
                שיוך קורסים למרצה
            </Typography>

            <FormControl fullWidth className="select-lecturer">
                <InputLabel id="lecturer-label">בחר מרצה</InputLabel>
                <Select
                    labelId="lecturer-label"
                    value={selectedLecturer}
                    onChange={(e) => setSelectedLecturer(e.target.value)}
                    label="בחר מרצה"
                >
                    {lecturers.map((lecturer) => (
                        <MenuItem key={lecturer.email} value={lecturer.email}>
                            {lecturer.first_name} {lecturer.last_name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <Box className="flex flex-wrap gap-4 md:flex-nowrap justify-between items-start">
                <TransferList
                    left={courses.filter((c) => !assignedCourses.includes(c.id))}
                    right={courses.filter((c) => assignedCourses.includes(c.id))}
                    onChange={(ids: string[]) => setAssignedCourses(ids)}
                    leftTitle="קורסים זמינים"
                    rightTitle="קורסים משויכים"
                />
            </Box>

            <Box className="flex justify-end">
                <Button variant="contained" color="primary" onClick={handleSave}>
                    שמור שיוך
                </Button>
            </Box>
        </motion.div>
    );
}

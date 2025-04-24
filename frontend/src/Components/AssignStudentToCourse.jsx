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
import { AnimatePresence, motion } from "framer-motion";
import { TransferList } from "./TransferList";
import axios from "axios";

interface Course {
    id: string;
    name: string;
}

interface Student {
    email: string;
    name: string;
}

export default function AssignStudentsToCourse() {
    const [courses, setCourses] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [assignedStudents, setAssignedStudents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [coursesRes, studentsRes] = await Promise.all([
                    axios.get("http://localhost:8000/courses"),
                    axios.get("http://localhost:8000/users?role=student"),
                ]);
                setCourses(coursesRes.data);
                setStudents(studentsRes.data);
                console.log(coursesRes.data);
                console.log(studentsRes.data);
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
                setAssignedStudents(response.data.map((student: Student) => student.email));
            } catch (err) {
                console.error("Error fetching assigned students:", err);
            }
        };

        fetchAssignedStudents();
    }, [selectedCourse]);

    const handleSave = async () => {
        if (!selectedCourse) return;

        try {
            console.log("Emails to send:", assignedStudents);
            console.log("Selected course:", selectedCourse);
            await axios.post("http://localhost:8000/assign_student", {
                student_emails: assignedStudents,
                course_id: selectedCourse,
            });
            alert("סטודנטים שויכו בהצלחה");
        } catch (error) {
            console.error("Error assigning students:", error);
            alert("שגיאה בשיוך הסטודנטים");
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
                שיוך סטודנטים לקורס
            </Typography>

            <FormControl fullWidth>
                <InputLabel id="course-label">בחר קורס</InputLabel>
                <Select
                    labelId="course-label"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    label="בחר קורס"
                >
                    {courses.map((course) => (
                        <MenuItem key={course.id} value={course.id}>
                            {course.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <TransferList
                left={students.filter((s) => !assignedStudents.includes(s.email))}
                right={students.filter((s) => assignedStudents.includes(s.email))}
                onChange={(ids: string[]) => setAssignedStudents(ids)}
                leftTitle="סטודנטים זמינים"
                rightTitle="סטודנטים משויכים"
            />

            <Box className="flex justify-end">
                <Button variant="contained" color="primary" onClick={handleSave}>
                    שמור שיוך
                </Button>
            </Box>
        </motion.div>
    );
}

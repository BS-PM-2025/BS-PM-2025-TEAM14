import React, { useEffect, useState } from "react";
import {
    Box,
    Select,
    MenuItem,
    InputLabel,
    FormControl,
    Button,
    CircularProgress,
} from "@mui/material";
import { motion } from "framer-motion";
import { TransferList } from "./TransferList";
import axios from "axios";

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
            alert("Student Assign Successfully");
        } catch (error) {
            console.error("Error assigning students:", error);
            alert("An error has occurred.");
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
            initial={{opacity: 0, y: 40}}
            animate={{opacity: 1, y: 0}}
            transition={{duration: 0.4}}
        >
            {/*<Typography variant="h1" className="font-semibold text-center">*/}
            {/*    Assign Students To Course*/}
            {/*</Typography>*/}

            <h1 className="text-center mb-4">
                <strong>Assign Students To Course</strong>
            </h1>
            <Box sx={{ display: "flex", justifyContent: "center" }}>
                <FormControl sx={{ width: "50%" }} size="medium">
                    <InputLabel id="course-label">Choose Course</InputLabel>
                    <Select
                        labelId="course-label"
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        label="Choose Course"
                        size="medium"
                    >
                        {courses.map((course) => (
                            <MenuItem key={course.id} value={course.id}>
                                {course.name}
                            </MenuItem>
                        ))}
                    </Select>
                    <br/>
                </FormControl>
            </Box>
            <br />
            <TransferList
                left={students.filter((s) => !assignedStudents.includes(s.email))}
                right={students.filter((s) => assignedStudents.includes(s.email))}
                onChange={(ids: string[]) => setAssignedStudents(ids)}
                leftTitle="Available Students"
                rightTitle="Assigned Students"
            />

            <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Button variant="contained" color="primary" onClick={handleSave} size="large">
                    Save
                </Button>
            </Box>
        </motion.div>
    );
}

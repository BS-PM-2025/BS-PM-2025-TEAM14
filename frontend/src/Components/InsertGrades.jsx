import { useState, useEffect } from "react";
import { jwtDecode } from 'jwt-decode';
import "../CSS/InsertGrades.css";

export default function InsertGrades() {
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [selectedCourseCode, setSelectedCourseCode] = useState("");
    const [students, setStudents] = useState([]);
    const [grades, setGrades] = useState({});
    const [loading, setLoading] = useState(false);
    const [professorEmail, setProfessorEmail] = useState(null);
    const [gradeComponent, setGradeComponent] = useState("");

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (token) {
            try {
                const decoded = jwtDecode(token);
                setProfessorEmail(decoded.user_email);
            } catch (err) {
                console.error("Token decoding error:", err);
            }
        }
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("access_token");
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    useEffect(() => {
        if (professorEmail) {
            fetchCourses();
        }
    }, [professorEmail]);

    const fetchCourses = async () => {
        try {
            const response = await fetch(`http://localhost:8000/professor/courses/${professorEmail}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders()
                }
            });
            if (!response.ok) throw new Error("Failed to fetch courses");
            const data = await response.json();
            const mappedCourses = data.courses.map((course) => ({
                id: course.id,
                name: course.name,
                description: course.description,
                code: course.code,
                credits: course.credits,
                professor_id: course.professor_id
            }));
            setCourses(mappedCourses);
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const fetchStudents = async (courseId) => {
        setLoading(true);
        try {
            const response = await fetch(`http://localhost:8000/course/${courseId}/students`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders()
                }
            });
            if (!response.ok) throw new Error("Failed to fetch students");
            const data = await response.json();
            setStudents(data);
            setGrades(data.reduce((acc, student) => ({ ...acc, [student.email]: "" }), {}));
        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGradeChange = (studentId, grade) => {
        setGrades({ ...grades, [studentId]: grade });
    };

    const submitGrades = async () => {
        if (!gradeComponent) {
            alert("Please enter a grade component");
            return;
        }

        try {
            const response = await fetch(`http://localhost:8000/courses/${selectedCourseCode}/submit_grades`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    courseId: selectedCourseCode,
                    gradeComponent,
                    grades
                })
            });

            if (!response.ok) throw new Error("Failed to submit grades");
            alert("Grades submitted successfully");
            setGradeComponent("");
            setGrades({});
        } catch (error) {
            console.error("Error submitting grades:", error);
            alert("Error submitting grades");
        }
    };


    return (
        <div className="insert-grades-container">
            <h2 className="insert-grades-title">Enter Test Grades</h2>

            <select
                className="insert-grades-select"
                value={selectedCourse}
                onChange={(e) => {
                    const course_id = e.target.value.slice(-6, -1);
                    setSelectedCourseCode(course_id);
                    setSelectedCourse(e.target.value);
                    fetchStudents(course_id);
                }}
            >
                <option value="">Select a course</option>
                {courses.length > 0 ? (
                    courses.map((course) => (
                        <option key={course.id} value={course.code}>
                            {course.name} ({course.id})
                        </option>
                    ))
                ) : (
                    <option>No courses available</option>
                )}
            </select>

            <input
                type="text"
                className="insert-grades-input"
                placeholder="Enter grade component (e.g., Midterm, Final, Project)"
                value={gradeComponent}
                onChange={(e) => setGradeComponent(e.target.value)}
            />

            {loading ? (
                <p>Loading students...</p>
            ) : (
                <table className="insert-grades-table">
                    <thead>
                    <tr>
                        <th>Student Email</th>
                        <th>Name</th>
                        <th>Grade</th>
                    </tr>
                    </thead>
                    <tbody>
                    {students.map((student) => (
                        <tr key={student.email}>
                            <td>{student.email}</td>
                            <td>{student.name}</td>
                            <td>
                                <input
                                    type="number"
                                    className="grade-input"
                                    value={grades[student.email] || "0"}
                                    onChange={(e) => {
                                        const newGrade = e.target.value;
                                        if (!isNaN(newGrade) && newGrade >= 0) {
                                            handleGradeChange(student.email, Math.min(newGrade, 100));
                                        }
                                    }}
                                />
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}

            <button onClick={submitGrades} className="submit-button">
                Submit Grades
            </button>
        </div>
    );
}

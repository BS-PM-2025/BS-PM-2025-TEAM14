import { useState, useEffect } from "react";

export default function InsertGrades({Professor_Id}) {
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState("");
    const [students, setStudents] = useState([]);
    const [grades, setGrades] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const response = await fetch(`http://localhost:8000/professor/courses/${Professor_Id}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" }
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
            const response = await fetch(`http://localhost:8000/course/${courseId}/students`);
            if (!response.ok) throw new Error("Failed to fetch students");
            const data = await response.json();
            setStudents(data);
            setGrades(data.reduce((acc, student) => ({ ...acc, [student.id]: "" }), {}));
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
        try {
            const response = await fetch("http://localhost:8000/course/submit-grades", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courseId: selectedCourse, grades })
            });
            if (!response.ok) throw new Error("Failed to submit grades");
            alert("Grades submitted successfully");
        } catch (error) {
            console.error("Error submitting grades:", error);
            alert("Error submitting grades");
        }
    };


    return (
        <div className="p-6 border rounded-lg shadow-lg bg-white max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Enter Test Grades</h2>
            <select
                className="block w-full p-2 border rounded mb-4"
                value={selectedCourse}
                onChange={(e) => {
                    setSelectedCourse(e.target.value);
                    fetchStudents(e.target.value);
                }}>
                <option value="">Select a course</option>
                {courses.length > 0 ? (
                    courses.map((course) => (
                        <option key={course.id} value={course.code}>
                            {course.name} ({course.code})
                        </option>
                    ))
                ) : (
                    <option>No courses available</option>
                )}
            </select>
            {loading ? <p>Loading students...</p> : (
                <table className="w-full border-collapse shadow-md rounded-lg overflow-hidden">
                    <thead>
                    <tr className="bg-blue-500 text-white">
                        <th className="px-6 py-3 text-left">Student ID</th>
                        <th className="px-6 py-3 text-left">Name</th>
                        <th className="px-6 py-3 text-left">Grade</th>
                    </tr>
                    </thead>
                    <tbody>
                    {students.map(student => (
                        <tr key={student.id} className="border-b hover:bg-gray-100 transition">
                            <td className="px-6 py-3">{student.id}</td>
                            <td className="px-6 py-3 font-medium text-gray-700">{student.name}</td>
                            <td className="px-6 py-3">
                                <input
                                    type="number"
                                    className="border p-1 w-20 text-center"
                                    value={grades[student.id] || ""}
                                    onChange={(e) => handleGradeChange(student.id, e.target.value)}
                                />
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}
            <button
                onClick={submitGrades}
                className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg mt-4 block mx-auto hover:bg-green-700 transition duration-300">
                Submit Grades
            </button>
        </div>
    );
}

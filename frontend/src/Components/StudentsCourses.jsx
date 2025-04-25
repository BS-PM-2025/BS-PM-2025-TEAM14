import React, { useState, useEffect } from "react";
import axios from "axios";

const StudentsCourses = ({ studentEmail, onCourseSelect }) => {
  const [courses, setCourses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8000/student/${studentEmail}/courses`
        );
        console.log(response.data.courses);
        setCourses(response.data.courses);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch courses");
        setLoading(false);
      }
    };

    fetchCourses();
  }, [studentEmail]);

  const handleCourseSelect = (courseName, course) => {
    setSelectedCourse(course.id);
    if (onCourseSelect) {
      onCourseSelect({
        courseName,
        courseId: course.id,
        professors: [course.professor_email],
      });
    }
  };


  if (loading) return <div>Loading courses...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="students-courses">
      <h3>Your Courses</h3>
      <div className="courses-grid">
        {courses.map((course, index) => (
            <div
                key={index}
                className={`course-card ${
                    selectedCourse === course.id ? "selected" : ""
                }`}
                onClick={() => handleCourseSelect(course.name, course)}
            >
              <div className="course-code">{course.id}</div>
              <div className="course-name">{course.name}</div>
              <div className="professors">
                <span>Professor:</span>
                <ul>
                  <li>{course.professor_email}</li>
                </ul>
              </div>
            </div>
        ))}

      </div>
    </div>
  );
};

export default StudentsCourses;

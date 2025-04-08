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
        setCourses(response.data.courses);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch courses");
        setLoading(false);
      }
    };

    fetchCourses();
  }, [studentEmail]);

  const handleCourseSelect = (courseName, courseData) => {
    setSelectedCourse(courseName);
    if (onCourseSelect) {
      onCourseSelect({
        courseName,
        courseId: courseData[0].course_id,
        professors: [
          ...new Set(courseData.map((grade) => grade.professor_email)),
        ], // Get unique professors
      });
    }
  };

  if (loading) return <div>Loading courses...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="students-courses">
      <h3>Your Courses</h3>
      <div className="courses-grid">
        {Object.entries(courses).map(([courseName, courseData]) => (
          <div
            key={courseName}
            className={`course-card ${
              selectedCourse === courseName ? "selected" : ""
            }`}
            onClick={() => handleCourseSelect(courseName, courseData)}
          >
            <div className="course-code">{courseData[0].course_id}</div>
            <div className="course-name">{courseName}</div>
            <div className="professors">
              <span>Professor:</span>
              <ul>
                {[
                  ...new Set(courseData.map((grade) => grade.professor_email)),
                ].map((professor, index) => (
                  <li key={index}>{professor}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudentsCourses;

import React, { useState, useEffect } from "react";
import axios from "axios";

const GradeAppealSelection = ({
  studentEmail,
  onSelectionChange = () => {},
}) => {
  const [courses, setCourses] = useState({});
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        console.log("Sending a request with email: ", studentEmail);
        const response = await axios.get(
          `http://localhost:8000/student/${studentEmail}/courses`
        );
        setCourses(response.data.courses);
        setLoading(false);
        console.log(response.data.courses);
      } catch (err) {
        setError("Failed to fetch courses");
        setLoading(false);
      }
    };

    fetchCourses();
  }, [studentEmail]);

  const handleCourseChange = (e) => {
    const course = e.target.value;
    setSelectedCourse(course);
    setSelectedGrade(null);
    onSelectionChange({
      course,
      grade: null,
    });
  };

  const handleGradeSelect = (grade) => {
    setSelectedGrade(grade);
    onSelectionChange({
      course: selectedCourse,
      grade,
    });
  };

  if (loading) return <div>Loading courses...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="grade-appeal-selection">
      <div className="form-group">
        <label htmlFor="course">Select Course*</label>
        <select
          id="course"
          value={selectedCourse}
          onChange={handleCourseChange}
          required
        >
          <option value="">Select a course</option>
          {Object.keys(courses).map((courseName) => (
            <option key={courseName} value={courseName}>
              {courseName}
            </option>
          ))}
        </select>
      </div>

      {selectedCourse && courses[selectedCourse] && (
        <div className="form-group">
          <label>Select Grade to Appeal*</label>
          <div className="grade-options">
            {courses[selectedCourse].map((gradeInfo, index) => (
              <div
                key={index}
                className={`grade-option ${
                  selectedGrade === gradeInfo ? "selected" : ""
                }`}
                onClick={() => handleGradeSelect(gradeInfo)}
              >
                <div className="grade-component">
                  {gradeInfo.grade_component}
                </div>
                <div className="grade-value">Grade: {gradeInfo.grade}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GradeAppealSelection;

import React, { useState, useEffect } from "react";
import axios from "axios";

const GradeAppealSelection = ({
                                studentEmail,
                                onSelectionChange = () => {},
                              }) => {
  const [courses, setCourses] = useState([]);
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
        console.log(response.data);
      } catch (err) {
        setError("Failed to fetch courses");
        setLoading(false);
      }
    };

    fetchCourses();
  }, [studentEmail]);

  const handleCourseChange = (e) => {
    const courseId = e.target.value;
    console.log("course", courseId);
    setSelectedCourse(courseId);
    setSelectedGrade(null);
    onSelectionChange({
      course: courseId,
      grade: { grade_component: null, grade: null },
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
            {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
            ))}
          </select>
        </div>

        {selectedCourse && (
            <div className="form-group">
              {courses
                  .filter((course) => course.id === selectedCourse)
                  .some((course) => course.grades.length > 0) && (
                  <label>Select Grade to Appeal*</label>
              )}
              <div className="grade-options">
                {courses
                    .filter((course) => course.id === selectedCourse)
                    .map((course) =>
                        course.grades.map((gradeInfo, index) => (
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
                        ))
                    )}
              </div>
            </div>
        )}
      </div>
  );
};

export default GradeAppealSelection;

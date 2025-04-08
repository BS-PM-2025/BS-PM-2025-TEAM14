import React, { useState } from "react";
import axios from "axios";
import "../CSS/SubmitRequestForm.css";
import { useNavigate } from "react-router-dom";
import GradeAppealSelection from "./GradeAppealSelection";
import StudentsCourses from "./StudentsCourses";

const RequestForm = ({ studentEmail }) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [gradeInfo, setGradeInfo] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);

  const requestTypes = [
    "General Request",
    "Grade Appeal Request",
    "Military Service Request",
    "Schedule Change Request",
    "Exam Accommodations Request",
  ];

  const handleGradeSelection = (selection) => {
    setSelectedGrade(selection);
    // If we have both course and grade selected, update the grade info
    if (selection.course && selection.grade) {
      setGradeInfo(
        `Grade Information:\nCourse: ${selection.course}\nComponent: ${selection.grade.grade_component}\nCurrent Grade: ${selection.grade.grade}\n\n`
      );
    }
  };

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    setDetails(
      `Schedule Change Request for:\nCourse: ${course.courseName} (${
        course.courseId
      })\nProfessor: ${course.professors.join(", ")}\n\n`
    );
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };

  const handleRemoveFile = (indexToRemove) => {
    setFiles((prevFiles) =>
      prevFiles.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!title || !details) {
      setError("Title or details are missing.");
      return;
    }

    // Additional validation for grade appeal
    if (title === "Grade Appeal Request" && !selectedGrade?.grade) {
      setError("Please select a grade to appeal.");
      return;
    }

    // Additional validation for schedule change
    if (title === "Schedule Change Request" && !selectedCourse) {
      setError("Please select a course for schedule change.");
      return;
    }

    // Additional validation for military service and exam accommodation
    if (
      (title === "Military Service Request" ||
        title === "Exam Accommodations Request") &&
      files.length === 0
    ) {
      setError("File attachment is required for this type of request.");
      return;
    }

    try {
      // First, upload all files if any exist
      const uploadedFiles = [];
      if (files.length > 0) {
        // Determine the file type based on the request title
        let fileType = "general";
        switch (title) {
          case "Grade Appeal Request":
            fileType = "gradeAppeal";
            break;
          case "Military Service Request":
            fileType = "militaryService";
            break;
          case "Schedule Change Request":
            fileType = "scheduleChange";
            break;
          case "Exam Accommodations Request":
            fileType = "examAccommodation";
            break;
          default:
            fileType = "general";
        }

        for (const file of files) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("fileType", fileType);

          // Upload each file
          await axios.post(
            `http://localhost:8000/uploadfile/${studentEmail}`,
            formData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );
          uploadedFiles.push(file.name);
        }
      }

      // Prepare request data
      const requestData = {
        title,
        student_email: studentEmail,
        details:
          title === "Grade Appeal Request"
            ? `${gradeInfo}Appeal Details:\n${details}`
            : details,
        files: uploadedFiles.length > 0 ? uploadedFiles : [],
      };

      // Add grade appeal specific data if it's a grade appeal
      if (title === "Grade Appeal Request" && selectedGrade) {
        requestData.grade_appeal = {
          course_id: selectedGrade.grade.course_id,
          grade_component: selectedGrade.grade.grade_component,
          current_grade: selectedGrade.grade.grade,
        };
      }

      // Add schedule change specific data if it's a schedule change
      if (title === "Schedule Change Request" && selectedCourse) {
        requestData.schedule_change = {
          course_id: selectedCourse.courseId,
          professors: selectedCourse.professors,
        };
      }

      // Then create the request with file information
      const response = await axios.post(
        "http://localhost:8000/submit_request/create",
        requestData
      );

      setMessage("Request created successfully");
      setTimeout(() => {
        navigate("/"); // Redirect to home page
      }, 1000);
      setTitle("");
      setDetails("");
      setFiles([]);
      setSelectedGrade(null);
      setGradeInfo("");
      setSelectedCourse(null);
    } catch (error) {
      setError(
        error.response?.data?.detail ||
          "An error occurred while creating the request"
      );
    }
  };

  return (
    <div className="request-form-container">
      <h2>Submit A New Request</h2>
      <form onSubmit={handleSubmit} className="request-form">
        <div className="form-group">
          <label htmlFor="title">Request Type*</label>
          <select
            id="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSelectedGrade(null); // Reset grade selection when request type changes
              setGradeInfo(""); // Reset grade info
              setSelectedCourse(null); // Reset course selection
              if (
                e.target.value !== "Grade Appeal Request" &&
                e.target.value !== "Schedule Change Request"
              ) {
                setDetails(""); // Reset details if not grade appeal or schedule change
              }
            }}
            required
          >
            <option value="">Select a request type</option>
            {requestTypes.map((type, index) => (
              <option key={index} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {title === "Grade Appeal Request" && (
          <div className="form-group">
            <GradeAppealSelection
              studentEmail={studentEmail}
              onSelectionChange={handleGradeSelection}
            />
          </div>
        )}

        {title === "Schedule Change Request" && (
          <div className="form-group">
            <StudentsCourses
              studentEmail={studentEmail}
              onCourseSelect={handleCourseSelect}
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="details">Details*</label>
          {title === "Grade Appeal Request" && gradeInfo && (
            <div className="grade-info">
              <pre>{gradeInfo}</pre>
            </div>
          )}
          <textarea
            id="details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            required
            placeholder={
              title === "Grade Appeal Request"
                ? "Please explain why you are appealing this grade..."
                : title === "Schedule Change Request"
                ? "Please explain why you need to change your schedule..."
                : "Enter request details..."
            }
          />
        </div>

        <div className="form-group">
          <label htmlFor="files">Attach Files (Optional)</label>
          <input type="file" id="files" multiple onChange={handleFileChange} />
          {files.length > 0 && (
            <div className="selected-files">
              <h4>Selected Files:</h4>
              <ul>
                {files.map((file, index) => (
                  <li key={index}>
                    {file.name}
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={() => handleRemoveFile(index)}
                    >
                      X
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        <button type="submit" className="submit-button">
          Submit Request
        </button>
      </form>
    </div>
  );
};

export default RequestForm;

import React, { useState, useEffect } from "react";
import axios from "axios";
import "../CSS/SubmitRequestForm.css";
import { useNavigate } from "react-router-dom";
import GradeAppealSelection from "./GradeAppealSelection";
import StudentsCourses from "./StudentsCourses";
import DynamicRequestForm from "./RequestTemplates/DynamicRequestForm";
import { getToken, getUserFromToken } from "../utils/auth";

const RequestForm = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [gradeInfo, setGradeInfo] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [user, setUser] = useState(null);
  const [professorUnavailable, setProfessorUnavailable] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [requestTypes, setRequestTypes] = useState([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [dynamicFormData, setDynamicFormData] = useState({});

  useEffect(() => {
    const checkLoginStatus = () => {
      const token = getToken();
      if (token) {
        const userData = getUserFromToken(token);
        console.log("User data from token:", userData);

        // Check if user is a student
        if (userData.role !== "student") {
          console.log("Non-student user detected, redirecting to home");
          navigate("/home");
          return;
        }

        setUser(userData);
      } else {
        setUser(null);
        navigate("/login");
      }
    };

    checkLoginStatus();
    window.addEventListener("storage", checkLoginStatus);
    window.addEventListener("focus", checkLoginStatus);

    return () => {
      window.removeEventListener("storage", checkLoginStatus);
      window.removeEventListener("focus", checkLoginStatus);
    };
  }, [navigate]);

  useEffect(() => {
    fetchRequestTypes();
  }, []);

  const fetchRequestTypes = async () => {
    try {
      setLoadingTypes(true);
      const response = await axios.get("http://localhost:8000/api/request_template_names");
      setRequestTypes(response.data);
    } catch (error) {
      console.error("Error fetching request types:", error);
      // Fallback to hardcoded types if API fails
      setRequestTypes([
        "General Request",
        "Grade Appeal Request",
        "Military Service Request",
        "Schedule Change Request",
        "Exam Accommodations Request",
      ]);
    } finally {
      setLoadingTypes(false);
    }
  };

  const checkProfessorAvailability = async (courseId) => {
    try {
      // Get the course to find the professor
      const courseResponse = await axios.get(
        `http://localhost:8000/student_courses/professor/${user.user_email}/${courseId}`
      );
      const professorEmail = courseResponse.data.professor_email;

      if (!professorEmail) {
        return;
      }

      // Get today's date and next month's date
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      // Fetch unavailability periods for the next month
      const unavailabilityResponse = await axios.get(
        `http://localhost:8000/professor/unavailability/${professorEmail}`
      );

      // Filter periods that are within the next month
      const relevantPeriods = unavailabilityResponse.data.periods.filter(
        (period) => {
          const periodStart = new Date(period.start_date);
          const periodEnd = new Date(period.end_date);
          return (
            (periodStart >= today || periodEnd >= today) &&
            periodStart <= nextMonth
          );
        }
      );

      if (relevantPeriods.length > 0) {
        setProfessorUnavailable(relevantPeriods);
      } else {
        setProfessorUnavailable(null);
      }
    } catch (error) {
      console.error("Error checking professor availability:", error);
    }
  };

  const handleGradeSelection = (selection) => {
    setSelectedGrade(selection);
    // If we have both course and grade selected, update the grade info
    if (
      selection.course &&
      selection.grade &&
      selection.grade.grade_component &&
      selection.grade.grade
    ) {
      setGradeInfo(
        `Grade Information:\nCourse: ${selection.course}\nComponent: ${selection.grade.grade_component}\nCurrent Grade: ${selection.grade.grade}\n\n`
      );
      // Check professor availability when a course is selected
      checkProfessorAvailability(selection.course);
    } else {
      setGradeInfo(`Grade Information:\n Course: ${selection.course}`);
      if (selection.course) {
        checkProfessorAvailability(selection.course);
      }
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

  const handleDynamicFormDataChange = (formData) => {
    setDynamicFormData(formData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setFieldErrors({});

    const errors = {};
    if (!title) errors.title = "Please select a request type.";
    if (!details) errors.details = "Please enter request details.";
    if (title === "Schedule Change Request" && !selectedCourse)
      errors.selectedCourse = "Please select a course for schedule change.";
    if (
      (title === "Military Service Request" ||
        title === "Exam Accommodations Request") &&
      files.length === 0
    )
      errors.files = "File attachment is required for this type of request.";

    // Validate dynamic form fields
    if (dynamicFormData && Object.keys(dynamicFormData).length > 0) {
      // Here we would validate dynamic form fields based on their rules
      // For now, we'll check if required fields are filled
      for (const [fieldName, value] of Object.entries(dynamicFormData)) {
        if (Array.isArray(value) && value.length === 0) {
          // This might be an empty file array or other empty required field
          // We'll let the backend handle detailed validation
          continue;
        }
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          // This will be caught by backend validation
          continue;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      // Collect all files (main form + dynamic form files)
      const allFiles = [...files];
      
      // Add files from dynamic form
      if (dynamicFormData) {
        Object.values(dynamicFormData).forEach(value => {
          if (Array.isArray(value) && value.length > 0 && value[0] instanceof File) {
            allFiles.push(...value);
          }
        });
      }

      // First, upload all files if any exist
      const uploadedFiles = [];
      if (allFiles.length > 0) {
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

        for (const file of allFiles) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("fileType", fileType);

          // Upload each file
          await axios.post(
            `http://localhost:8000/uploadfile/${user.user_email}`,
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

      // Prepare base request data
      let finalDetails = details;
      
      // Add dynamic form data to details if available
      if (dynamicFormData && Object.keys(dynamicFormData).length > 0) {
        const dynamicFieldsText = Object.entries(dynamicFormData)
          .filter(([_, value]) => value && !Array.isArray(value)) // Exclude file fields
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
        
        if (dynamicFieldsText) {
          finalDetails = `${details}\n\nAdditional Information:\n${dynamicFieldsText}`;
        }
      }

      // Prepare request data
      const requestData = {
        title,
        student_email: user.user_email,
        details:
          title === "Grade Appeal Request"
            ? `${gradeInfo}Appeal Details:\n${finalDetails}`
            : finalDetails,
        files: uploadedFiles.length > 0 ? uploadedFiles : [],
        // Add dynamic form data as custom fields
        custom_fields: dynamicFormData || {}
      };

      // Add grade appeal specific data if it's a grade appeal
      if (title === "Grade Appeal Request" && selectedGrade) {
        console.log(selectedGrade);
        requestData.grade_appeal = {
          course_id: selectedGrade.course,
          grade_component: selectedGrade.grade.grade_component
            ? selectedGrade.grade.grade_component
            : "no info",
          current_grade: selectedGrade.grade.grade
            ? selectedGrade.grade.grade
            : "no info",
        };
      }
      console.log("request data", requestData);

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
      setDynamicFormData({});
    } catch (error) {
      console.error("Request error:", error);
      console.error("Response:", error.response);
      setError(
        error.response?.data?.detail ||
          "An error occurred while creating the request"
      );
    }
  };

  return (
    <div className="request-form-container">
      <div className="form-header-image">
        <div className="form-header-overlay">
          <h2 className="form-header-title">Submit a New Request</h2>
        </div>
        <img
          src="https://i.pinimg.com/736x/93/64/69/936469689d5c78c32e58c28875b89111.jpg"
          alt="Form header background"
          className="form-header-bg"
        />
      </div>
      <form onSubmit={handleSubmit} className="request-form">
        <div className="form-group">
          <label htmlFor="title">Request Type*</label>
          <select
            id="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSelectedGrade(null);
              setGradeInfo("");
              setSelectedCourse(null);
              setDynamicFormData({});
              if (
                e.target.value !== "Grade Appeal Request" &&
                e.target.value !== "Schedule Change Request"
              ) {
                setDetails("");
              }
            }}
            disabled={loadingTypes}
          >
            <option value="">
              {loadingTypes ? "Loading request types..." : "Select a request type"}
            </option>
            {requestTypes.map((type, index) => (
              <option key={index} value={type}>
                {type}
              </option>
            ))}
          </select>
          {fieldErrors.title && (
            <div className="error-message">{fieldErrors.title}</div>
          )}
        </div>

        {title === "Grade Appeal Request" && (
          <div className="form-group">
            <GradeAppealSelection
              studentEmail={user.user_email}
              onSelectionChange={handleGradeSelection}
            />
          </div>
        )}

        {title === "Schedule Change Request" && (
          <div className="form-group">
            <StudentsCourses
              studentEmail={user.user_email}
              onCourseSelect={handleCourseSelect}
            />
          </div>
        )}

        {/* Dynamic template fields */}
        {title && (
          <DynamicRequestForm
            selectedTemplate={title}
            onFormDataChange={handleDynamicFormDataChange}
            errors={fieldErrors}
          />
        )}

        <div className="form-group">
          <label htmlFor="details">Request Details*</label>
          {title === "Grade Appeal Request" && gradeInfo && (
            <div className="grade-info">
              <pre>{gradeInfo}</pre>
            </div>
          )}
          <textarea
            id="details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={
              title === "Grade Appeal Request"
                ? "Please explain why you are appealing this grade..."
                : title === "Schedule Change Request"
                ? "Please explain why you need to change your schedule..."
                : "Enter request details..."
            }
          />
          {fieldErrors.details && (
            <div className="error-message">{fieldErrors.details}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="files">
            Attach Supporting Documents (
            {title === "Military Service Request" ||
            title === "Exam Accommodations Request"
              ? "Required"
              : "Optional"}
            )
          </label>
          <input
            type="file"
            id="files"
            multiple
            onChange={handleFileChange}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            style={{ display: "none" }}
            ref={(input) => (window.fileInputRef = input)}
          />
          <button
            type="button"
            className="custom-file-btn"
            onClick={() => window.fileInputRef && window.fileInputRef.click()}
          >
            Choose Files
          </button>
          {files.length > 0 && (
            <div className="selected-files">
              <h4>Selected Documents:</h4>
              <ul>
                {files.map((file, index) => (
                  <li key={index}>
                    {file.name}
                    <button
                      type="button"
                      className="remove-file-btn"
                      onClick={() => handleRemoveFile(index)}
                      aria-label="Remove file"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {fieldErrors.files && (
            <div className="error-message">{fieldErrors.files}</div>
          )}
        </div>

        {title === "Grade Appeal Request" && professorUnavailable && (
          <div className="notice-card">
            <span className="notice-icon" role="img" aria-label="calendar">
              📅
            </span>
            <div className="notice-card-content">
              <div className="notice-card-title">
                Professor Unavailability Notice
              </div>
              <div className="notice-card-desc">
                Your professor will be unavailable during the following periods:
              </div>
              <ul className="notice-card-list">
                {professorUnavailable.map((period, index) => (
                  <li key={index}>
                    <span className="list-icon" role="img" aria-label="date">
                      ⏰
                    </span>
                    {new Date(period.start_date).toLocaleDateString()} -{" "}
                    {new Date(period.end_date).toLocaleDateString()}
                    {period.reason && ` (${period.reason})`}
                  </li>
                ))}
              </ul>
              <div className="notice-card-footer">
                Please consider this information when submitting your grade
                appeal request.
              </div>
            </div>
          </div>
        )}

        {fieldErrors.selectedCourse && (
          <div className="error-message">{fieldErrors.selectedCourse}</div>
        )}

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

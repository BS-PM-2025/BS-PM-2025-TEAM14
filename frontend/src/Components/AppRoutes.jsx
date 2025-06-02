import React from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { UploadFile } from "./UploadFile";
import ReloadFiles from "./ReloadFiles";
import UsersList from "./UsersList";
import InsertGrades from "./InsertGrades";
import SubmitRequestForm from "./SubmitRequestForm";
import NavigationBar from "./NavigationBar";
import Login from "./Login";
import Home from "./Home";
import StudentRequests from "./StudentRequestsPanel";
import { useUser } from "./UserContext";
import AssignProfessorToCourse from "./AssignProfessorToCourse.tsx";
import AssignStudentToCourse from "./AssignStudentToCourse.tsx";
import ProfessorUnavailability from "./ProfessorUnavailability";
import TransferRequests from "./TransferRequests";
import ProfessorRequestsPanel from "./ProfessorRequestsPanel";
import AdminRequestRoute from "./AdminRequestRoute";
import AdminTemplateManager from "./RequestTemplates/AdminTemplateManager";

function AppRoutes({ darkMode, setDarkMode }) {
  const { user } = useUser();

  return (
    <Router>
      <NavigationBar darkMode={darkMode} setDarkMode={setDarkMode} />
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home />} />
        <Route path="/submit_request" element={<SubmitRequestForm />} />
        <Route
          path="/Requests"
          element={<StudentRequests emailUser={user?.user_email} />}
        />
        <Route
          path="/Student's Requests"
          element={<ProfessorRequestsPanel />}
        />
        <Route path="/login" element={<Login />} />
        <Route
          path="/upload"
          element={<UploadFile userEmail={user?.user_email} />}
        />
        <Route
          path="/reload"
          element={<ReloadFiles userEmail={user?.user_email} />}
        />
        <Route path="/users" element={<UsersList />} />
        <Route
          path="/grades"
          element={<InsertGrades Professor_Id={user?.user_email} />}
        />
        <Route
          path="/assignProfessorToCourse"
          element={<AssignProfessorToCourse />}
        />
        <Route
          path="/AssignStudentsToCourse"
          element={<AssignStudentToCourse />}
        />
        <Route
          path="/manage-availability"
          element={
            <ProfessorUnavailability professorEmail={user?.user_email} />
          }
        />
        <Route path="/transfer-requests" element={<TransferRequests />} />
        <Route path="/admin/request-routing" element={<AdminRequestRoute />} />
        <Route path="/admin/request-templates" element={<AdminTemplateManager />} />
      </Routes>
    </Router>
  );
}

export default AppRoutes;

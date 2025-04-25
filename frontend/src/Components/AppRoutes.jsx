import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { UploadFile } from "./UploadFile";
import ReloadFiles from "./ReloadFiles";
import UsersList from "./UsersList";
import InsertGrades from "./InsertGrades";
import SubmitRequestForm from "./SubmitRequestForm";
import Navigation from "./Navigation";
import Login from "./Login";
import Home from "./Home";
import StudentRequests from "./StudentRequestsPanel";
import { useUser } from "./UserContext";
import AssignProfessorToCourse from "./AssignProfessorToCourse";
import AssignStudentToCourse from "./AssignStudentToCourse";

function AppRoutes() {
    const { user } = useUser(); // Now safe to use here

    return (
        <Router>
            <div className="App">
                <Navigation />
                <Routes>
                    {console.log("in the navigation, user:", user)}
                    <Route path="/" element={<Navigate to="/home" replace />} />
                    <Route path="/home" element={<Home />} />
                    <Route path="/submit_request" element={<SubmitRequestForm />} />
                    <Route path="/Requests" element={<StudentRequests emailUser={user?.user_email} />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/upload" element={<UploadFile userEmail={user?.user_email} />} />
                    <Route path="/reload" element={<ReloadFiles userEmail={user?.user_email} />} />
                    <Route path="/users" element={<UsersList />} />
                    <Route path="/grades" element={<InsertGrades Professor_Id={user?.user_email} />} />
                    <Route path="/assignProfessorToCourse" element={<AssignProfessorToCourse />} />
                    <Route path="/AssignStudentsToCourse" element={<AssignStudentToCourse />} />
                </Routes>
            </div>
        </Router>
    );
}

export default AppRoutes;

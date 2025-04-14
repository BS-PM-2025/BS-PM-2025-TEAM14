import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { fetchDatabases } from "./api";
import { UploadFile } from "./Components/UploadFile";
import ReloadFiles from "./Components/ReloadFiles";
import UsersList from "./Components/UsersList";
import SubmitGrades from "./Components/SubmitGrades";
import SubmitRequestForm from "./Components/SubmitRequestForm";
import Navigation from "./Components/Navigation";
import Login from "./Components/Login";
import Home from "./Components/Home";
import StudentRequests from "./Components/StudentRequestsPanel";


function App() {
  const [databases, setDatabases] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchDatabases().then((data) => setDatabases(data.databases));
  }, []);

  return (
    <Router>
      <div className="App">
        <Navigation />
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/home" replace />}
          />
          <Route path="/home" element={<Home />} />
          <Route
            path="/submit_request"
            element={<SubmitRequestForm />}
          />
          <Route path="/Requests" element={<StudentRequests emailUser="ariel@gmail.com" />} />

          <Route path="/login" element={<Login />} />
          <Route path="/upload" element={<UploadFile userEmail="ariel@gmail.com" />} />
          <Route path="/reload" element={<ReloadFiles userEmail="ariel@gmail.com" />} />
          <Route path="/users" element={<UsersList />} />
          <Route path="/grades" element={<SubmitGrades Professor_Id={1} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

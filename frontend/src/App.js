import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { fetchDatabases } from "./api";
import { UploadFile } from "./Components/UploadFile";
import ReloadFiles from "./Components/ReloadFiles";
import StudentRequestsPanel from "./Components/StudentRequestsPanel";
import CreateUser from "./Components/CreateUser";
import UsersList from "./Components/UsersList";
import UserDetails from "./Components/UserDetails";
import SubmitGrades from "./Components/SubmitGrades";
import SubmitRequestForm from "./Components/SubmitRequestForm";
import Navigation from "./Components/Navigation";

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
            element={
              <div>
                <h1>Welcome</h1>
                <ul>{/*databases.map(db => <li key={db}>{db}</li>)*/}</ul>
              </div>
            }
          />
          <Route
            path="/submit_request"
            element={<SubmitRequestForm studentEmail={"ariel@gmail.com"} />}
          />
          <Route path="/upload" element={<UploadFile userId="206676850" />} />
          <Route path="/reload" element={<ReloadFiles UserId="206676850" />} />
          <Route path="/users" element={<UsersList />} />
          <Route path="/grades" element={<SubmitGrades Professor_Id={1} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

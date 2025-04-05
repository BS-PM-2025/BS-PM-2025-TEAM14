import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { fetchDatabases } from "./api";
import {UploadFile} from "./Components/UploadFile"
import ReloadFiles from "./Components/ReloadFiles";
import StudentRequestsPanel from "./Components/StudentRequestsPanel";
import CreateUser from "./Components/CreateUser";
import UsersList from "./Components/UsersList";
import UserDetails from "./Components/UserDetails";
import Login from "./Components/Login";
import InsertGrades from "./Components/InsertGrades";
// example
// import page from './pages/page';
// to use -
// <a href="/page">Page</a>

function App() {
  const [databases, setDatabases] = useState([]);
  const [users, setUsers] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    fetchDatabases().then(data => setDatabases(data.databases));
  }, []);


    return (
        <Router>
            <Routes>
                {/* Public route for login */}
                <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
                <Route path="/create_user" element={<CreateUser />} />
                {/* Protected routes: if not authenticated, the user is redirected to /login */}

            </Routes>
        </Router>
    );
}


export default App;

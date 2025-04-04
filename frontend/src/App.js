import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { fetchDatabases } from "./api";
import {UploadFile} from "./Components/UploadFile"
import ReloadFiles from "./Components/ReloadFiles";
import StudentRequestsPanel from "./Components/StudentRequestsPanel";
import CreateUser from "./Components/CreateUser";
import UsersList from "./Components/UsersList";
import UserDetails from "./Components/UserDetails";
import InsertGrades from "./Components/InsertGrades";
// example
// import page from './pages/page';
// to use -
// <a href="/page">Page</a>

function App() {
  const [databases, setDatabases] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchDatabases().then(data => setDatabases(data.databases));
  }, []);

  return (
      <div>
        <h1>Welcome</h1>
        <ul>
          {/*{databases.map(db => <li key={db}>{db}</li>)}*/}
          {/*  <UploadFile userId="206676850" />*/}
            {/*<ReloadFiles UserId="206676850" />*/}
            {/*<UsersList />*/}
            <InsertGrades Professor_Id={1}/>
        </ul>
      </div>
  );
}

export default App;

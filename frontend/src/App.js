import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { fetchDatabases } from "./api";
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
        <h1>Databases</h1>
        <ul>
          {databases.map(db => <li key={db}>{db}</li>)}
        </ul>
      </div>
  );
}

export default App;

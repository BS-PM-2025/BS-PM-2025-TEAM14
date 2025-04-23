import React from "react";
import { Link } from "react-router-dom";
import "../CSS/Navigation.css";
import {useUser} from "./UserContext";

const Navigation = () => {
  const { user, setUserData } = useUser();
  return (
    <nav className="navigation">
      <ul>
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/submit_request">Submit A Request</Link>
        </li>
        <li>
          <Link to="/Requests">Requests</Link>
        </li>
        <li>
          <Link to="/upload">Upload Files</Link>
        </li>
        <li>
          <Link to="/reload">Reload Files</Link>
        </li>
        {user?.role === "professor" && <li>
          <Link to="/users">Users</Link>
        </li>}
        <li>
          <Link to="/grades">Grades</Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navigation;

import React from "react";
import { Link } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  IconButton,
  Tooltip,
  useTheme,
} from "@mui/material";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import { useUser } from "./UserContext";
import NotificationBell from "./NotificationBell";
import Logout from "./Logout"
import "../CSS/Navigation.css"

const Navigation = ({ darkMode, setDarkMode, onLogoutClick }) => {
    const { user } = useUser();
  const theme = useTheme(); // זה מחזיר את כל האובייקט של ה-theme

  const navItem = (to, label) => (
    <Button
      key={to}
      component={Link}
      to={to}
      aria-label={label}
      sx={{
          color: theme.palette.mode === "dark" ? "#fff" : "#fff",
          textTransform: "none",
          fontSize: 16,
          fontWeight: "bold",
      }}
    >
      {label}
    </Button>
  );

  return (
    <AppBar
      position="static"
      color="primary"
      sx={{
        mb: 3,
        backgroundColor: theme.palette.mode === "dark" ? "#333" : "#1976d2",
      }}
    >
      <Toolbar>
        <Box sx={{ flexGrow: 1, display: "flex", gap: 2 }}>
          {navItem("/", "Home")}

          {user?.role === "student" && (
            <>
              {navItem("/submit_request", "Submit A New Request")}
              {navItem("/Requests", "Requests")}
            </>
          )}

          {user?.role === "professor" && (
            <>
              {navItem("/Student's Requests", "Student's Requests")}
              {navItem("/grades", "Grades")}
              {navItem("/manage-availability", "Manage Availability")}
            </>
          )}

          {user?.role === "secretary" && (
            <>
              {navItem("/assignProfessorToCourse", "Assign Professors")}
              {navItem("/AssignStudentsToCourse", "Assign Students")}
            </>
          )}

          {(user?.role === "secretary" || user?.role === "admin") && (
            <>{navItem("/transfer-requests", "Transfer Requests")}</>
          )}

          {user?.role === "secretary" && (
            <>{navItem("/Student's Requests", "Student's Requests")}</>
          )}

          {user?.role === "admin" && (
            <>
              {navItem("/admin/request-routing", "Request Routing")}
              {navItem("/users", "Manage Users")}
            </>
          )}
        </Box>

          {user && (
              <Logout />
          )}

        <NotificationBell />

        <Tooltip
            title={theme.palette.mode === "dark" ? "Bright Mode" : "Dark Mode"}
        >
          <IconButton
            sx={{ color: "white" }}
            onClick={() => setDarkMode(!darkMode)}
            aria-label={
              theme.palette.mode === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
          >
            {theme.palette.mode === "dark" ? <Brightness4 /> : <Brightness7 />}
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;

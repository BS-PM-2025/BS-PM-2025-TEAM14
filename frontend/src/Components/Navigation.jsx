import React from "react";
import { Link } from "react-router-dom";
import { AppBar, Toolbar, Button, Box, IconButton, Tooltip, useTheme } from "@mui/material";
import { Brightness4, Brightness7 } from "@mui/icons-material";
import { useUser } from "./UserContext";

const Navigation = ({ darkMode, setDarkMode }) => {
    const { user } = useUser();
    const theme = useTheme();  // זה מחזיר את כל האובייקט של ה-theme

    const navItem = (to, label) => (
        <Button
            key={to}
            component={Link}
            to={to}
            sx={{
                color: theme.palette.mode === "dark" ? "#fff" : "#000",
                textTransform: "none",
                fontWeight: 500
            }}
        >
            {label}
        </Button>
    );

    return (
        <AppBar position="static" color="primary" sx={{ mb: 3, backgroundColor: theme.palette.mode === "dark" ? "#333" : "#1976d2" }}>
            <Toolbar>
                <Box sx={{ flexGrow: 1, display: "flex", gap: 2 }}>
                    {navItem("/", "Home")}

                    {user?.role === "student" && (
                        <>
                            {navItem("/submit_request", "Submit Request")}
                            {navItem("/Requests", "Requests")}
                            {navItem("/upload", "Upload Files")}
                            {navItem("/reload", "Reload Files")}
                        </>
                    )}

                    {user?.role === "professor" && (
                        <>
                            {navItem("/users", "Users")}
                            {navItem("/grades", "Grades")}
                        </>
                    )}

                    {user?.role === "admin" && (
                        <>
                            {navItem("/assignProfessorToCourse", "Assign Professors")}
                            {navItem("/AssignStudentsToCourse", "Assign Students")}
                        </>
                    )}
                </Box>

                <Tooltip title={theme.palette.mode === "dark" ? "למצב בהיר" : "למצב כהה"}>
                    <IconButton sx={{ color: "white" }} onClick={() => setDarkMode(!darkMode)}>
                        {theme.palette.mode === "dark" ? <Brightness4 /> : <Brightness7 />}
                    </IconButton>
                </Tooltip>
            </Toolbar>
        </AppBar>
    );
};

export default Navigation;

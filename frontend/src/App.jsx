import React, { useMemo, useState } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { UserProvider } from "./Components/UserContext";
import AppRoutes from "./Components/AppRoutes";

function App() {
    const [darkMode, setDarkMode] = useState(false);

    const theme = createTheme({
        palette: {
            mode: darkMode ? 'dark' : 'light',
            primary: {
                main: '#4a6cf7',
            },
            background: {
                default: darkMode ? '#0a1f44' : '#fff',
                paper: darkMode ? '#1c2d58' : '#fff',
            },
            text: {
                primary: darkMode ? '#ffffff' : '#000000',
            },
        },
    });

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <UserProvider>
                <div className={`App ${darkMode ? 'dark' : ''}`}>
                <AppRoutes darkMode={darkMode} setDarkMode={setDarkMode} />
                </div>
            </UserProvider>
        </ThemeProvider>
    );
}

export default App;

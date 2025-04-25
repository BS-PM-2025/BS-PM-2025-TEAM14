import React, { createContext, useContext, useState } from "react";

// יצירת ה-Context
const ThemeContext = createContext();

// קומפוננטה שמספקת את ה-Context לכלל היישום
export const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);

    const toggleDarkMode = (value) => {
        setIsDarkMode(value !== undefined ? value : !isDarkMode);
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Custom hook כדי להשתמש ב-ThemeContext
export const useTheme = () => {
    return useContext(ThemeContext);
};

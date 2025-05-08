import React, { createContext, useState, useContext, useEffect } from "react";

// Create the context
const UserContext = createContext();

// Create a provider component
export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Check if user is saved in localStorage or some other storage
        const savedUser = JSON.parse(localStorage.getItem("user"));
        if (savedUser) {
            setUser(savedUser);
        }
    }, []);

    const setUserData = (userData) => {
        setUser(userData);
        if (userData) {
            localStorage.setItem("user", JSON.stringify(userData)); // Save user data to localStorage
        } else {
            localStorage.removeItem("user"); // Remove user data if null
        }
    };

    return (
        <UserContext.Provider value={{ user, setUserData }}>
            {children}
        </UserContext.Provider>
    );
};

// Create a custom hook to use the user context
export const useUser = () => {
    return useContext(UserContext);
};

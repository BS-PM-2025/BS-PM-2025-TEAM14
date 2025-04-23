import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useUser } from './UserContext'; // Import the custom hook

const UserWelcome = ({ onLoginClick, itemVariants, onLogoutClick }) => {
    const navigate = useNavigate();
    const { user, setUserData } = useUser(); // Access user data and setUserData from context

    const getUserDisplayName = () => {
        if (!user) return '';
        if (user.username) return user.username;
        if (user.name) return user.name;
        if (user.user_email) return user.user_email.split('@')[0];
        return 'User';
    };

    useEffect(() => {
        console.log("User changed in UserWelcome:", user);
    }, [user]);

    const handleLogout = () => {
        console.log("Logout button clicked in the user welcome section");
        onLogoutClick(); // Calls the function passed from Home to handle logout
        // setUserData(null); // Clears the global user data
        // navigate('/'); // Redirects to the home page
    };

    return (
        <motion.div className="guest-welcome" variants={itemVariants}>
            {user ? (
                <div className="user-welcome">
                    <div className="user-avatar">
                        <div className="avatar-circle">
                            {getUserDisplayName() ? getUserDisplayName()[0].toUpperCase() : 'U'}
                        </div>
                    </div>
                    <div className="user-info">
                        <h2>Hello, {getUserDisplayName()}!</h2>
                        <p className="user-role">{user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}</p>
                    </div>
                    <button className="logout-button" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            ) : (
                <motion.div className="guest-welcome" variants={itemVariants}>
                    <h2>Hello, Guest!</h2>
                    <p>Please log in to access the Academic Management System and manage your academic journey.</p>
                    <motion.button
                        className="login-button"
                        onClick={onLoginClick} // Open the login modal
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        Login Now
                    </motion.button>
                </motion.div>
            )}
        </motion.div>
    );
};

export default UserWelcome;

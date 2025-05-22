import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser } from './UserContext';
import ScoreGauge from "./Gauge";

const UserWelcome = ({ onLoginClick, itemVariants, onLogoutClick }) => {
    const { user } = useUser(); // We only need user here, no need for setUserData

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
                        <ScoreGauge scoreValue={90} />
                        <p className="user-role">{user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}</p>
                    </div>

                    {/*<button className="logout-button" onClick={onLogoutClick}>*/}
                    {/*    Logout*/}
                    {/*</button>*/}
                </div>
            ) : (
                <motion.div className="guest-welcome" variants={itemVariants}>
                    <h2>Hello, Guest!</h2>
                    <p>Please log in to access the Academic Management System and manage your academic journey.</p>
                    <motion.button
                        className="login-button"
                        onClick={onLoginClick}
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
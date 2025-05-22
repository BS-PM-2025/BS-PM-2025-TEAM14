import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUser } from './UserContext';
import ScoreGauge from "./Gauge";

const UserWelcome = ({ onLoginClick, itemVariants, onLogoutClick, greeting, quote, userAvg }) => {
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
                <div className="user-welcome" style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    {/* Header: Greeting and Quote */}
                    {greeting && (
                        <>
                            <div className="user-welcome-header" style={{
                                marginBottom: 16,
                                marginTop: 0,
                                textAlign: 'center',
                                width: '100%'
                            }}>
                                <h2 style={{
                                    margin: 0,
                                    fontWeight: 700,
                                    fontSize: '1.5rem',
                                    color: 'var(--primary-color)',
                                    textAlign: 'center'
                                }}>{greeting}</h2>
                                {quote && (
                                    <div style={{
                                        fontSize: '1.22rem',
                                        color: 'var(--light-text-color)',
                                        marginTop: 2,
                                        textAlign: 'center'
                                    }}>
                                        <em>“{quote}”</em>
                                    </div>
                                )}
                            </div>

                            <div className="user-info">
                                <h2>Hello, {getUserDisplayName()}!</h2>
                                <ScoreGauge scoreValue={999} />
                                <p className="user-role">{user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}</p>
                            </div>
                        </>
                    )}

                    {/* Main row: Gauge left, Role center, Logout right */}
                    {userAvg === undefined ? (
                        <div className="user-welcome-main" style={{
                            display: 'flex',
                            width: '100%',
                            alignItems: 'center',
                            position: 'relative',
                            minHeight: 60
                        }}>
                            <p
                                className="user-role"
                                style={{
                                    position: 'absolute',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    margin: 0,
                                    fontWeight: 600,
                                    textAlign: 'center',
                                    width: 'max-content'
                                }}
                            >
                                {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
                            </p>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                            </div>
                        </div>
                    ) : (
                        <div className="user-welcome-main" style={{
                            display: 'flex',
                            width: '100%',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 16
                        }}>
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'flex-start',
                                marginTop: '8px',
                                minWidth: '120px',
                            }}>
                                <span style={{
                                    fontSize: '1rem',
                                    color: 'var(--light-text-color)',
                                    marginBottom: '4px',
                                    fontWeight: 500,
                                    textAlign: 'center',
                                }}>
                                    Your Average
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                    <ScoreGauge scoreValue={userAvg} />
                                </div>
                            </div>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                                <p className="user-role" style={{ margin: 0, fontWeight: 600 }}>
                                    {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
                                </p>
                            </div>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                                <button className="logout-button" onClick={onLogoutClick}>
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}

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
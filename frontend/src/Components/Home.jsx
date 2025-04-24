import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {Modal, Box, Alert} from '@mui/material';
import { useUser } from './UserContext'; // Import the custom hook
import { getToken, removeToken } from '../utils/auth';
import ConfirmationDialog from './ConfirmationDialog';
import Login from './Login'; // Import the Login component
import UserWelcome from './UserWelcome'; // Import the new UserWelcome component
import '../CSS/Home.css';
import CreateUser from "./CreateUser";

const Home = () => {
  const { user, setUserData } = useUser(); // Use the user and setUserData from context
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [openLoginModal, setOpenLoginModal] = useState(false);
  const navigate = useNavigate();
  const [alert, setAlert] = useState({ type: '', message: '' });

  useEffect(() => {
    const checkLoginStatus = () => {
      const token = getToken();
      console.log("Checking login status, token:", token ? "exists" : "none");

      if (token) {
        // Get the user data from localStorage
        const userData = JSON.parse(localStorage.getItem("user"));

        // Only update if user data is null but we have data in localStorage
        // This prevents unnecessary re-renders and potential state cycles
        if (!user && userData) {
          console.log("Restoring user data from localStorage");
          setUserData(userData);
        }
      } else {
        // No token, clear user data if it exists
        if (user) {
          console.log("No token found, clearing user data");
          setUserData(null);
        }
      }
    };

    checkLoginStatus();

    // Add debug log to track when this effect runs
    console.log("Login status effect executed");

    window.addEventListener('storage', checkLoginStatus);
    window.addEventListener('focus', checkLoginStatus);

    return () => {
      window.removeEventListener('storage', checkLoginStatus);
      window.removeEventListener('focus', checkLoginStatus);
    };
  }, [user]); // Add user to the dependency array

  useEffect(() => {
    if (alert.message) {
      const timeout = setTimeout(() => {
        setAlert({ type: '', message: '' });
      }, 3000); // dismiss after 3 seconds
      return () => clearTimeout(timeout);
    }
  }, [alert]);

  const handleLogout = () => {
    console.log("Logout button clicked");
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    // Only remove token and clear user data AFTER user confirms
    removeToken();
    setUserData(null);
    setShowLogoutDialog(false);
    navigate('/');
    setAlert({ type: 'success', message: 'Logged out successfully!' });
  };

  const cancelLogout = () => {
    setShowLogoutDialog(false);
  };
  const handleOpenLogin = () => setOpenLoginModal(true);
  const handleCloseLogin = () => setOpenLoginModal(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  const tabContentVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring",
        stiffness: 100
      }
    },
    exit: {
      opacity: 0,
      x: 20
    }
  };

  return (

      <motion.div
          className="home-container"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
      >
        {alert && (
            <Alert severity={alert.type}>
              {alert.message}
            </Alert>
        )}

        <motion.section className="hero-section" variants={itemVariants}>
          <div className="hero-content">
            <h1 className="hero-title">Academic Management System</h1>
            <p className="hero-subtitle">Streamline your academic journey with our powerful platform</p>
          </div>
        </motion.section>

        <main className="main-content">
          <UserWelcome
              user={user}
              onLoginClick={handleOpenLogin}
              onLogoutClick={handleLogout}
              itemVariants={itemVariants}
          />

          {user && (
              <motion.div className="dashboard-tabs" variants={itemVariants}>
                <div className="tabs-header">
                  {['dashboard', 'courses', 'grades', 'documents'].map((tab) => (
                      <button
                          key={tab}
                          className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                          onClick={() => setActiveTab(tab)}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  <motion.div
                      key={activeTab}
                      className="tab-content"
                      variants={tabContentVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                  >
                    {activeTab === 'dashboard' && (
                        <div className="dashboard-content">
                          <h3>Dashboard Overview</h3>
                          <div className="dashboard-cards">
                            <motion.div className="dashboard-card" variants={itemVariants}>
                              <h4>Current Courses</h4>
                              <p>View your enrolled courses and schedules</p>
                            </motion.div>
                            <motion.div className="dashboard-card" variants={itemVariants}>
                              <h4>Recent Grades</h4>
                              <p>Check your latest academic performance</p>
                            </motion.div>
                            <motion.div className="dashboard-card" variants={itemVariants}>
                              <h4>Documents</h4>
                              <p>Access your academic documents</p>
                            </motion.div>
                          </div>
                        </div>
                    )}
                    {activeTab === 'courses' && (
                        <div className="courses-content">
                          <h3>Your Courses</h3>
                          <p>Course content will be displayed here</p>
                        </div>
                    )}
                    {activeTab === 'grades' && (
                        <div className="grades-content">
                          <h3>Academic Performance</h3>
                          <p>Grades content will be displayed here</p>
                        </div>
                    )}
                    {activeTab === 'documents' && (
                        <div className="documents-content">
                          <h3>Academic Documents</h3>
                          <p>Documents content will be displayed here</p>
                        </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
          )}
        </main>

        <motion.footer className="footer" variants={itemVariants}>
          <p>&copy; 2024 Academic Management System. All rights reserved.</p>
        </motion.footer>

        <ConfirmationDialog
            isOpen={showLogoutDialog}
            onClose={cancelLogout}
            onConfirm={confirmLogout}
            title="Confirm Logout"
            message="Are you sure you want to log out?"
        />

        {/* Login Modal */}
        <Modal
            open={openLoginModal}
            onClose={handleCloseLogin}
            aria-labelledby="login-modal-title"
            aria-describedby="login-modal-description"
        >
          <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                bgcolor: 'background.paper',
                boxShadow: 24,
                p: 4,
                borderRadius: 2,
                width: '90%',
                maxWidth: 500,
                outline: 'none',
              }}
          >
            <Login
                onSuccess={(userData) => {
                  setUserData(userData); // Save user data in the global context
                  setOpenLoginModal(false);
                  setAlert({ type: 'success', message: 'Login successful!' });
                  console.log("Login successful:", userData);
                }}
                onFailure={() => {
                  setAlert({ type: 'error', message: 'Login failed. Please try again.' });
                  console.log("Login failed.");
                }}
            />
          </Box>
        </Modal>
      </motion.div>
  );
};

export default Home;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getToken, getUserFromToken, removeToken } from '../utils/auth';
import ConfirmationDialog from './ConfirmationDialog';
import '../CSS/Home.css';

const Home = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkLoginStatus = () => {
      const token = getToken();
      console.log("Token from localStorage:", token);
      
      if (token) {
        const userData = getUserFromToken(token);
        console.log("User data from token:", userData);
        setUser(userData);
      } else {
        setUser(null);
      }
    };

    checkLoginStatus();
    window.addEventListener('storage', checkLoginStatus);
    window.addEventListener('focus', checkLoginStatus);

    return () => {
      window.removeEventListener('storage', checkLoginStatus);
      window.removeEventListener('focus', checkLoginStatus);
    };
  }, []);

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    removeToken();
    setUser(null);
    setShowLogoutDialog(false);
    navigate('/');
  };

  const cancelLogout = () => {
    setShowLogoutDialog(false);
  };

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

  // Get user display name based on available data
  const getUserDisplayName = () => {
    if (!user) return '';
    
    console.log("Getting display name from user data:", user);
    
    // Check for username first (most common in JWT tokens)
    if (user.username) return user.username;
    
    // Then check for name
    if (user.name) return user.name;
    
    // Then check for email
    if (user.user_email) return user.user_email.split('@')[0];
    
    // Fallback
    return 'User';
  };

  // Get user role display
  const getUserRoleDisplay = () => {
    if (!user) return '';
    
    console.log("Getting role from user data:", user);
    
    const role = user.role;
    if (!role) return '';
    
    // Capitalize first letter
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <motion.div
      className="home-container"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.section className="hero-section" variants={itemVariants}>
        <div className="hero-content">
          <h1 className="hero-title">Academic Management System</h1>
          <p className="hero-subtitle">Streamline your academic journey with our powerful platform</p>
        </div>
      </motion.section>

      <main className="main-content">
        {user ? (
          <>
            <motion.div className="user-welcome" variants={itemVariants}>
              <div className="user-avatar">
                <div className="avatar-circle">
                  {getUserDisplayName() ? getUserDisplayName()[0].toUpperCase() : 'U'}
                </div>
              </div>
              <div className="user-info">
                <h2>Hello, {getUserDisplayName()}!</h2>
                <p className="user-role">{getUserRoleDisplay()}</p>
              </div>
              <button className="logout-button" onClick={handleLogout}>
                Logout
              </button>
            </motion.div>

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
          </>
        ) : (
          <motion.div className="guest-welcome" variants={itemVariants}>
            <h2>Hello, Guest!</h2>
            <p>Please log in to access the Academic Management System and manage your academic journey.</p>
            <motion.button
              className="login-button"
              onClick={() => navigate('/login')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Login Now
            </motion.button>
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
    </motion.div>
  );
};

export default Home; 
import React, { useState, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useUser } from './UserContext';
import { getToken, removeToken } from '../utils/auth';
import { Modal, Box, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ConfirmationDialog from './ConfirmationDialog';
import Login from './Login';
import UserWelcome from './UserWelcome';
import UserGrades from './UserGrades';
import ProfessorView from './ProfessorView';
import axios from 'axios';
import '../CSS/Home.css';
import DashboardTab from "./DashboardTab";

const Home = () => {
  const { user, setUserData } = useUser();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [openLoginModal, setOpenLoginModal] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false); // Track dark mode state
  const navigate = useNavigate();

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#4a6cf7',
      },
      background: {
        default: darkMode ? '#0a1f44' : '#fff', // Blue for dark mode
        paper: darkMode ? '#1c2d58' : '#fff',
      },
      text: {
        primary: darkMode ? '#ffffff' : '#000000',
      },
    },
  });

  useEffect(() => {
    const checkLoginStatus = () => {
      const token = getToken();
      if (token) {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (!user && userData) {
          setUserData(userData);
        }
      } else {
        if (user) {
          setUserData(null);
        }
      }
    };

    checkLoginStatus();
    window.addEventListener('storage', checkLoginStatus);
    window.addEventListener('focus', checkLoginStatus);

    return () => {
      window.removeEventListener('storage', checkLoginStatus);
      window.removeEventListener('focus', checkLoginStatus);
    };
  }, [user]);

  useEffect(() => {
    if (alert.message) {
      const timeout = setTimeout(() => {
        setAlert({ type: '', message: '' });
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [alert]);

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    removeToken();
    setUserData(null);
    setShowLogoutDialog(false);
    navigate('/');
    setAlert({ type: 'success', message: 'Logged out successfully!' });
  };

  const cancelLogout = () => {
    setShowLogoutDialog(false);
  };

  const handleCoursesTab = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`http://localhost:8000/student/${user?.user_email}/courses`);
      setCourses(response.data.courses);
    } catch (err) {
      setError('Failed to fetch courses');
    }
    setLoading(false);
  };

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
      <ThemeProvider theme={theme}>
        <div className="home-container">
          <Alert severity={alert.type}>{alert.message}</Alert>

          <div className="hero-section">
            <div className="hero-content">
              <h1 className="hero-title">Academic Management System</h1>
              <p className="hero-subtitle">Streamline your academic journey with our powerful platform</p>
            </div>
          </div>

          <main className="main-content">
            <UserWelcome
                user={user}
                onLoginClick={() => setOpenLoginModal(true)}
                onLogoutClick={handleLogout}
            />
            {user && (
                <div className="dashboard-tabs">
                  <div className="tabs-header">
                    {['dashboard', 'courses', 'grades', 'documents', 'lecturer availability'].map((tab) => (
                        <button
                            key={tab}
                            className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => {
                              setActiveTab(tab);
                              if (tab === 'courses') handleCoursesTab();
                            }}
                        >
                          {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                  </div>
                  
                  <div className="tab-content">
                    {activeTab === 'lecturer availability' && user.role === 'student' && (
                      <ProfessorView studentEmail={user.user_email} />
                    )}
                    {activeTab === 'grades' && <UserGrades />}
                    {/* Add other tab content here */}
                  </div>
                </div>
            )}
          </main>

          <ConfirmationDialog
              isOpen={showLogoutDialog}
              onClose={cancelLogout}
              onConfirm={confirmLogout}
              title="Confirm Logout"
              message="Are you sure you want to log out?"
          />

          {/* Login Modal */}
          <Modal open={openLoginModal} onClose={() => setOpenLoginModal(false)}>
            <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bgcolor: 'background.paper', boxShadow: 24, p: 4 }}>
              <Login
                  onSuccess={(userData) => {
                    setUserData(userData);
                    setOpenLoginModal(false);
                    setAlert({ type: 'success', message: 'Login successful!' });
                  }}
                  onFailure={() => setAlert({ type: 'error', message: 'Login failed. Please try again.' })}
              />
            </Box>
          </Modal>
        </div>
      </ThemeProvider>
  );
};

export default Home;

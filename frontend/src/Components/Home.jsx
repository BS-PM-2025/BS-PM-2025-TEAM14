import React, { useState, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { useUser } from './UserContext';
import { getToken, removeToken, forceLogout, isTokenValid, checkBackendHealth } from '../utils/auth';
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

const motivationalQuotes = [
  "Success is not the key to happiness. Happiness is the key to success.",
  "The future depends on what you do today.",
  "Don't watch the clock; do what it does. Keep going.",
  "Believe you can and you're halfway there.",
  "Opportunities don't happen, you create them.",
  "The best way to get started is to quit talking and begin doing."
];

function getRandomQuote() {
  return motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
}

const Home = () => {
  const { user, setUserData } = useUser();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [openLoginModal, setOpenLoginModal] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [coursesError, setCoursesError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false); // Track dark mode state
  const navigate = useNavigate();
  const [quote] = useState(getRandomQuote());
  const [recentActivity, setRecentActivity] = useState([]);
  const [grades, setGrades] = useState([]);

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
    const checkLoginStatus = async () => {
      const token = getToken();
      if (token) {
        try {
          // Check if backend is running
          const isBackendHealthy = await checkBackendHealth();
          if (!isBackendHealthy) {
            console.log('Backend is down, forcing logout');
            forceLogout();
            return;
          }

          const userData = JSON.parse(localStorage.getItem('user'));
          if (!user && userData) {
            setUserData(userData);
          }
        } catch (error) {
          console.error('Error checking login status:', error);
          removeToken();
        }
      } else {
        if (user) {
          setUserData(null);
        }
      }
    };

    // Check login status on mount
    checkLoginStatus();

    // Set up interval to check backend health every 5 seconds
    const healthCheckInterval = setInterval(checkLoginStatus, 5000);

    // Add event listeners
    window.addEventListener('storage', checkLoginStatus);
    window.addEventListener('focus', checkLoginStatus);

    return () => {
      clearInterval(healthCheckInterval);
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

  useEffect(() => {
    if (user?.user_email) {
      axios.get(`http://localhost:8000/requests/${user.user_email}`)
        .then(res => {
          // Assuming res.data is an array of request objects
          const activity = res.data
            .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
            .slice(0, 5)
            .map(req => ({
              id: req.id,
              type: 'Request',
              desc: req.title || 'Submitted a request',
              date: req.created_date ? req.created_date.slice(0, 10) : ''
            }));
          setRecentActivity(activity);
        })
        .catch(err => {
          setRecentActivity([]);
        });
    }
  }, [user]);

  useEffect(() => {
    if (user?.user_email) {
      axios.get(`http://localhost:8000/grades/${user.user_email}`)
        .then(res => {
          setGrades(res.data);
        })
        .catch(() => setGrades([]));
    }
  }, [user]);

  // Fetch user courses when Courses tab is selected
  useEffect(() => {
    if (activeTab === 'courses' && user?.user_email) {
      setLoadingCourses(true);
      setCoursesError('');
      axios.get(`http://localhost:8000/student/${user.user_email}/courses`)
        .then(res => {
          setCourses(res.data.courses || []);
          setLoadingCourses(false);
        })
        .catch(() => {
          setCourses([]);
          setCoursesError('Failed to fetch courses');
          setLoadingCourses(false);
        });
    }
  }, [activeTab, user]);

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

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const getGreeting = (name) => {
    const hour = new Date().getHours();
    let greeting = '';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';
    else greeting = 'Good evening';
    return `${greeting}${name ? ', ' + name : ''}!`;
  };

  const userDisplayName = user?.user_name || user?.user_email?.split('@')[0] || '';
  const greeting = getGreeting(userDisplayName);

  const userAvg = grades.length
    ? (grades.reduce((sum, g) => sum + (g.grade || 0), 0) / grades.length).toFixed(1)
    : 0;

  // Helper to get grade for a request (by course and component)
  function getGradeForRequest(request) {
    if (!grades || !Array.isArray(grades)) return null;
    const courseMatch = grades.find(g =>
      request.details && g.course_name && request.details.includes(g.course_name)
    );
    return courseMatch ? `${courseMatch.grade_component}: ${courseMatch.grade}` : null;
  }

  // Helper to get icon for activity type
  function getActivityIcon(desc) {
    const d = desc.toLowerCase();
    if (d.includes('grade')) return '🏆';
    if (d.includes('upload')) return '📄';
    if (d.includes('schedule')) return '📅';
    if (d.includes('appeal')) return '📝';
    if (d.includes('general')) return '📬'; // General Request
    if (d.includes('request')) return '📨'; // fallback for any request
    return '🔔'; // fallback icon
  }

  // Helper to get status badge (if available)
  function getStatusBadge(status) {
    if (!status) return null;
    let color = '#888';
    if (status.toLowerCase().includes('pending')) color = '#ff9800';
    if (status.toLowerCase().includes('approved')) color = '#4caf50';
    if (status.toLowerCase().includes('rejected')) color = '#f44336';
    return (
      <span style={{
        background: color,
        color: '#fff',
        borderRadius: 8,
        padding: '2px 8px',
        fontSize: '0.85em',
        marginLeft: 8
      }}>{status}</span>
    );
  }

  const isStudent = user?.role === 'student';

  return (
      <ThemeProvider theme={theme}>
        <div className="home-container">
          <Alert severity={alert.type} className="animated-alert">{alert.message}</Alert>

          <div className="hero-section">
            <div className="hero-content">
              <h1 className="hero-title">Academic Management System</h1>
              <p className="hero-subtitle">Streamline your academic journey with our powerful platform</p>
            </div>
            <div className="bubbles">
              <div className="bubble"></div>
              <div className="bubble"></div>
              <div className="bubble"></div>
              <div className="bubble"></div>
              <div className="bubble"></div>
              <div className="bubble"></div>
              <div className="bubble"></div>
              <div className="bubble"></div>
            </div>
          </div>

          <main className="main-content">
            <UserWelcome
                user={user}
                greeting={greeting}
                quote={quote}
                userAvg={isStudent ? userAvg : undefined}
                onLoginClick={() => setOpenLoginModal(true)}
                onLogoutClick={handleLogout}
            />
            {user && (
                <div className="dashboard-tabs">
                  <div className="tabs-header">
                    {['dashboard', ...(isStudent ? ['courses', 'grades'] : []), 'lecturer availability'].map((tab) => (
                        <button
                            key={tab}
                            className={`tab-button ${activeTab === tab ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab)}
                        >
                          {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                  </div>
                  
                  <div className="tab-content">
                    {/* Recent Activity Feed in Dashboard */}
                    {activeTab === 'dashboard' && (
                      <div className="dashboard-content">
                        <section className="recent-activity-section">
                          <h4 style={{margin: '0 0 1rem 0', fontSize: '1.3rem', color: 'var(--text-color)'}}>Recent Activity</h4>
                          <ul style={{listStyle: 'none', padding: 0, margin: 0, width: '100%'}}>
                            {recentActivity.map(item => (
                              <li key={item.id} style={{marginBottom: 14, display: 'flex', alignItems: 'center'}}>
                                <span style={{fontSize: '1.3em', marginRight: 10}}>{getActivityIcon(item.desc)}</span>
                                <span style={{fontWeight: 600, color: 'var(--primary-color)', marginRight: 8}}>{item.type}:</span>
                                <span style={{flex: 1}}>{item.desc}
                                  {/* Show grade if this is a grade-related request */}
                                  {item.desc.toLowerCase().includes('grade') && getGradeForRequest(item) && (
                                    <span style={{marginLeft: 8, color: '#1976d2', fontWeight: 500}}>
                                      ({getGradeForRequest(item)})
                                    </span>
                                  )}
                                </span>
                                {/* Show status badge if available */}
                                {item.status && getStatusBadge(item.status)}
                                <span style={{fontSize: '0.92em', color: 'var(--light-text-color)', marginLeft: 8}}>{item.date}</span>
                              </li>
                            ))}
                          </ul>
                        </section>
                      </div>
                    )}
                    {activeTab === 'lecturer availability' && user.role === 'student' && (
                      <ProfessorView studentEmail={user.user_email} />
                    )}
                    {isStudent && activeTab === 'grades' && <UserGrades userEmail={user.user_email} />}
                    {isStudent && activeTab === 'courses' && (
                      <div className="courses-content">
                        <h3>Your Courses</h3>
                        {loadingCourses && <p>Loading courses...</p>}
                        {coursesError && <p style={{ color: 'red' }}>{coursesError}</p>}
                        <div className="dashboard-cards">
                          {courses.length > 0 ? courses.map(course => (
                            <div key={course.id} className="content-card">
                              <h4>{course.name}</h4>
                              <p>Course ID: {course.id}</p>
                              {course.description && <p>{course.description}</p>}
                              {course.professor_email && <p>Professor: {course.professor_email}</p>}
                            </div>
                          )) : !loadingCourses && <p>No courses to display.</p>}
                        </div>
                      </div>
                    )}
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
          <footer className="footer">
            © 2025 Ilan Shtilman, Ariel Perstin, Moshe Berokovich,Ehud Vaknin. All rights reserved.
          </footer>
        </div>
      </ThemeProvider>
  );
};

export default Home;

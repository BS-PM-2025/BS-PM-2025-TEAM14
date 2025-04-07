import React from 'react';
import { useNavigate } from 'react-router-dom';
import { removeToken } from '../utils/auth';

const Logout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear token from localStorage
    removeToken();
    
    // Redirect to home page
    navigate('/');
  };

  return (
    <button className="btn btn-danger" onClick={handleLogout}>
      Logout
    </button>
  );
};

export default Logout; 
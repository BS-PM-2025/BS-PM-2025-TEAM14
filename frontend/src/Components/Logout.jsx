import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { removeToken } from '../utils/auth';
import ConfirmationDialog from './ConfirmationDialog';
import { useUser } from './UserContext';

const Logout = () => {
  const navigate = useNavigate();
  const { setUserData } = useUser();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    // Remove token
    removeToken();
    
    // Clear user data from context and localStorage
    setUserData(null);
    window.dispatchEvent(new Event('user-changed'));
    // Close dialog and navigate
    setShowLogoutDialog(false);
    navigate('/');
  };

  const cancelLogout = () => {
    setShowLogoutDialog(false);
  };

  return (
    <>
      <button className="btn btn-danger logout-button" onClick={handleLogout}>
        Logout
      </button>

      <ConfirmationDialog
          isOpen={showLogoutDialog}
        onClose={cancelLogout}
        onConfirm={confirmLogout}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
      />
    </>
  );
};

export default Logout; 
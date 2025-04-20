import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { removeToken } from '../utils/auth';
import ConfirmationDialog from './ConfirmationDialog';

const Logout = () => {
  const navigate = useNavigate();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const confirmLogout = () => {
    removeToken();
    setShowLogoutDialog(false);
    navigate('/');
  };

  const cancelLogout = () => {
    setShowLogoutDialog(false);
  };

  return (
    <>
      <button className="btn btn-danger" onClick={handleLogout}>
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
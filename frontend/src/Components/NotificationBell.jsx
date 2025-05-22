import React, { useState, useEffect } from "react";
import {
  Badge,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Button,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { getToken, getUserFromToken } from "../utils/auth";
import NotificationCenter from "./NotificationCenter";

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [anchorEl, setAnchorEl] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userEmail, setUserEmail] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  const fetchNotifications = async () => {
    try {
      const userData = getUserFromToken();
      if (!userData || !userData.user_email) {
        setNotifications([]);
        setUnreadCount(0);
        setUserEmail(null);
        return;
      }
      setUserEmail(userData.user_email);
      const response = await fetch(
        `http://localhost:8000/notifications/${userData.user_email}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        // Sort notifications by date, newest first
        const sortedData = data.sort((a, b) => 
          new Date(b.created_date) - new Date(a.created_date)
        );
        setNotifications(sortedData);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  // Effect for initial fetch and polling
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Effect to handle token changes
  useEffect(() => {
    const handleStorageChange = () => {
      const token = getToken();
      if (!token) {
        setNotifications([]);
        setUnreadCount(0);
        setUserEmail(null);
      } else {
        fetchNotifications();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    handleStorageChange();
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Add a custom event listener for 'user-changed' to fetch notifications instantly
  useEffect(() => {
    const handleUserChanged = () => {
      fetchNotifications();
    };
    window.addEventListener("user-changed", handleUserChanged);
    return () => window.removeEventListener("user-changed", handleUserChanged);
  }, []);

  const handleBellClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if not already
    if (!notification.is_read) {
      try {
        const response = await fetch(
          `http://localhost:8000/notifications/${notification.id}/read`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          }
        );
        if (response.ok) {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === notification.id ? { ...n, is_read: true } : n
            )
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }
    setSelectedNotification(notification);
    setDrawerOpen(true);
    setAnchorEl(null);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
  };

  const handleSelectNotification = (notif) => {
    setSelectedNotification(notif);
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch(
        "http://localhost:8000/notifications/read-all",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }
      );

      if (response.ok) {
        setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Don't render anything if there's no logged-in user
  if (!getToken()) {
    return null;
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", marginRight: '15px' }}>
      <IconButton color="inherit" onClick={handleBellClick}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          style: {
            maxHeight: 300,
            width: 360,
          },
        }}
      >
        {notifications.length > 0 ? (
          <Box>
            <Box
              sx={{
                p: 1,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="subtitle1">Notifications</Typography>
              <Button
                size="small"
                onClick={handleMarkAllAsRead}
                disabled={notifications.length === 0 || unreadCount === 0}
              >
                Mark all as read
              </Button>
            </Box>
            {notifications.map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  whiteSpace: "normal",
                  backgroundColor: notification.is_read
                    ? "inherit"
                    : "action.hover",
                }}
              >
                <Box>
                  <Typography variant="body2">
                    {notification.message}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(notification.created_date).toLocaleString()}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Box>
        ) : (
          <MenuItem disabled>
            <Typography>No notifications</Typography>
          </MenuItem>
        )}
      </Menu>
      <NotificationCenter
        open={drawerOpen}
        onClose={handleDrawerClose}
        notifications={notifications}
        selectedNotification={selectedNotification}
        onSelectNotification={handleSelectNotification}
      />
    </Box>
  );
};

export default NotificationBell;

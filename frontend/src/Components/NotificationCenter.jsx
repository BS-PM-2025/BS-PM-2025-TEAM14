import React from "react";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

const NotificationCenter = ({
  open,
  onClose,
  notifications,
  selectedNotification,
  onSelectNotification,
}) => {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 600, display: "flex", height: "100%" }}>
        {/* Notification List */}
        <Box
          sx={{ width: 250, borderRight: "1px solid #eee", overflowY: "auto" }}
        >
          <Typography variant="h6" sx={{ p: 2 }}>
            Messages
          </Typography>
          <Divider />
          <List>
            {notifications.map((notif) => (
              <ListItem
                button
                key={notif.id}
                selected={
                  selectedNotification && notif.id === selectedNotification.id
                }
                onClick={() => onSelectNotification(notif)}
                alignItems="flex-start"
              >
                <ListItemText
                  primary={notif.message}
                  secondary={
                    notif.created_at
                      ? new Date(notif.created_at).toLocaleString()
                      : ""
                  }
                  sx={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 200,
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
        {/* Notification Details */}
        <Box sx={{ flex: 1, p: 3, position: "relative" }}>
          <IconButton
            onClick={onClose}
            sx={{ position: "absolute", top: 8, right: 8 }}
          >
            <CloseIcon />
          </IconButton>
          {selectedNotification ? (
            <>
              <Typography variant="h5" gutterBottom>
                Message Details
              </Typography>
              <Typography
                variant="subtitle1"
                color="text.secondary"
                gutterBottom
              >
                {selectedNotification.created_at
                  ? new Date(selectedNotification.created_at).toLocaleString()
                  : ""}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body1">
                {selectedNotification.message}
              </Typography>
              {selectedNotification.type && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 2, display: "block" }}
                >
                  Type: {selectedNotification.type}
                </Typography>
              )}
            </>
          ) : (
            <Typography variant="body1">בחר הודעה להצגה</Typography>
          )}
        </Box>
      </Box>
    </Drawer>
  );
};

export default NotificationCenter;

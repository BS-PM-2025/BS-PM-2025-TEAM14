import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  IconButton,
  Chip,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";

const DeadlineManagement = () => {
  const [deadlineConfigs, setDeadlineConfigs] = useState([]);
  const [requestTypes, setRequestTypes] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentConfig, setCurrentConfig] = useState({
    request_type: "",
    deadline_days: "",
  });
  const [isEdit, setIsEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // Fetch deadline configurations
  const fetchDeadlineConfigs = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        "http://localhost:8000/api/deadline_configs",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDeadlineConfigs(data);
      } else {
        throw new Error("Failed to fetch deadline configurations");
      }
    } catch (error) {
      console.error("Error fetching deadline configs:", error);
      setSnackbar({
        open: true,
        message: "Failed to load deadline configurations",
        severity: "error",
      });
    }
  };

  // Fetch available request types
  const fetchRequestTypes = async () => {
    try {
      const token = localStorage.getItem("access_token");
      console.log(
        "Fetching request types with token:",
        token ? "Present" : "Missing"
      );

      const response = await fetch(
        "http://localhost:8000/api/request_template_names",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Request types response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Fetched request types:", data);
        setRequestTypes(data);
      } else {
        const errorText = await response.text();
        console.error("Failed to fetch request types - Response:", errorText);
        throw new Error("Failed to fetch request types");
      }
    } catch (error) {
      console.error("Error fetching request types:", error);
      setSnackbar({
        open: true,
        message: "Failed to load request types",
        severity: "error",
      });
    }
  };

  useEffect(() => {
    fetchDeadlineConfigs();
    fetchRequestTypes();
  }, []);

  const handleOpenDialog = (config = null) => {
    if (config) {
      setCurrentConfig({
        request_type: config.request_type,
        deadline_days: config.deadline_days.toString(),
      });
      setIsEdit(true);
    } else {
      setCurrentConfig({
        request_type: "",
        deadline_days: "",
      });
      setIsEdit(false);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentConfig({ request_type: "", deadline_days: "" });
    setIsEdit(false);
  };

  const handleSave = async () => {
    if (!currentConfig.request_type || !currentConfig.deadline_days) {
      setSnackbar({
        open: true,
        message: "Please fill in all required fields",
        severity: "error",
      });
      return;
    }

    const deadlineDays = parseInt(currentConfig.deadline_days);
    if (isNaN(deadlineDays) || deadlineDays <= 0) {
      setSnackbar({
        open: true,
        message: "Deadline days must be a positive number",
        severity: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        "http://localhost:8000/api/deadline_configs",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            request_type: currentConfig.request_type,
            deadline_days: deadlineDays,
          }),
        }
      );

      if (response.ok) {
        await fetchDeadlineConfigs();
        handleCloseDialog();
        setSnackbar({
          open: true,
          message: isEdit
            ? "Deadline configuration updated successfully"
            : "Deadline configuration created successfully",
          severity: "success",
        });
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Failed to save deadline configuration"
        );
      }
    } catch (error) {
      console.error("Error saving deadline config:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to save deadline configuration",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (requestType) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the deadline configuration for "${requestType}"?`
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `http://localhost:8000/api/deadline_configs/${encodeURIComponent(
          requestType
        )}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        await fetchDeadlineConfigs();
        setSnackbar({
          open: true,
          message: "Deadline configuration deleted successfully",
          severity: "success",
        });
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "Failed to delete deadline configuration"
        );
      }
    } catch (error) {
      console.error("Error deleting deadline config:", error);
      setSnackbar({
        open: true,
        message: error.message || "Failed to delete deadline configuration",
        severity: "error",
      });
    }
  };

  // Get available request types for the dropdown (exclude already configured ones when adding new)
  const getAvailableRequestTypes = () => {
    console.log("getAvailableRequestTypes called:");
    console.log("- isEdit:", isEdit);
    console.log("- requestTypes:", requestTypes);
    console.log("- deadlineConfigs:", deadlineConfigs);

    if (isEdit) {
      return requestTypes;
    }
    const configuredTypes = deadlineConfigs.map(
      (config) => config.request_type
    );
    console.log("- configuredTypes:", configuredTypes);

    const availableTypes = requestTypes.filter(
      (type) => !configuredTypes.includes(type)
    );
    console.log("- availableTypes:", availableTypes);

    return availableTypes;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <ScheduleIcon color="primary" />
          Request Deadline Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          // disabled={getAvailableRequestTypes().length === 0}  // Temporarily disabled for testing
        >
          Add Deadline Rule
        </Button>
      </Box>

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Request Type</strong>
                </TableCell>
                <TableCell>
                  <strong>Deadline (Days)</strong>
                </TableCell>
                <TableCell>
                  <strong>Created By</strong>
                </TableCell>
                <TableCell>
                  <strong>Last Updated</strong>
                </TableCell>
                <TableCell>
                  <strong>Actions</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deadlineConfigs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No deadline configurations found. Click "Add Deadline
                      Rule" to create one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                deadlineConfigs.map((config) => (
                  <TableRow key={config.id} hover>
                    <TableCell>
                      <Chip
                        label={config.request_type}
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {config.deadline_days}{" "}
                        {config.deadline_days === 1 ? "day" : "days"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {config.created_by}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(config.updated_date).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleOpenDialog(config)}
                          title="Edit deadline"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(config.request_type)}
                          title="Delete deadline"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {isEdit
            ? "Edit Deadline Configuration"
            : "Add Deadline Configuration"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Request Type</InputLabel>
              <Select
                value={currentConfig.request_type}
                label="Request Type"
                onChange={(e) =>
                  setCurrentConfig({
                    ...currentConfig,
                    request_type: e.target.value,
                  })
                }
                disabled={isEdit}
              >
                {getAvailableRequestTypes().map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Deadline (Days)"
              type="number"
              value={currentConfig.deadline_days}
              onChange={(e) =>
                setCurrentConfig({
                  ...currentConfig,
                  deadline_days: e.target.value,
                })
              }
              helperText="Number of days from request creation date until expiration"
              inputProps={{ min: 1 }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {loading ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DeadlineManagement;

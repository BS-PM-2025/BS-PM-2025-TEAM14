import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Paper,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DateRangePicker } from "@mui/x-date-pickers-pro/DateRangePicker";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import axios from "axios";
import { format, isWithinInterval, isAfter, startOfDay } from "date-fns";
import { enGB } from "date-fns/locale";
import "../CSS/ProfessorUnavailability.css";

export default function ProfessorUnavailability({ professorEmail }) {
  const [periods, setPeriods] = useState([]);
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [reason, setReason] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetchUnavailabilityPeriods();
  }, [professorEmail]);

  const fetchUnavailabilityPeriods = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8000/professor/unavailability/${professorEmail}`
      );
      setPeriods(response.data.periods);
    } catch (error) {
      console.error("Error fetching unavailability periods:", error);
    }
  };

  const isPeriodRelevant = (period) => {
    const today = startOfDay(new Date());
    const periodStart = new Date(period.start_date);
    const periodEnd = new Date(period.end_date);

    return (
      isWithinInterval(today, { start: periodStart, end: periodEnd }) ||
      isAfter(periodStart, today)
    );
  };

  const handleAddPeriod = async () => {
    try {
      await axios.post(
        `http://localhost:8000/professor/unavailability/${professorEmail}`,
        {
          start_date: startDate ? format(startDate, "yyyy-MM-dd") : null,
          end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
          reason: reason,
        }
      );
      setOpen(false);
      fetchUnavailabilityPeriods();
      // Reset form
      setStartDate(null);
      setEndDate(null);
      setReason("");
    } catch (error) {
      console.error("Error adding unavailability period:", error);
    }
  };

  const handleDeletePeriod = async (periodId) => {
    try {
      await axios.delete(
        `http://localhost:8000/professor/unavailability/${periodId}`
      );
      fetchUnavailabilityPeriods();
    } catch (error) {
      console.error("Error deleting unavailability period:", error);
    }
  };

  const handleTrashClick = (periodId) => {
    setPendingDeleteId(periodId);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteId) {
      await handleDeletePeriod(pendingDeleteId);
      setPendingDeleteId(null);
      setConfirmOpen(false);
    }
  };

  const handleCancelDelete = () => {
    setPendingDeleteId(null);
    setConfirmOpen(false);
  };

  const relevantPeriods = periods.filter(isPeriodRelevant);

  return (
    <Box className="prof-unavail-root" sx={{ p: 3 }}>
      <div className="prof-unavail-header-row">
        <Typography variant="h5" gutterBottom className="prof-unavail-header">
          Manage Unavailability Periods
        </Typography>
        <div className="prof-unavail-header-img">
          <img
            src="https://i.pinimg.com/736x/38/82/f6/3882f6c3cf29b13087eeaaf7ddfb5ede.jpg"
            alt="Header visual"
          />
        </div>
      </div>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setOpen(true)}
        sx={{ mb: 2 }}
        className="prof-unavail-add-btn"
      >
        Add Unavailability Period
      </Button>

      <Paper elevation={2} className="prof-unavail-card">
        <List>
          {relevantPeriods.map((period) => (
            <ListItem
              key={period.id}
              className={`prof-unavail-list-item${
                pendingDeleteId === period.id
                  ? " prof-unavail-list-item-active"
                  : ""
              }`}
            >
              <ListItemText
                primary={`${format(
                  new Date(period.start_date),
                  "dd/MM/yyyy"
                )} - ${format(new Date(period.end_date), "dd/MM/yyyy")}`}
                secondary={period.reason || "No reason provided"}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleTrashClick(period.id)}
                  className="prof-unavail-delete-btn"
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
          {relevantPeriods.length === 0 && (
            <ListItem className="prof-unavail-list-item">
              <ListItemText primary="No relevant unavailability periods" />
            </ListItem>
          )}
        </List>
      </Paper>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="prof-unavail-dialog"
      >
        <DialogTitle className="prof-unavail-dialog-title">
          Add Unavailability Period
        </DialogTitle>
        <DialogContent className="prof-unavail-dialog-content">
          <LocalizationProvider
            dateAdapter={AdapterDateFns}
            adapterLocale={enGB}
          >
            <Box
              sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}
            >
              <DateRangePicker
                value={[startDate, endDate]}
                onChange={(newValue) => {
                  setStartDate(newValue[0]);
                  setEndDate(newValue[1]);
                }}
                format="dd/MM/yyyy"
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
              <TextField
                label="Reason (Optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                fullWidth
                multiline
                rows={2}
                className="prof-unavail-dialog-reason"
              />
            </Box>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions className="prof-unavail-dialog-actions">
          <Button
            onClick={() => setOpen(false)}
            className="prof-unavail-dialog-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddPeriod}
            variant="contained"
            disabled={!startDate || !endDate}
            className="prof-unavail-dialog-add"
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={handleCancelDelete}
        className="prof-unavail-confirm-dialog"
      >
        <DialogTitle className="prof-unavail-confirm-title">
          Confirm Deletion
        </DialogTitle>
        <DialogContent className="prof-unavail-confirm-content">
          Are you sure you want to delete this unavailability period?
        </DialogContent>
        <DialogActions className="prof-unavail-confirm-actions">
          <Button
            onClick={handleCancelDelete}
            className="prof-unavail-confirm-cancel"
          >
            No
          </Button>
          <Button
            onClick={handleConfirmDelete}
            className="prof-unavail-confirm-yes"
            variant="contained"
            color="error"
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

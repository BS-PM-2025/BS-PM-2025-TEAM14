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
import { format } from "date-fns";

export default function ProfessorUnavailability({ professorEmail }) {
  const [periods, setPeriods] = useState([]);
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [reason, setReason] = useState("");

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

  const handleAddPeriod = async () => {
    try {
      await axios.post(
        `http://localhost:8000/professor/unavailability/${professorEmail}`,
        {
          start_date: startDate,
          end_date: endDate,
          reason: reason,
        }
      );
      // n8n
      const n8nResponse = axios.post('http://localhost:5678/webhook/professor-unavailability-update',
          {
            professor_email: professorEmail,
            start_date: startDate,
            end_date: endDate,
            reason: reason
          });
      console.log(n8nResponse.data);
      // n8n
      setOpen(false);
      await fetchUnavailabilityPeriods();
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

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Manage Unavailability Periods
      </Typography>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setOpen(true)}
        sx={{ mb: 2 }}
      >
        Add Unavailability Period
      </Button>

      <Paper elevation={2}>
        <List>
          {periods.map((period) => (
            <ListItem key={period.id}>
              <ListItemText
                primary={`${new Date(
                  period.start_date
                ).toLocaleDateString()} - ${new Date(
                  period.end_date
                ).toLocaleDateString()}`}
                secondary={period.reason || "No reason provided"}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  aria-label="delete"
                  onClick={() => handleDeletePeriod(period.id)}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Add Unavailability Period</DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box
              sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}
            >
              <DateRangePicker
                value={[startDate, endDate]}
                onChange={(newValue) => {
                  setStartDate(newValue[0]);
                  setEndDate(newValue[1]);
                }}
                format="DD/MM/YYYY"
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
              />
            </Box>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAddPeriod}
            variant="contained"
            disabled={!startDate || !endDate}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

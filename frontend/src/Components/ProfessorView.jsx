import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import { Person as PersonIcon } from "@mui/icons-material";
import axios from "axios";
import { format, isAfter, isBefore } from "date-fns";

export default function ProfessorUnavailabilityView({ studentEmail }) {
  const [professors, setProfessors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfessorsAndUnavailability();
  }, [studentEmail]);

  const fetchProfessorsAndUnavailability = async () => {
    try {
      setLoading(true);
      // First, get all professors for the student's courses
      const response = await axios.get(
        `http://localhost:8000/student/${studentEmail}/professors`
      );
      const professorsData = response.data.professors;

      // For each professor, fetch their unavailability periods
      const professorsWithUnavailability = await Promise.all(
        professorsData.map(async (professor) => {
          try {
            const unavailabilityResponse = await axios.get(
              `http://localhost:8000/professor/unavailability/${professor.email}`
            );
            return {
              ...professor,
              unavailabilityPeriods: unavailabilityResponse.data.periods || [],
            };
          } catch (error) {
            console.error(
              `Error fetching unavailability for professor ${professor.email}:`,
              error
            );
            return {
              ...professor,
              unavailabilityPeriods: [],
            };
          }
        })
      );

      setProfessors(professorsWithUnavailability);
    } catch (error) {
      console.error("Error fetching professors:", error);
      setError("Failed to load professor information");
    } finally {
      setLoading(false);
    }
  };

  const isPeriodActive = (startDate, endDate) => {
    const now = new Date();
    return (
      isAfter(now, new Date(startDate)) && isBefore(now, new Date(endDate))
    );
  };

  const isPeriodFuture = (startDate) => {
    return isAfter(new Date(startDate), new Date());
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Lecturer Availability
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        View your lecturers and their unavailability periods
      </Typography>

      {professors.length === 0 ? (
        <Alert severity="info">No lecturers found for your courses.</Alert>
      ) : (
        <List>
          {professors.map((professor, index) => (
            <React.Fragment key={professor.email}>
              <Paper elevation={2} sx={{ mb: 2 }}>
                <ListItem alignItems="flex-start">
                  <ListItemAvatar>
                    <Avatar>
                      <PersonIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={`${professor.first_name} ${professor.last_name}`}
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.primary"
                        >
                          {professor.email}
                        </Typography>
                        <br />
                        {professor.unavailabilityPeriods.length === 0 ? (
                          <Chip
                            label="Available"
                            color="success"
                            size="small"
                            sx={{ mt: 1 }}
                          />
                        ) : (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Unavailable Periods:
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 1,
                                mt: 1,
                              }}
                            >
                              {professor.unavailabilityPeriods.map((period) => {
                                const isActive = isPeriodActive(
                                  period.start_date,
                                  period.end_date
                                );
                                const isFuture = isPeriodFuture(
                                  period.start_date
                                );
                                return (
                                  <Chip
                                    key={period.id}
                                    label={`${format(
                                      new Date(period.start_date),
                                      "MMM d, yyyy"
                                    )} - ${format(
                                      new Date(period.end_date),
                                      "MMM d, yyyy"
                                    )}${
                                      period.reason ? `: ${period.reason}` : ""
                                    }`}
                                    color={
                                      isActive
                                        ? "error"
                                        : isFuture
                                        ? "warning"
                                        : "default"
                                    }
                                    variant={isActive ? "filled" : "outlined"}
                                    size="small"
                                  />
                                );
                              })}
                            </Box>
                          </Box>
                        )}
                      </>
                    }
                  />
                </ListItem>
              </Paper>
              {index < professors.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
}

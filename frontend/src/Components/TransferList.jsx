import * as React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  TextField,
} from "@mui/material";
import { ArrowForward, ArrowBack } from "@mui/icons-material";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

/**
 * @param {Object} props
 * @param {Array} props.left
 * @param {Array} props.right
 * @param {Function} props.onChange
 * @param {React.ReactNode} [props.leftTitle]
 * @param {React.ReactNode} [props.rightTitle]
 * @param {boolean} [props.disabled]
 */
export const TransferList = ({
  left,
  right,
  onChange,
  leftTitle = "Available",
  rightTitle = "Selected",
  disabled = false,
}) => {
  const [checked, setChecked] = useState([]);
  const [searchLeft, setSearchLeft] = useState("");
  const [searchRight, setSearchRight] = useState("");

  const handleToggle = (id) => () => {
    if (disabled) return;
    const currentIndex = checked.indexOf(id);
    const newChecked = [...checked];
    if (currentIndex === -1) {
      newChecked.push(id);
    } else {
      newChecked.splice(currentIndex, 1);
    }
    setChecked(newChecked);
  };

  const getKey = (item) => item.id || item.email;
  const leftChecked = checked.filter((id) =>
    left.some((s) => getKey(s) === id)
  );
  const rightChecked = checked.filter((id) =>
    right.some((s) => getKey(s) === id)
  );

        if (currentIndex === -1) {
            newChecked.push(id);
        } else {
            newChecked.splice(currentIndex, 1);
        }

        setChecked(newChecked);
    };

    const getKey = (item: { id: string | null; email: string }) => item.id || item.email;

    const leftChecked = checked.filter((id) => left.some((s) => getKey(s) === id));
    const rightChecked = checked.filter((id) => right.some((s) => getKey(s) === id));

    const moveRight = () => {
        onChange([...right.map((s) => getKey(s)), ...leftChecked]);
        setChecked((prev) => prev.filter((id) => !leftChecked.includes(id)));
    };

    const moveLeft = () => {
        onChange(right.map((s) => getKey(s)).filter((id) => !rightChecked.includes(id)));
        setChecked((prev) => prev.filter((id) => !rightChecked.includes(id)));
    };

    const filteredLeft = left.filter((item) => {
        const fullName = `${item.first_name || ""} ${item.last_name || ""}`;
        return (
            item.name?.toLowerCase().includes(searchLeft.toLowerCase()) ||
            fullName.toLowerCase().includes(searchLeft.toLowerCase())
        );
    });

    const filteredRight = right.filter((item) => {
        const fullName = `${item.first_name || ""} ${item.last_name || ""}`;
        return (
            item.name?.toLowerCase().includes(searchRight.toLowerCase()) ||
            fullName.toLowerCase().includes(searchRight.toLowerCase())
        );
    });

    const renderList = (items: { id: string | null; email: string; first_name?: string; last_name?: string; name?: string }[], title: string, search: string, setSearch: React.Dispatch<React.SetStateAction<string>>) => (
        <Card className="w-full">
            <CardContent>
                <Typography variant="h5" className="text-center mb-2"><strong>{title}</strong></Typography>
                <TextField
                    label="Search"
                    variant="outlined"
                    fullWidth
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    margin="normal"
                />
                <Divider />
                <List dense className="max-h-72 overflow-auto">
                    <AnimatePresence>
                        {items.map((item) => (
                            <motion.div
                                key={getKey(item)}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <ListItem
                                    button
                                    onClick={handleToggle(getKey(item))}
                                    selected={checked.includes(getKey(item))}
                                >
                                    <ListItemIcon>
                                        <Checkbox
                                            checked={checked.includes(getKey(item))}
                                            tabIndex={-1}
                                            disableRipple
                                        />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item.name || `${item.first_name} ${item.last_name}`}
                                    />
                                </ListItem>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </List>
            </CardContent>
        </Card>

  const moveRight = () => {
    if (disabled) return;
    onChange([...right.map((s) => getKey(s)), ...leftChecked]);
    setChecked((prev) => prev.filter((id) => !leftChecked.includes(id)));
  };
  
  const moveLeft = () => {
    if (disabled) return;
    onChange(
      right.map((s) => getKey(s)).filter((id) => !rightChecked.includes(id))
    );
    setChecked((prev) => prev.filter((id) => !rightChecked.includes(id)));
  };

  const filteredLeft = left.filter((item) => {
    const fullName = `${item.first_name || ""} ${item.last_name || ""}`;
    return (
      (item.name &&
        item.name.toLowerCase().includes(searchLeft.toLowerCase())) ||
      fullName.toLowerCase().includes(searchLeft.toLowerCase())
    );
  });
  const filteredRight = right.filter((item) => {
    const fullName = `${item.first_name || ""} ${item.last_name || ""}`;
    return (
      (item.name &&
        item.name.toLowerCase().includes(searchRight.toLowerCase())) ||
      fullName.toLowerCase().includes(searchRight.toLowerCase())
    );
  });

  const renderList = (items, title, search, setSearch) => (
    <Card
      elevation={3}
      sx={{
        borderRadius: 3,
        minHeight: 420,
        display: "flex",
        flexDirection: "column",
        bgcolor: "#f9fafb",
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? "none" : "auto",
      }}
    >
      <CardContent
        sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2 }}
      >
        <Typography
          variant="h6"
          fontWeight={700}
          color="#2d3a4b"
          align="center"
          mb={1}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          {title}
        </Typography>
        <TextField
          label="Search"
          variant="outlined"
          fullWidth
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          margin="dense"
          sx={{ mb: 1, bgcolor: "#f4f6fa", borderRadius: 2 }}
          disabled={disabled}
        />
        <Divider sx={{ mb: 1 }} />
        <List dense sx={{ maxHeight: 260, overflow: "auto", p: 0 }}>
          <AnimatePresence>
            {items.map((item) => (
              <motion.div
                key={getKey(item)}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <ListItem
                  button
                  onClick={handleToggle(getKey(item))}
                  selected={checked.includes(getKey(item))}
                  sx={{
                    borderRadius: 2,
                    mb: 0.5,
                    transition: "background 0.2s",
                    "&:hover": { background: "#e3eafc" },
                    background: checked.includes(getKey(item))
                      ? "#e3f2fd"
                      : "inherit",
                  }}
                  disabled={disabled}
                >
                  <ListItemIcon>
                    <Checkbox
                      checked={checked.includes(getKey(item))}
                      tabIndex={-1}
                      disableRipple
                      sx={{ color: "#3f51b5" }}
                      disabled={disabled}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      item.name || `${item.first_name} ${item.last_name}`
                    }
                    primaryTypographyProps={{ fontWeight: 500 }}
                  />
                </ListItem>
              </motion.div>
            ))}
          </AnimatePresence>
        </List>
      </CardContent>
    </Card>
  );

  return (
    <Grid container spacing={2} justifyContent="center" alignItems="center">
      <Grid item xs={5}>
        {renderList(filteredLeft, leftTitle, searchLeft, setSearchLeft)}
      </Grid>
      <Grid
        item
        xs={2}
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap={2}
      >
        <Button
          variant="contained"
          size="large"
          onClick={moveRight}
          disabled={leftChecked.length === 0 || disabled}
          sx={{
            borderRadius: 2,
            minWidth: 48,
            minHeight: 48,
            mb: 1,
            bgcolor: "#3f51b5",
            color: "#fff",
            "&:hover": { bgcolor: "#303f9f" },
          }}
        >
          <ArrowForward />
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={moveLeft}
          disabled={rightChecked.length === 0 || disabled}
          sx={{
            borderRadius: 2,
            minWidth: 48,
            minHeight: 48,
            bgcolor: "#3f51b5",
            color: "#fff",
            "&:hover": { bgcolor: "#303f9f" },
          }}
        >
          <ArrowBack />
        </Button>
      </Grid>
      <Grid item xs={5}>
        {renderList(filteredRight, rightTitle, searchRight, setSearchRight)}
      </Grid>
    </Grid>
  );
};

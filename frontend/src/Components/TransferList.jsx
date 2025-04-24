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
    TextField
} from "@mui/material";
import { ArrowForward, ArrowBack } from "@mui/icons-material";
import { AnimatePresence, motion } from "framer-motion";
import {useState} from "react";

interface TransferListProps {
    left: { id: string | null; email: string; first_name?: string; last_name?: string; name?: string }[];
    right: { id: string | null; email: string; first_name?: string; last_name?: string; name?: string }[];
    onChange: (newRightIds: string[]) => void;
    leftTitle?: string;
    rightTitle?: string;
}

export const TransferList: React.FC<TransferListProps> = ({
                                                              left,
                                                              right,
                                                              onChange,
                                                              leftTitle = "Available",
                                                              rightTitle = "Selected",
                                                          }) => {
    const [checked, setChecked] = useState([]);
    const [searchLeft, setSearchLeft] = useState("");
    const [searchRight, setSearchRight] = useState("");

    const handleToggle = (id: string) => () => {
        const currentIndex = checked.indexOf(id);
        const newChecked = [...checked];

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
                <Typography variant="h6" className="text-center mb-2">{title}</Typography>
                <TextField
                    label="חיפוש"
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
    );

    return (
        <Grid container spacing={2} justifyContent="center" alignItems="center">
            <Grid item xs={5}>
                {renderList(filteredLeft, leftTitle, searchLeft, setSearchLeft)}
            </Grid>
            <Grid item xs={2} className="flex flex-col items-center justify-center space-y-4">
                <Button
                    variant="outlined"
                    size="small"
                    onClick={moveRight}
                    disabled={leftChecked.length === 0}
                >
                    <ArrowForward />
                </Button>
                <Button
                    variant="outlined"
                    size="small"
                    onClick={moveLeft}
                    disabled={rightChecked.length === 0}
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

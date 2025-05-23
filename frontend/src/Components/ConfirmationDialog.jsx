import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@mui/material';              // ← use MUI Buttons for the same look
import '../CSS/Login.css';                           // ← brings in .login-wrapper & .card
import '../CSS/ConfirmationDialog.css';                   // ← overlay styling

const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {/* overlay */}
            <motion.div
                className="confirmation-dialog-overlay"
                onClick={onClose}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* gradient wrapper just like Login */}
                <motion.div
                    className="login-wrapper"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                >
                    {/* white frosted card */}
                    <div className="card p-4 shadow-sm">
                        <h2 className="text-center mb-4">{title}</h2>
                        <p className="text-center">{message}</p>

                        {/* two buttons side by side */}
                        <div
                            className="d-grid"
                            style={{
                                gridTemplateColumns: '1fr 1fr',
                                gap: '1rem',
                                marginTop: '2rem',
                            }}
                        >
                            <Button variant="outlined" fullWidth onClick={onClose}>
                                Cancel
                            </Button>
                            <Button variant="contained" color="primary" fullWidth onClick={onConfirm}>
                                Confirm
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ConfirmationDialog;

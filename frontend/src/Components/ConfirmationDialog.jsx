import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ConfirmationDialog = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="confirmation-dialog-overlay"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="confirmation-dialog"
          onClick={(e) => e.stopPropagation()}
        >
          <h3>{title}</h3>
          <p>{message}</p>
          <div className="confirmation-buttons">
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button className="confirm-button" onClick={onConfirm}>
              Confirm
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConfirmationDialog; 
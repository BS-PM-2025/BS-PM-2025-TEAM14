// Set up testing environment
import '@testing-library/jest-dom';
import React from 'react';


// If you're using framer-motion, mock it as well
jest.mock('framer-motion', () => {
  return {
    motion: {
      div: ({ children, ...props }) => <div data-testid="motion-div" {...props}>{children}</div>,
      section: ({ children, ...props }) => <section data-testid="motion-section" {...props}>{children}</section>,
      button: ({ children, ...props }) => <button data-testid="motion-button" {...props}>{children}</button>,
      footer: ({ children, ...props }) => <footer data-testid="motion-footer" {...props}>{children}</footer>,
    },
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});
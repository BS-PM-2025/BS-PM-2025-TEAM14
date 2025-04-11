import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navigation from '../Navigation';


describe('Navigation Component', () => {
  test('renders all navigation links', () => {
    render(<Navigation />);
    
    // Check that all expected links exist
    expect(screen.getByText(/home/i)).toBeInTheDocument();
    expect(screen.getByText(/submit a request/i)).toBeInTheDocument();
    expect(screen.getByText(/requests/i)).toBeInTheDocument();
    expect(screen.getByText(/upload files/i)).toBeInTheDocument();
    expect(screen.getByText(/reload files/i)).toBeInTheDocument();
    expect(screen.getByText(/users/i)).toBeInTheDocument();
    expect(screen.getByText(/grades/i)).toBeInTheDocument();
  });

  test('links have correct hrefs', () => {
    render(<Navigation />);
    
    // Check that links have the correct href attributes
    expect(screen.getByText(/home/i).closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText(/submit a request/i).closest('a')).toHaveAttribute('href', '/submit_request');
    expect(screen.getByText(/requests/i).closest('a')).toHaveAttribute('href', '/Requests');
    expect(screen.getByText(/upload files/i).closest('a')).toHaveAttribute('href', '/upload');
    expect(screen.getByText(/reload files/i).closest('a')).toHaveAttribute('href', '/reload');
    expect(screen.getByText(/users/i).closest('a')).toHaveAttribute('href', '/users');
    expect(screen.getByText(/grades/i).closest('a')).toHaveAttribute('href', '/grades');
  });
});
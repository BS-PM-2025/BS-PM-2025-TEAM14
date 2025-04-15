import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Logout from '../Logout';
import { removeToken } from '../../utils/auth';

// Mock the modules we need
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn()
}));

jest.mock('../../utils/auth', () => ({
  removeToken: jest.fn()
}));

describe('Logout Component', () => {
  test('renders logout button', () => {
    render(<Logout />);
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    expect(logoutButton).toBeInTheDocument();
  });

  test('calls removeToken and navigate when clicked', () => {
    const navigate = jest.fn();
    
    // Override the useNavigate mock for this test
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockImplementation(() => navigate);
    
    render(<Logout />);
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    
    fireEvent.click(logoutButton);
    
    expect(removeToken).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
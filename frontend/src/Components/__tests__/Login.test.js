import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Login from '../Login';


// Create a mock for ALL modules that Login imports
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn()
}));

jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn()
}));

jest.mock('../../utils/auth', () => ({
    removeToken: jest.fn()
  }));

describe('Login Component', () => {
  test('renders login form', () => {
    render(<Login />);
    
    // Check for heading
    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(document.getElementById('userId')).toBeInTheDocument();
    expect(document.getElementById('password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });
});

test('calls handleSubmit when login button is clicked', () => {
    // Set up any mocks needed for the form submission
    global.fetch = jest.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ access_token: 'fake-token', message: 'Success' })
      })
    );
    
    const navigate = jest.fn();
    jest.spyOn(require('react-router-dom'), 'useNavigate').mockImplementation(() => navigate);
    
    // Render the component
    render(<Login />);
    
    // Fill in the form
    const emailInput = document.getElementById('userId');
    const passwordInput = document.getElementById('password');
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    // Click the button
    fireEvent.click(loginButton);
    
    // Check loading state (synchronous check)
    expect(loginButton).toBeDisabled();
    expect(loginButton.textContent).toBe('Logging in...');
  });
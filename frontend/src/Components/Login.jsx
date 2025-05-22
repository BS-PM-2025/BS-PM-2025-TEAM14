import React, { useState } from 'react';
import { TextField, Button, CircularProgress, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { setToken } from '../utils/auth';
import { jwtDecode } from "jwt-decode";
import { useUser } from './UserContext'; // Import useUser to access the global user context
import '../CSS/Login.css';

const Login = ({ onSuccess, onFailure }) => {
    const { setUserData } = useUser(); // Access setUserData from the UserContext
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const userData = {
        Email: userId,
        Password: password
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:8000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            if (response.ok) {
                const data = await response.json();

                if (data.access_token) {
                    setToken(data.access_token);
                    localStorage.setItem('access_token', data.access_token);

                    const decodedUser = jwtDecode(data.access_token);
                    setUserData(decodedUser); // Update the global user state
                    window.dispatchEvent(new Event('user-changed'));
                    if (onSuccess) onSuccess(decodedUser); // Notify Home component about the login success
                } else {
                    setError('No access token received from server');
                    if (onFailure) onFailure();
                }
            } else {
                const errorData = await response.json();
                setError(errorData.detail || 'Login failed');
                if (onFailure) onFailure();
            }
        } catch (err) {
            console.error(err);
            setError('An error occurred. Please try again.');
            if (onFailure) onFailure();
        }

        setLoading(false);
    };

    return (
        <div className="container mt-5">
            <h2 className="text-center mb-4">Login</h2>
            {error && <p className="text-danger text-center">{error}</p>}
            <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
                <div className="mb-3">
                    <TextField
                        label="Email"
                        id="userId"
                        variant="outlined"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        required
                        fullWidth
                    />
                </div>
                <div className="mb-3">
                    <TextField
                        label="Password"
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        variant="outlined"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        fullWidth
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        edge="end"
                                    >
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                </div>
                <div className="d-grid">
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Login'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default Login;

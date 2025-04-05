import React, { useState } from 'react';


const Login = () => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(null);

    const userData = {
        Email: userId,
        Password: password
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent default form submission behavior
        setLoading(true);
        setError(null);
        setSuccess(null);

        console.log("login");
        console.log(userData);

        try {
            // Replace with your backend login endpoint URL
            const response = await fetch('http://localhost:8000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('access_token', data.access_token);
                console.log("Login successful:", data.message);
                setSuccess(data.message);
            } else {
                const errorData = await response.json();
                setError(errorData.detail /*|| 'Login failed'*/);
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
            console.error(err);
        }
        setLoading(false);
    };

    return (
        <div className="container mt-5">
        <h2 className="text-center mb-4">Login</h2>
            {error && <p className="text-danger text-center">{error}</p>}
            {success && <p className="text-success text-center">{success}</p>}
            <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
                <div className="mb-3">
                    <label htmlFor="username" className="form-label">Email:</label>
                    <input
                        type="text"
                        id="userId"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        className="form-control"
                        required
                    />
                </div>
                <div className="mb-3">
                    <label htmlFor="password" className="form-label">Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="form-control"
                        required
                    />
                </div>
                <div className="d-grid">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </div>
            </form>
    </div>)
};

export default Login
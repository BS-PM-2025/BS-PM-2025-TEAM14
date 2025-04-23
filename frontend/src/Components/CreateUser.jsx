import React, { useState } from "react";

const CreateUser = () => {
    const [firstName, setFirstName] = useState("");  // Added firstName state
    const [lastName, setLastName] = useState("");    // Added lastName state
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        const userData = {
            first_name: firstName,   // Sending firstName instead of username
            last_name: lastName,     // Sending lastName
            email,
            password,
            role,
        };

        try {
            const response = await fetch("http://localhost:8000/create_user", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(userData),
            });
            console.log("send to the server", response)

            if (response.ok) {
                const data = await response.json();
                console.log("User created successfully", data);
            } else {
                console.log("Error creating user");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    };

    return (
        <div>
            <h2>Create User</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>First Name:</label>
                    <input
                        type="text"
                        value={firstName}  // Binding firstName state
                        onChange={(e) => setFirstName(e.target.value)}  // Updating firstName state
                        required
                    />
                </div>
                <div>
                    <label>Last Name:</label>
                    <input
                        type="text"
                        value={lastName}  // Binding lastName state
                        onChange={(e) => setLastName(e.target.value)}  // Updating lastName state
                        required
                    />
                </div>
                <div>
                    <label>Email:</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Password:</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Role:</label>
                    <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Create User</button>
            </form>
        </div>
    );
};

export default CreateUser;

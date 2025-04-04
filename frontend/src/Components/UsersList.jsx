import { useEffect, useState } from "react";
import "../CSS/UsersList.css";

export default function UsersList() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newRole, setNewRole] = useState("");

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await fetch("http://localhost:8000/Users/getUsers", {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            if (!response.ok) throw new Error("Failed to fetch users");
            const data = await response.json();
            setUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserDetails = async (userId) => {
        try {
            const response = await fetch(`http://localhost:8000/Users/getUser/${userId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" }
            });
            if (!response.ok) throw new Error("User not found.");
            const data = await response.json();
            setSelectedUser(data);
            setNewRole(data.role); // Set initial role selection
        } catch (error) {
            console.error("Error fetching user details:", error);
        }
    };

    const handleUserClick = (userId) => {
        fetchUserDetails(userId);
    };

    const handleClosePopup = () => {
        setSelectedUser(null);
    };

    const handleRoleChange = async () => {
        try {
            const response = await fetch("http://localhost:8000/Users/setRole", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ UserId: selectedUser.id, role: newRole })
            });
            if (!response.ok) throw new Error("Failed to update role.");
            alert("User role updated successfully!");
            fetchUsers(); // Refresh users list
            handleClosePopup();
        } catch (error) {
            console.error("Error updating role:", error);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    return (
        <div className="users-container">
            <h2 className="users-title">Users List</h2>
            <button onClick={fetchUsers} disabled={loading} className="refresh-button">
                {loading ? "Loading..." : "Refresh Users"}
            </button>
            <table className="users-table">
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Role</th>
                </tr>
                </thead>
                <tbody>
                {users.length > 0 ? (
                    users.map(user => (
                        <tr key={user.id} className="clickable-row" onClick={() => handleUserClick(user.id)}>
                            <td>{user.id}</td>
                            <td>{user.username}</td>
                            <td>{user.email}</td>
                            <td>{user.role}</td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={4} className="no-users">No users found</td>
                    </tr>
                )}
                </tbody>
            </table>

            {selectedUser && (
                <div className="popup">
                    <div className="popup-content">
                        <button className="close-button" onClick={handleClosePopup}>×</button>
                        <h3>User Details</h3>
                        <p><strong>ID:</strong> {selectedUser.id}</p>
                        <p><strong>Username:</strong> {selectedUser.username}</p>
                        <p><strong>Email:</strong> {selectedUser.email}</p>
                        <p><strong>Role:</strong>
                            <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                                <option value="admin">Admin</option>
                                <option value="professor">Professor</option>
                                <option value="student">Student</option>
                                <option value="secretary">Secretary</option>
                            </select>
                        </p>
                        <button className="update-role-button" onClick={handleRoleChange}>Update Role</button>
                    </div>
                </div>
            )}
        </div>
    );
}

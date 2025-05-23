import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
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

    const fetchUserDetails = async (UserEmail) => {
        try {
            const response = await fetch(`http://localhost:8000/Users/getUser/${UserEmail}`, {
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

    const handleUserClick = (UserEmail) => {
        fetchUserDetails(UserEmail);
    };

    const handleClosePopup = () => {
        setSelectedUser(null);
    };

    const handleRoleChange = async () => {
        try {
            const response = await fetch("http://localhost:8000/Users/setRole", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ UserEmail: selectedUser.email, role: newRole })
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
            <h1 className="users-title"><strong>Users List</strong></h1>
            <button onClick={fetchUsers} disabled={loading} className="refresh-button">
                {loading ? "Loading..." : "Refresh Users"}
            </button>
            <table className="users-table">
                <thead>
                <tr>
                    <th>Email</th>
                    <th>First Name</th>
                    <th>Last Name</th>
                    <th>Role</th>
                    <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {users.length > 0 ? (
                    users.map(user => (
                        <tr key={user.email} className="clickable-row" onClick={() => handleUserClick(user.email)}>
                            <td>{user.email}</td>
                            <td>{user.first_name}</td>
                            <td>{user.last_name}</td>
                            <td>{user.role}</td>
                            <td>
                                <button
                                    className="delete-button"
                                    onClick={(e) => (console.log("Delete user:", user.email), e.stopPropagation())}
                                    title="Delete user"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </td>
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
                        <p><strong>Email:</strong> {selectedUser.email}</p>
                        <p><strong>ID:</strong> {selectedUser.id}</p>
                        <p><strong>First Name:</strong> {selectedUser.first_name}</p>
                        <p><strong>Last Name:</strong> {selectedUser.last_name}</p>
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

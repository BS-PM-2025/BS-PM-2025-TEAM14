import { useEffect, useState } from "react";

export default function UserDetails({ UserEmail }) {
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:8000/Users/getUser/${UserEmail}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );
        if (!response.ok) throw new Error("User not found.");
        const data = await response.json();
        setUserDetails(data);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [UserEmail]);

  if (loading) return <p>Loading user details...</p>;
  if (!userDetails) return <p>User not found.</p>;

  return (
    <div className="user-details-card">
      <h3>User Details</h3>
      <p>
        <strong>ID:</strong> {userDetails.id}
      </p>
      <p>
        <strong>First Name:</strong> {userDetails.first_name}
      </p>
      <p>
        <strong>Last Name:</strong> {userDetails.last_name}
      </p>
      <p>
        <strong>Email:</strong> {userDetails.email}
      </p>
      <p>
        <strong>Role:</strong> {userDetails.role}
      </p>

      {/* Role-specific details */}
      {userDetails.student_data && (
        <>
          <h4>Student Info</h4>
          <p>
            <strong>Major:</strong> {userDetails.student_data.major}
          </p>
          <p>
            <strong>Graduation Year:</strong>{" "}
            {userDetails.student_data.graduation_year}
          </p>
        </>
      )}

      {userDetails.professor_data && (
        <>
          <h4>Professor Info</h4>
          <p>
            <strong>Department:</strong> {userDetails.professor_data.department}
          </p>
          <p>
            <strong>Office Number:</strong>{" "}
            {userDetails.professor_data.office_number}
          </p>
        </>
      )}
    </div>
  );
}

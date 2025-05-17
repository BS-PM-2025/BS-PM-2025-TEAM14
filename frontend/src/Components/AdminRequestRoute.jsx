import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../CSS/AdminRequestRoute.css";
import { API_URL } from "../api";

const AdminRequestRoute = () => {
  const [routingRules, setRoutingRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRoutingRules();
  }, []);

  const fetchRoutingRules = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/request_routing_rules`);
      setRoutingRules(response.data);
      setLoading(false);
    } catch (err) {
      setError("Failed to fetch routing rules");
      setLoading(false);
    }
  };

  const handleDestinationChange = async (type, newDestination) => {
    try {
      await axios.put(`${API_URL}/api/request_routing_rules/${type}`, {
        destination: newDestination,
      });
      // Refresh the rules after update
      fetchRoutingRules();
    } catch (err) {
      setError("Failed to update routing rule");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="admin-request-route">
      <h2>Request Routing Rules</h2>
      <div className="routing-rules-container">
        {routingRules.map((rule) => (
          <div key={rule.type} className="routing-rule-card">
            <h3>{rule.type}</h3>
            <div className="destination-selector">
              <label>Destination:</label>
              <select
                value={rule.destination}
                onChange={(e) =>
                  handleDestinationChange(rule.type, e.target.value)
                }
              >
                <option value="secretary">Secretary</option>
                <option value="lecturer">Lecturer</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminRequestRoute;

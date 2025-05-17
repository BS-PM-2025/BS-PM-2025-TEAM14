import axios from "axios";

export const API_URL = "http://localhost:8000";

export const fetchDatabases = async () => {
  const response = await axios.get(`${API_URL}/databases`);
  return response.data;
};

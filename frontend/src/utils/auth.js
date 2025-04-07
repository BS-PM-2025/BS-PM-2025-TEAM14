import { jwtDecode } from 'jwt-decode';

// Get the token from localStorage
export const getToken = () => {
  const token = localStorage.getItem('access_token');
  console.log("getToken called, token:", token ? "exists" : "not found");
  return token;
};

// Set the token in localStorage
export const setToken = (token) => {
  console.log("setToken called with token:", token ? "exists" : "not found");
  localStorage.setItem('access_token', token);
};

// Remove the token from localStorage
export const removeToken = () => {
  console.log("removeToken called");
  localStorage.removeItem('access_token');
};

// Check if the token is valid (not expired)
export const isTokenValid = () => {
  const token = getToken();
  if (!token) return false;
  
  try {
    const decoded = jwtDecode(token);
    const currentTime = Date.now() / 1000;
    const isValid = decoded.exp > currentTime;
    console.log("isTokenValid:", isValid, "exp:", decoded.exp, "current:", currentTime);
    return isValid;
  } catch (error) {
    console.error('Error decoding token:', error);
    return false;
  }
};

// Get user information from the token
export const getUserFromToken = (token = null) => {
  const tokenToDecode = token || getToken();
  if (!tokenToDecode) return null;
  
  try {
    const decoded = jwtDecode(tokenToDecode);
    console.log("Decoded token data:", decoded);
    return decoded;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Check if the user has a specific role
export const hasRole = (role) => {
  const user = getUserFromToken();
  const hasRole = user && user.role === role;
  console.log("hasRole check for", role, ":", hasRole);
  return hasRole;
}; 
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (token && token !== "undefined" && token !== "null") {
      // Set both axios defaults and ensure consistency
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setIsAuthenticated(true);
      if (userData) {
        setUser(JSON.parse(userData));
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      const response = await axios.post("http://localhost:3001/api/auth/login", credentials);
      // Access the nested data structure
      const { accessToken, refreshToken, user } = response.data.data;

      // Validate token exists
      if (!accessToken) {
        throw new Error("No access token received from server");
      }

      // Store tokens
      localStorage.setItem("token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));

      // Set axios default header for any direct axios usage
      axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

      setIsAuthenticated(true);
      setUser(user);

      console.log("Login successful - Token stored:", accessToken.substring(0, 10) + "...");

      return response.data;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    setIsAuthenticated(false);
    setUser(null);
  };

  // Helper function to get current token
  const getToken = () => {
    return localStorage.getItem("token");
  };

  // Helper function to check if token exists
  const hasValidToken = () => {
    const token = localStorage.getItem("token");
    return token && token !== "undefined" && token !== "null";
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      user,
      login,
      logout,
      getToken,
      hasValidToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};
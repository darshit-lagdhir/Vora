import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/apiClient.js';

// Instantiate the master React Context
const AuthContext = createContext(undefined);

/**
 * Helper to normalize and unify user profile keys on the frontend.
 * Ensures both camelCase and snake_case copies of names and role contexts exist.
 */
const formatUser = (userData) => {
  if (!userData) return null;
  return {
    ...userData,
    role: userData.role || userData.platform_role,
    platform_role: userData.platform_role || userData.role,
    firstName: userData.firstName || userData.first_name,
    first_name: userData.first_name || userData.firstName,
    lastName: userData.lastName || userData.last_name,
    last_name: userData.last_name || userData.lastName,
  };
};

/**
 * Authentication Context Provider Component.
 * Encapsulates application tree and broadcasts the user profile, session state, and auth actions.
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null); // Stores the active JWT string
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Session Hydration on component mounting
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // Attempt to hydrate user profile directly from backend database
          const response = await apiClient.get('/api/v1/auth/me');
          const dataObj = response.data?.data || response.data;
          const userData = dataObj?.user || dataObj;
          
          setSession(token);
          setUser(formatUser(userData));
        }
      } catch (err) {
        console.error('[Auth Context] Failed to hydrate initial authentication session:', err);
        // Clean up invalid session token from local storage
        try {
          localStorage.removeItem('token');
        } catch (storageErr) {
          console.error('[Auth Context] Local storage cleanup failed:', storageErr);
        }
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Action Wrapper: Login
   * Invokes credentials validation against the backend API login endpoint.
   */
  const login = async (email, password) => {
    try {
      const response = await apiClient.post('/api/v1/auth/login', { email, password });
      const dataObj = response.data?.data || response.data;
      const { user: userData } = dataObj;
      
      localStorage.setItem('token', 'true');
      setSession('true');
      setUser(formatUser(userData));
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Login failed';
      throw new Error(errorMessage);
    }
  };

  /**
   * Action Wrapper: Register
   * Initiates account registration on backend API, setting platform role and user details.
   */
  const register = async (email, password, firstName, lastName, role) => {
    try {
      const response = await apiClient.post('/api/v1/auth/register', {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        platform_role: role,
      });
      const dataObj = response.data?.data || response.data;
      const { user: userData } = dataObj;
      
      localStorage.setItem('token', 'true');
      setSession('true');
      setUser(formatUser(userData));
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      throw new Error(errorMessage);
    }
  };

  /**
   * Action Wrapper: Logout
   * Terminate active user sessions, purge cache and reset local states.
   */
  const logout = async () => {
    try {
      // Gracefully notify backend of active session teardown
      await apiClient.post('/api/v1/auth/logout').catch(() => {});
    } catch (err) {
      // Silently catch connection failures on logout teardown
    } finally {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('vora_jwt_token');
      } catch (storageErr) {
        console.error('[Auth Context] Local storage cleanup failed:', storageErr);
      }
      setUser(null);
      setSession(null);
    }
  };

  const setUserData = (userData, newToken = null) => {
    if (newToken) {
      localStorage.setItem('token', 'true');
      localStorage.setItem('vora_jwt_token', 'true');
      setSession('true');
    }
    setUser(formatUser(userData));
  };

  const contextValue = {
    user,
    session,
    isLoading,
    login,
    register,
    logout,
    setUserData,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom React hook to consume authentication contexts safely.
 * Throws a descriptive developer runtime error if used outside boundary providers.
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider context boundary.');
  }
  return context;
};

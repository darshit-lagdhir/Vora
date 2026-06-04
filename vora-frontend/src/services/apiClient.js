import axios from 'axios';

// Create a custom Axios instance pointing to the Express backend API server
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Outbound request interceptor: automatically fetch and attach the local JWT token
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        // Formulate and inject the Bearer token authorization header
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.error('[Network Engine] Failed to retrieve local storage token:', err);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Inbound response interceptor: monitor for cryptographic 401/403 violations
apiClient.interceptors.response.use(
  (response) => {
    // Pass standard successful data packets directly
    return response;
  },
  (error) => {
    const responseStatus = error.response?.status;

    if (responseStatus === 401) {
      console.warn('[Network Engine] 401 Unauthorized encountered. Clearing local session...');
      try {
        localStorage.removeItem('token');
      } catch (err) {
        console.error('[Network Engine] Error removing token from local storage:', err);
      }
      
      // Perform a hard redirection to the authentication gateway login screen
      if (typeof window !== 'undefined' && window.location.pathname !== '/auth') {
        window.location.href = '/auth?expired=true';
      }
    } else if (responseStatus === 403) {
      console.error('[Network Engine] 403 Forbidden. Access to this endpoint is restricted.');
      error.message = 'Access Denied: You do not possess the required permissions.';
    }

    return Promise.reject(error);
  }
);

export default apiClient;

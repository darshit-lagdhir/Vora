import axios from 'axios';
import { useState, useEffect } from 'react';

// Create a custom Axios instance pointing to the Express backend API server
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Outbound request interceptor: local session token loading
apiClient.interceptors.request.use(
  (config) => {
    // JWT Session Token Loading
    try {
      const token = localStorage.getItem('token');
      // Only attach Authorization header if token is an actual JWT string, not the placeholder 'true'
      if (token && token !== 'true') {
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

// Inbound response interceptor: monitor auth violations, retry timeouts, and emit signals
apiClient.interceptors.response.use(
  (response) => {
    // Reset connection retry indicators on success
    const config = response.config;
    if (config && config.url) {
      window.dispatchEvent(new CustomEvent('vora-retry-status', {
        detail: { url: config.url, attempt: 0, max: 3, status: 'resolved' }
      }));
    }
    return response;
  },
  async (error) => {
    const responseStatus = error.response?.status;
    const config = error.config;

    // 1. Cryptographic session expiration (401) and redirect
    if (responseStatus === 401) {
      console.warn('[Network Engine] 401 Unauthorized encountered. Clearing local session...');
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('vora_jwt_token');
      } catch (err) {
        console.error('[Network Engine] Error removing token from local storage:', err);
      }
      
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        const isPublic =
          path === '/' ||
          path === '/auth' ||
          path === '/onboarding' ||
          (path.startsWith('/event/') && !path.endsWith('/live') && !path.endsWith('/vault'));

        if (!isPublic) {
          window.location.href = '/auth?expired=true';
        }
      }
      return Promise.reject(error);
    }

    // 2. Cryptographic forbidden routing (403) toast emission
    if (responseStatus === 403) {
      console.error('[Network Engine] 403 Forbidden. Access restricted.');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vora-toast', { 
          detail: { 
            message: 'You do not have permission to perform this action.',
            type: 'error'
          } 
        }));
      }
      error.message = 'Access Denied: You do not possess the required permissions.';
      return Promise.reject(error);
    }

    // 3. Automated Reconnecting Retry state machine (503, 504, or offline connectivity loss)
    const isRetryable = !responseStatus || responseStatus === 503 || responseStatus === 504;

    if (config && isRetryable) {
      config.__retryCount = config.__retryCount || 0;

      if (config.__retryCount < 3) {
        config.__retryCount += 1;

        // Dispatch background reconnection status to local components
        window.dispatchEvent(new CustomEvent('vora-retry-status', {
          detail: { 
            url: config.url, 
            attempt: config.__retryCount, 
            max: 3, 
            status: 'retrying' 
          }
        }));

        // Exponential backoff delay with random jitter (2^(attempt - 1) * 1000ms + random noise)
        const backoffDelay = Math.pow(2, config.__retryCount - 1) * 1000 + Math.random() * 200;
        console.warn(`[Network Engine] Request failed. Retrying in ${Math.round(backoffDelay)}ms (Attempt ${config.__retryCount}/3)...`);

        await new Promise(resolve => setTimeout(resolve, backoffDelay));

        // Re-execute request with exact configuration
        return apiClient(config);
      } else {
        // Dispatched once retry threshold has exhausted completely
        window.dispatchEvent(new CustomEvent('vora-retry-status', {
          detail: { url: config.url, attempt: 3, max: 3, status: 'failed' }
        }));

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('vora-toast', {
            detail: {
              message: 'Database query failed after multiple reconnection attempts.',
              type: 'error'
            }
          }));
        }
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Custom React hook to monitor API endpoint retry statuses.
 * Enables views to render reconnection spinners dynamically.
 */
export function useRetryState(endpointKeyword) {
  const [retry, setRetry] = useState({ attempt: 0, max: 3, status: 'idle' });

  useEffect(() => {
    const handleStatus = (e) => {
      const { url, attempt, max, status } = e.detail || {};
      if (url && url.includes(endpointKeyword)) {
        setRetry({ attempt, max, status });
      }
    };

    window.addEventListener('vora-retry-status', handleStatus);
    return () => window.removeEventListener('vora-retry-status', handleStatus);
  }, [endpointKeyword]);

  return retry;
}

export default apiClient;

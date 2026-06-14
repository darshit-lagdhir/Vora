import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import apiClient from '../services/apiClient.js';

/**
 * Custom hook for ETag-aware REST polling.
 * Minimizes bandwidth and React render cycles by intercepting 304 Not Modified.
 */
export default function useETagPolling(url, intervalMs = 5000, options = {}) {
  const [data, setData] = useState(options.initialData || null);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [error, setError] = useState(null);

  const etagRef = useRef(null);
  const timerRef = useRef(null);
  const cancelTokenRef = useRef(null);

  const poll = async (isManual = false) => {
    if (!url) return;

    // Cancel any in-flight request for this poll hook
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('Stale poll request cancelled.');
    }
    cancelTokenRef.current = axios.CancelToken.source();

    setIsRevalidating(true);

    try {
      const headers = {
        'Accept': 'application/json',
      };

      if (etagRef.current) {
        headers['If-None-Match'] = etagRef.current;
      }

      const response = await apiClient.get(url, {
        headers,
        cancelToken: cancelTokenRef.current.token,
        validateStatus: (status) => status === 200 || status === 304,
        ...options.axiosConfig,
      });

      if (response.status === 304) {
        // Data has not mutated. Bypasses React state updates entirely.
        if (options.onNotModified) {
          options.onNotModified();
        }
      } else if (response.status === 200) {
        const newData = response.data;
        const newEtag = response.headers.etag || response.headers.ETag;

        if (newEtag) {
          etagRef.current = newEtag;
        }

        // Deep equality check or change detection to trigger reconciliation animation
        const isFirstLoad = data === null;
        const stringifiedOld = JSON.stringify(data);
        const stringifiedNew = JSON.stringify(newData);

        if (isFirstLoad || stringifiedOld !== stringifiedNew) {
          setData(newData);
          if (options.onDataReconciled && !isFirstLoad) {
            options.onDataReconciled(newData, data);
          }
        }
      }

      setError(null);
    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error(`[ETag Polling] Error fetching ${url}:`, err);
        setError(err);
      }
    } finally {
      setIsRevalidating(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    poll();

    // Start polling interval
    timerRef.current = setInterval(() => {
      poll();
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (cancelTokenRef.current) cancelTokenRef.current.cancel('Polling hook unmounted.');
    };
  }, [url, intervalMs]);

  return {
    data,
    isRevalidating,
    error,
    refetch: () => poll(true)
  };
}

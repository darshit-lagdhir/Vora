import { useState, useEffect, useRef } from 'react';

/**
 * Custom React hook for Server-Sent Events (SSE) Unidirectional real-time sync.
 * Falls back to REST/polling updates upon degradation, and executes state reconciliation on recovery.
 *
 * @param {string} eventId - Target event ID
 * @param {function} onReconcile - Asynchronous function to fetch fresh snapshot on reconnection
 */
export default function useRealTimeSync(eventId, onReconcile) {
  const [syncState, setSyncState] = useState('CONNECTING'); // CONNECTING | CONNECTED | RECONNECTING
  const [activePoll, setActivePoll] = useState(null);
  const [presenceList, setPresenceList] = useState([]);
  const [globalOverride, setGlobalOverride] = useState(null);
  const [isReconciling, setIsReconciling] = useState(false);

  const wasDisconnected = useRef(false);
  const onReconcileRef = useRef(onReconcile);

  // Keep callback ref fresh
  useEffect(() => {
    onReconcileRef.current = onReconcile;
  }, [onReconcile]);

  useEffect(() => {
    if (!eventId) return;

    let eventSource = null;
    let reconnectTimeout = null;

    const connect = () => {
      const token = localStorage.getItem('token');
      // Append token as query parameter for native EventSource authorization
      const url = `/api/v1/events/${eventId}/stream` + (token ? `?token=${encodeURIComponent(token)}` : '');

      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setSyncState('CONNECTED');
        if (wasDisconnected.current) {
          setIsReconciling(true);
          if (onReconcileRef.current) {
            onReconcileRef.current()
              .then(() => {
                setIsReconciling(false);
                wasDisconnected.current = false;
              })
              .catch((err) => {
                console.error('[RealTimeSync] Reconciliation error:', err);
                setIsReconciling(false);
              });
          } else {
            setIsReconciling(false);
            wasDisconnected.current = false;
          }
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { eventType, payload } = data;

          switch (eventType) {
            case 'INIT_STATE':
              setActivePoll(payload.activePoll);
              setPresenceList(payload.presenceList || []);
              setGlobalOverride(payload.globalOverride);
              break;
            case 'PRESENCE_UPDATE':
              setPresenceList(payload || []);
              break;
            case 'POLL_LAUNCHED':
              setActivePoll(payload);
              break;
            case 'POLL_UPDATED':
              setActivePoll(payload);
              break;
            case 'POLL_TERMINATED':
              setActivePoll(null);
              break;
            case 'GLOBAL_OVERRIDE':
              setGlobalOverride(payload);
              break;
            case 'REVOKE_OVERRIDE':
              setGlobalOverride(null);
              break;
            default:
              break;
          }
        } catch (err) {
          console.warn('[RealTimeSync] Failed to parse message event payload:', err);
        }
      };

      eventSource.onerror = () => {
        setSyncState('RECONNECTING');
        wasDisconnected.current = true;
        eventSource.close();

        // Native EventSource automatically retries, but we enforce manual rebuild if needed
        reconnectTimeout = setTimeout(() => {
          connect();
        }, 5000);
      };
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [eventId]);

  return {
    syncState,
    activePoll,
    presenceList,
    globalOverride,
    isReconciling
  };
}

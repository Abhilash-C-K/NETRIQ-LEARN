import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export const useWebSocket = () => {
  const { accessToken, isAuthenticated } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const wsRef = useRef(null);
  const listenersRef = useRef(new Map());

  const subscribe = useCallback((eventType, callback) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType).add(callback);

    return () => {
      const set = listenersRef.current.get(eventType);
      if (set) {
        set.delete(callback);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      if (wsRef.current) {
        wsRef.current.close();
      }
      setConnectionStatus('disconnected');
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    setConnectionStatus('connecting');
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Connected. Sending auth handshake frame...');
      // 5-second mandatory backend initial auth handshake sequence
      ws.send(
        JSON.stringify({
          type: 'auth',
          token: accessToken,
        })
      );
      setConnectionStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const eventType = data.event_type || data.type;
        const payload = data.payload || data;

        const callbacks = listenersRef.current.get(eventType);
        if (callbacks) {
          callbacks.forEach((cb) => cb(payload));
        }

        // Also emit to wildcards
        const wildcardCallbacks = listenersRef.current.get('*');
        if (wildcardCallbacks) {
          wildcardCallbacks.forEach((cb) => cb(data));
        }
      } catch (err) {
        console.warn('[WebSocket] Error parsing message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Connection error:', error);
      setConnectionStatus('error');
    };

    ws.onclose = () => {
      console.log('[WebSocket] Disconnected.');
      setConnectionStatus('disconnected');
    };

    return () => {
      ws.close();
    };
  }, [isAuthenticated, accessToken]);

  return {
    connectionStatus,
    subscribe,
  };
};

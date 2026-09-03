import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

export const useWebSocket = (customPath = '/ws') => {
  const { accessToken, isAuthenticated } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const listenersRef = useRef(new Map());
  const reconnectTimerRef = useRef(null);

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

    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}${customPath}`;

      setConnectionStatus('connecting');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        console.log('[WebSocket] Connected. Sending auth handshake frame...');
        ws.send(
          JSON.stringify({
            type: 'auth',
            token: accessToken,
          })
        );
        setConnectionStatus('connected');
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);

          const eventType = data.event_type || data.type;
          const payload = data.payload || data;

          const callbacks = listenersRef.current.get(eventType);
          if (callbacks) {
            callbacks.forEach((cb) => cb(payload));
          }

          const wildcardCallbacks = listenersRef.current.get('*');
          if (wildcardCallbacks) {
            wildcardCallbacks.forEach((cb) => cb(data));
          }
        } catch (err) {
          console.warn('[WebSocket] Error parsing message:', err);
        }
      };

      ws.onerror = (error) => {
        if (!isMounted) return;
        console.error('[WebSocket] Connection error:', error);
        setConnectionStatus('error');
      };

      ws.onclose = (event) => {
        if (!isMounted) return;
        console.log('[WebSocket] Disconnected. Will retry reconnection in 3s...');
        setConnectionStatus('disconnected');

        // Schedule auto-reconnect retry after 3 seconds
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          if (isMounted && isAuthenticated && accessToken) {
            connect();
          }
        }, 3000);
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isAuthenticated, accessToken, customPath]);

  return {
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    lastMessage,
    subscribe,
  };
};

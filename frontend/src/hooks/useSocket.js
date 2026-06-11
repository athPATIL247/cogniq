// filename: frontend/src/hooks/useSocket.js
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef(null);
  const handlersRef = useRef({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('tp_access_token');

    const socket = io(SOCKET_URL, {
      query: { role: 'analyst' },
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => {
      console.warn('[useSocket] Connection error:', err.message);
      setConnected(false);
    });

    const proxyHandler = (event) => (...args) => {
      const handlers = handlersRef.current[event];
      if (handlers) handlers.forEach((h) => h(...args));
    };

    const knownEvents = ['risk:new_event', 'risk:alert_created', 'risk:alert_updated'];
    knownEvents.forEach((event) => socket.on(event, proxyHandler(event)));

    return () => socket.disconnect();
  }, []);

  const on = useCallback((event, handler) => {
    if (!handlersRef.current[event]) {
      handlersRef.current[event] = new Set();
    }
    handlersRef.current[event].add(handler);
    return () => handlersRef.current[event]?.delete(handler);
  }, []);

  const off = useCallback((event, handler) => {
    handlersRef.current[event]?.delete(handler);
  }, []);

  return { on, off, connected };
}

export default useSocket;

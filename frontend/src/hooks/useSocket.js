import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

export function useSocket({ onHazardUpdated, onAutoRerouted, onHazardWarning, onHazardCleared }) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  // Store callbacks in ref to always invoke latest version without socket reconnect
  const callbacksRef = useRef({ onHazardUpdated, onAutoRerouted, onHazardWarning, onHazardCleared });
  useEffect(() => {
    callbacksRef.current = { onHazardUpdated, onAutoRerouted, onHazardWarning, onHazardCleared };
  });

  useEffect(() => {
    // Connect to server (using current host via Vite proxy or fallback)
    const socket = io('/', {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to NaviHazard Real-Time Socket.IO server:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('hazard_updated', (data) => {
      if (callbacksRef.current.onHazardUpdated) {
        callbacksRef.current.onHazardUpdated(data);
      }
    });

    socket.on('route_auto_rerouted', (data) => {
      console.log('Automatic rerouting triggered by backend:', data);
      if (callbacksRef.current.onAutoRerouted) {
        callbacksRef.current.onAutoRerouted(data);
      }
    });

    socket.on('route_hazard_warning', (data) => {
      if (callbacksRef.current.onHazardWarning) {
        callbacksRef.current.onHazardWarning(data);
      }
    });

    socket.on('hazard_cleared_on_route', (data) => {
      if (callbacksRef.current.onHazardCleared) {
        callbacksRef.current.onHazardCleared(data);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const startActiveNavigation = useCallback((data) => {
    if (socketRef.current) {
      socketRef.current.emit('start_navigation', data);
    }
  }, []);

  const updateActiveLocation = useCallback((currentLocation) => {
    if (socketRef.current) {
      socketRef.current.emit('update_location', { currentLocation });
    }
  }, []);

  const stopActiveNavigation = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('stop_navigation');
    }
  }, []);

  return {
    isConnected,
    startActiveNavigation,
    updateActiveLocation,
    stopActiveNavigation
  };
}

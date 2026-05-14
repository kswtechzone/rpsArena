'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

let socketInstance = null;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!socketInstance) {
      socketInstance = io({
        path: '/api/socket',
        transports: ['websocket', 'polling'],
      });
    }

    socketRef.current = socketInstance;
    const socket = socketInstance;

    if (socket.connected) {
      setIsConnected(true);
      setSocketId(socket.id);
    }

    socket.on('connect', () => {
      setIsConnected(true);
      setSocketId(socket.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      setSocketId(null);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    socketId,
    emit,
    on,
    off,
  };
}

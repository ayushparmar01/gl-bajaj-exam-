import { io } from 'socket.io-client';

const defaultBase = import.meta.env.PROD ? '' : 'http://localhost:5000';
const RAW_URL = (import.meta.env.VITE_API_URL || defaultBase).replace(/\/api\/?$/, '');
const SOCKET_BASE_URL = RAW_URL || window.location.origin;

let socketInstance = null;

/**
 * Get or initialize the singleton Socket.io client connected to /proctor namespace with JWT auth
 */
export const getProctorSocket = () => {
  const token = localStorage.getItem('exampro_token');

  if (!socketInstance) {
    socketInstance = io(`${SOCKET_BASE_URL}/proctor`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    socketInstance.on('connect', () => {
      console.log('⚡ Authenticated Proctor Socket connected:', socketInstance.id);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('Proctor Socket authentication/connection notice:', err.message);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Proctor Socket disconnected:', reason);
    });
  } else {
    // Keep auth token fresh
    socketInstance.auth = { token };
  }

  return socketInstance;
};

/**
 * Safely disconnect and reset socket singleton
 */
export const disconnectProctorSocket = () => {
  if (socketInstance) {
    try {
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
    } catch (e) {
      console.warn('Error disconnecting proctor socket:', e);
    }
    socketInstance = null;
  }
};


import { io, Socket } from 'socket.io-client';
import { getToken } from './authService';

let socket: Socket | null = null;

export const initializeSocket = () => {
  const token = getToken();
  
  if (!socket && token) {
    socket = io('http://localhost:5000', {
      auth: {
        token
      },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    console.log('Socket inicializado');

    socket.on('connect', () => {
      console.log('Conectado al servidor de WebSockets');
    });

    socket.on('disconnect', () => {
      console.log('Desconectado del servidor de WebSockets');
    });

    socket.on('connect_error', (error) => {
      console.error('Error de conexión del socket:', error.message);
    });
    
    socket.on('error', (error) => {
      console.error('Error de socket:', error);
    });
  }

  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket desconectado');
  }
};

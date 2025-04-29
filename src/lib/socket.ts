
import { io, Socket } from 'socket.io-client';
import { getToken } from './authService';

let socket: Socket | null = null;

export const initializeSocket = () => {
  const token = getToken();
  
  if (!socket && token) {
    // Usar la URL del backend de producción
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
    
    // Evento para cuando se reconecta
    socket.on('reconnect', (attempt) => {
      console.log(`Reconectado al servidor después de ${attempt} intentos`);
    });
    
    // Evento para cuando falla la reconexión
    socket.on('reconnect_error', (error) => {
      console.error('Error al intentar reconectar:', error.message);
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

// Función para unirse a salas de chat específicas
export const joinChatRoom = (chatId: string) => {
  const currentSocket = getSocket();
  if (currentSocket) {
    currentSocket.emit('join_chat', { chatId });
    console.log(`Unido a la sala de chat: ${chatId}`);
    return true;
  }
  return false;
};

// Función para enviar mensajes a través del socket
export const sendSocketMessage = (chatId: string, content: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const currentSocket = getSocket();
    if (currentSocket && currentSocket.connected) {
      currentSocket.emit('send_message', { chatId, content });
      console.log(`Mensaje enviado via socket al chat: ${chatId}`);
      resolve(true);
    } else {
      console.error('Socket no conectado, no se pudo enviar el mensaje');
      resolve(false);
    }
  });
};

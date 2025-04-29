
/**
 * Servicio de Chat
 * 
 * Este servicio proporciona funcionalidades temporales para la gestión de chats
 * mientras se implementa un backend personalizado.
 */

import { ChatType, MessageType, ChatParticipant } from "@/contexts/ChatContext";

// Mock de usuarios para mostrar nombres en los chats
const MOCK_USERS: Record<string, {name: string, photoURL: string, role: string}> = {
  "user1": { name: "Juan Pérez", photoURL: "", role: "freelancer" },
  "user2": { name: "Ana López", photoURL: "", role: "client" },
  "user3": { name: "Empresa ABC", photoURL: "", role: "client" },
};

// Estado local para los chats (simula una base de datos)
let CHATS: ChatType[] = [
  {
    id: "chat1",
    name: "",
    participants: [
      { id: "user1", name: "Juan Pérez", photoURL: "", isOnline: true },
      { id: "user3", name: "Empresa ABC", photoURL: "", isOnline: false }
    ],
    messages: [
      {
        id: "msg1",
        senderId: "user3",
        content: "Hola, me interesa tu perfil para un proyecto",
        timestamp: Date.now() - 86400000 // 1 día atrás
      },
      {
        id: "msg2",
        senderId: "user1",
        content: "Hola, gracias por contactarme. Cuéntame más sobre el proyecto.",
        timestamp: Date.now() - 86400000 + 3600000 // 1 día atrás + 1 hora
      }
    ],
    isGroup: false,
    lastMessage: {
      id: "msg2",
      senderId: "user1",
      content: "Hola, gracias por contactarme. Cuéntame más sobre el proyecto.",
      timestamp: Date.now() - 86400000 + 3600000
    }
  },
  {
    id: "chat2",
    name: "Proyecto Web App",
    participants: [
      { id: "user1", name: "Juan Pérez", photoURL: "", isOnline: true },
      { id: "user2", name: "Ana López", photoURL: "", isOnline: false },
      { id: "user3", name: "Empresa ABC", photoURL: "", isOnline: true }
    ],
    messages: [
      {
        id: "msg3",
        senderId: "user3",
        content: "He creado este grupo para coordinar el nuevo proyecto",
        timestamp: Date.now() - 172800000 // 2 días atrás
      },
      {
        id: "msg4",
        senderId: "user2",
        content: "Perfecto, ¿cuándo comenzamos?",
        timestamp: Date.now() - 172800000 + 3600000 // 2 días atrás + 1 hora
      }
    ],
    isGroup: true,
    lastMessage: {
      id: "msg4",
      senderId: "user2",
      content: "Perfecto, ¿cuándo comenzamos?",
      timestamp: Date.now() - 172800000 + 3600000
    }
  }
];

// Mapa de callbacks para simular listeners en tiempo real
const listeners: ((chats: ChatType[]) => void)[] = [];

// Función para notificar a los listeners cuando hay cambios
const notifyListeners = () => {
  listeners.forEach(callback => callback([...CHATS]));
};

// Función auxiliar para obtener información de usuario (nombre, foto, etc.)
const getUserInfo = (userId: string): ChatParticipant => {
  const userInfo = MOCK_USERS[userId] || { name: "Usuario", photoURL: "", role: "usuario" };
  return {
    id: userId,
    name: userInfo.name,
    photoURL: userInfo.photoURL,
    isOnline: Math.random() > 0.5 // Simular estado online aleatorio
  };
};

/**
 * Obtener todos los chats para un usuario
 */
export const getChats = async (userId: string): Promise<ChatType[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return CHATS.filter(chat => chat.participants.some(p => p.id === userId)).map(chat => ({ ...chat }));
};

/**
 * Crear un nuevo chat
 */
export const createChat = async (participantIds: string[], name = ""): Promise<ChatType> => {
  await new Promise(resolve => setTimeout(resolve, 700));
  
  const isGroup = participantIds.length > 2 || !!name;
  
  // Verificar si ya existe un chat privado entre estos usuarios si no es un grupo
  if (!isGroup && participantIds.length === 2) {
    const existingChat = CHATS.find(chat => 
      !chat.isGroup && 
      chat.participants.length === 2 &&
      chat.participants.some(p => p.id === participantIds[0]) &&
      chat.participants.some(p => p.id === participantIds[1])
    );
    
    if (existingChat) {
      return { ...existingChat };
    }
  }
  
  // Convertir IDs de participantes a objetos de participante
  const participants = participantIds.map(id => getUserInfo(id));
  
  const newChat: ChatType = {
    id: `chat${Date.now()}`,
    name,
    participants,
    messages: [],
    isGroup
  };
  
  CHATS = [...CHATS, newChat];
  
  // Notificar a los listeners sobre el cambio
  notifyListeners();
  
  return { ...newChat };
};

/**
 * Enviar un mensaje a un chat
 */
export const sendMessage = async (chatId: string, senderId: string, content: string): Promise<MessageType> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const chatIndex = CHATS.findIndex(chat => chat.id === chatId);
  if (chatIndex === -1) {
    throw new Error('Chat no encontrado');
  }
  
  const newMessage: MessageType = {
    id: `msg_${Date.now()}`,
    senderId,
    content,
    timestamp: Date.now()
  };
  
  CHATS[chatIndex].messages.unshift(newMessage);
  CHATS[chatIndex].lastMessage = newMessage;
  
  // Notificar a los listeners sobre el cambio
  notifyListeners();
  
  return { ...newMessage };
};

/**
 * Añadir un participante a un chat existente
 */
export const addParticipantToChat = async (chatId: string, participantId: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const chatIndex = CHATS.findIndex(chat => chat.id === chatId);
  if (chatIndex === -1) {
    throw new Error('Chat no encontrado');
  }
  
  if (CHATS[chatIndex].participants.some(p => p.id === participantId)) {
    return false;
  }
  
  const newParticipant = getUserInfo(participantId);
  CHATS[chatIndex].participants = [...CHATS[chatIndex].participants, newParticipant];
  
  // Añadir un mensaje del sistema
  const systemMessage: MessageType = {
    id: `msg_${Date.now()}`,
    senderId: "system",
    content: "Un nuevo participante se ha unido al chat",
    timestamp: Date.now()
  };
  
  CHATS[chatIndex].messages.unshift(systemMessage);
  CHATS[chatIndex].lastMessage = systemMessage;
  
  // Notificar a los listeners sobre el cambio
  notifyListeners();
  
  return true;
};

/**
 * Configurar un listener para cambios en los chats
 * Esta función simula la funcionalidad en tiempo real que antes proporcionaba Firebase
 */
export const setupChatListener = (callback: (chats: ChatType[]) => void) => {
  listeners.push(callback);
  
  // Llamar inmediatamente con los datos actuales
  callback([...CHATS]);
  
  // Devolver una función para eliminar el listener
  return () => {
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
};

/**
 * Obtener un chat por ID
 */
export const getChatById = async (chatId: string): Promise<ChatType | null> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  const chat = CHATS.find(chat => chat.id === chatId);
  return chat ? { ...chat } : null;
};

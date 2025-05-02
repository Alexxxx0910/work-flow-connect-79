
/**
 * Servicio de Chat
 * 
 * Este servicio proporciona funcionalidades temporales para la gestión de chats
 * mientras se implementa un backend personalizado.
 */

import { ChatType, MessageType, ChatParticipant } from "@/contexts/ChatContext";

// Estado local para los chats (simula una base de datos)
let CHATS: ChatType[] = [];

// Mapa de callbacks para simular listeners en tiempo real
const listeners: ((chats: ChatType[]) => void)[] = [];

// Función para notificar a los listeners cuando hay cambios
const notifyListeners = () => {
  listeners.forEach(callback => callback([...CHATS]));
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
  
  const newChat: ChatType = {
    id: `chat${Date.now()}`,
    name: name,
    participants: participantIds.map(id => ({ id, name: '', photoURL: '' })),
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
  
  CHATS[chatIndex].messages.push(newMessage);
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
  
  CHATS[chatIndex].participants = [...CHATS[chatIndex].participants, { id: participantId, name: '', photoURL: '' }];
  
  // Añadir un mensaje del sistema
  const systemMessage: MessageType = {
    id: `msg_${Date.now()}`,
    senderId: "system",
    content: "Un nuevo participante se ha unido al chat",
    timestamp: Date.now()
  };
  
  CHATS[chatIndex].messages.push(systemMessage);
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

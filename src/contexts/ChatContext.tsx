
/**
 * Contexto de Chat
 * 
 * Este archivo gestiona toda la funcionalidad de chat incluyendo:
 * - Comunicación en tiempo real usando WebSockets
 * - Envío y recepción de mensajes
 * - Creación de nuevos chats
 * - Gestión del estado del chat activo
 * - Persistencia en base de datos
 */

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { toast } from '@/components/ui/use-toast';
import { getSocket, initializeSocket, sendSocketMessage, joinChatRoom } from '@/lib/socket';
import { apiRequest } from '@/lib/api';

// Definición de tipos para mensajes y chats
export interface MessageType {
  id: string;           // ID único del mensaje
  senderId: string;     // ID del usuario que envió el mensaje
  content: string;      // Contenido del mensaje
  timestamp: number;    // Timestamp cuando se envió el mensaje
  read?: boolean;       // Indica si el mensaje ha sido leído
  user?: {              // Información del usuario que envió el mensaje
    id: string;
    name: string;
    photoURL?: string;
  }
};

export interface ChatParticipant {
  id: string;
  name: string;
  photoURL?: string;
  isOnline?: boolean;
  lastSeen?: Date;
}

export interface ChatType {
  id: string;           // ID único del chat
  name: string;         // Nombre del chat (para chats grupales)
  participants: ChatParticipant[]; // Participantes en el chat
  messages: MessageType[]; // Array de mensajes en el chat
  isGroup: boolean;     // Indica si es un chat grupal o privado
  lastMessage?: MessageType; // Último mensaje enviado (para mostrar vistas previas)
  lastMessageAt?: Date; // Fecha del último mensaje
};

// Interfaz del contexto de chat definiendo funciones y estado disponibles
interface ChatContextType {
  chats: ChatType[];    // Lista de todos los chats del usuario
  activeChat: ChatType | null; // Chat actualmente seleccionado
  setActiveChat: (chat: ChatType | null) => void; // Función para cambiar el chat activo
  sendMessage: (chatId: string, content: string) => void; // Enviar mensaje a un chat
  createChat: (participantIds: string[], name?: string) => Promise<void>; // Crear un nuevo chat
  createPrivateChat: (participantId: string, participantName?: string) => Promise<void>; // Crear un chat privado 1:1
  getChat: (chatId: string) => ChatType | undefined; // Obtener un chat por ID
  loadingChats: boolean; // Estado de carga de chats
  onlineUsers: string[]; // IDs de usuarios conectados
  loadChats: () => Promise<void>; // Cargar todos los chats
  addParticipantToChat: (chatId: string, participantId: string) => Promise<boolean>; // Añadir usuario a chat
  findExistingPrivateChat: (participantId: string) => ChatType | undefined; // Buscar chat privado existente
}

// Crear el contexto
const ChatContext = createContext<ChatContextType | null>(null);

/**
 * Hook personalizado para usar el contexto de chat
 */
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat debe usarse dentro de un ChatProvider');
  }
  return context;
};

// Props para el provider
interface ChatProviderProps {
  children: ReactNode;
}

/**
 * Componente proveedor del contexto de chat
 * Gestiona la funcionalidad de chat en tiempo real
 */
export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  // Obtener usuario actual del contexto de autenticación
  const { currentUser } = useAuth();
  
  // Estados para gestionar los chats y su estado
  const [chats, setChats] = useState<ChatType[]>([]);
  const [activeChat, setActiveChat] = useState<ChatType | null>(null);
  const [loadingChats, setLoadingChats] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

  // Inicializar socket para comunicación en tiempo real
  useEffect(() => {
    if (currentUser) {
      const socket = initializeSocket();
      
      return () => {
        // Limpieza al desmontar
        if (socket) {
          socket.disconnect();
        }
      };
    }
  }, [currentUser]);

  // Configurar escucha de eventos de socket
  useEffect(() => {
    if (!currentUser) return;

    const socket = getSocket();
    if (!socket) return;

    // Escuchar nuevos mensajes
    socket.on('new_message', (message) => {
      console.log('Nuevo mensaje recibido via socket:', message);
      
      setChats(prevChats => {
        return prevChats.map(chat => {
          if (chat.id === message.chatId) {
            // Agregar mensaje al chat correspondiente
            const updatedMessages = [message, ...chat.messages];
            return {
              ...chat,
              messages: updatedMessages,
              lastMessage: message,
              lastMessageAt: new Date(message.timestamp)
            };
          }
          return chat;
        });
      });
      
      // Si el chat está activo, actualizar también el activeChat
      if (activeChat && activeChat.id === message.chatId) {
        setActiveChat(prevChat => {
          if (!prevChat) return null;
          return {
            ...prevChat,
            messages: [message, ...prevChat.messages],
            lastMessage: message,
            lastMessageAt: new Date(message.timestamp)
          };
        });
        
        // Marcar mensajes como leídos
        socket.emit('mark_read', { chatId: message.chatId });
      }
    });

    // Escuchar cambios de estado de usuario
    socket.on('user_status_change', (data) => {
      console.log('Cambio de estado de usuario:', data);
      
      // Actualizar el estado de los usuarios en los chats
      setChats(prevChats => {
        return prevChats.map(chat => {
          const updatedParticipants = chat.participants.map(participant => {
            if (participant.id === data.userId) {
              return {
                ...participant,
                isOnline: data.isOnline,
                lastSeen: data.lastSeen
              };
            }
            return participant;
          });
          
          return {
            ...chat,
            participants: updatedParticipants
          };
        });
      });
      
      // Actualizar la lista de usuarios en línea
      if (data.isOnline) {
        setOnlineUsers(prev => [...prev, data.userId]);
      } else {
        setOnlineUsers(prev => prev.filter(id => id !== data.userId));
      }
    });

    // Escuchar cuando los mensajes son leídos
    socket.on('messages_read', (data) => {
      console.log('Mensajes leídos:', data);
      
      if (activeChat && activeChat.id === data.chatId) {
        setActiveChat(prevChat => {
          if (!prevChat) return null;
          
          const updatedMessages = prevChat.messages.map(msg => ({
            ...msg,
            read: true
          }));
          
          return {
            ...prevChat,
            messages: updatedMessages
          };
        });
      }
    });

    return () => {
      // Limpiar los listeners al desmontar
      socket.off('new_message');
      socket.off('user_status_change');
      socket.off('messages_read');
    };
  }, [currentUser, activeChat]);

  // Efecto para unirse a la sala del chat activo
  useEffect(() => {
    if (activeChat && currentUser) {
      joinChatRoom(activeChat.id);
      
      // Marcar mensajes como leídos cuando se selecciona un chat
      const socket = getSocket();
      if (socket) {
        socket.emit('mark_read', { chatId: activeChat.id });
      }
    }
  }, [activeChat?.id, currentUser]);

  /**
   * Función para buscar un chat privado existente con un usuario específico
   * Usada para prevenir la creación de chats duplicados
   */
  const findExistingPrivateChat = (participantId: string): ChatType | undefined => {
    if (!currentUser) return undefined;
    
    return chats.find(
      chat => !chat.isGroup && 
      chat.participants.length === 2 && 
      chat.participants.some(p => p.id === currentUser.id) && 
      chat.participants.some(p => p.id === participantId)
    );
  };

  /**
   * Función para cargar todos los chats
   */
  const loadChats = async () => {
    // Si no hay usuario autenticado, no se cargan chats
    if (!currentUser) {
      setChats([]);
      setLoadingChats(false);
      return;
    }
  
    setLoadingChats(true);
    try {
      console.log("Cargando chats para el usuario:", currentUser.id);
      
      // Cargar chats desde la API
      const response = await apiRequest('/api/chats');
      if (response && response.chats) {
        // Procesar los chats recibidos para asegurar el formato correcto
        const processedChats = response.chats.map((chat: any) => ({
          ...chat,
          messages: Array.isArray(chat.messages) ? 
            [...chat.messages].sort((a: any, b: any) => 
              new Date(b.timestamp || b.createdAt).getTime() - 
              new Date(a.timestamp || a.createdAt).getTime()
            ) : []
        }));
        
        setChats(processedChats);
        console.log("Chats cargados desde API:", processedChats.length);
        setLoadingChats(false);
        return;
      }
    } catch (error) {
      console.error("Error al cargar chats:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los chats. Por favor, inténtalo de nuevo."
      });
    } finally {
      setLoadingChats(false);
    }
  };

  // Cargar chats iniciales cuando cambia el usuario
  useEffect(() => {
    if (currentUser) {
      loadChats();
    } else {
      setChats([]);
      setActiveChat(null);
    }
  }, [currentUser]);

  /**
   * Función auxiliar para obtener un chat específico por ID
   */
  const getChat = (chatId: string) => {
    return chats.find(chat => chat.id === chatId);
  };

  /**
   * Función para enviar mensajes
   */
  const sendMessage = async (chatId: string, content: string) => {
    if (!currentUser || !content.trim()) return;
    
    try {
      console.log("Enviando mensaje:", { chatId, content });
      
      // Mensaje temporal optimista para UI instantánea
      const tempMessage: MessageType = {
        id: `temp_${Date.now()}`,
        senderId: currentUser.id,
        content,
        timestamp: Date.now(),
        read: false,
        user: {
          id: currentUser.id,
          name: currentUser.name || 'Usuario',
          photoURL: currentUser.photoURL
        }
      };
      
      // Actualizar UI inmediatamente con mensaje temporal
      setChats(prevChats => {
        return prevChats.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: [tempMessage, ...chat.messages],
              lastMessage: tempMessage,
              lastMessageAt: new Date()
            };
          }
          return chat;
        });
      });
      
      // Si el chat está activo, actualizar también el activeChat
      if (activeChat && activeChat.id === chatId) {
        setActiveChat(prevChat => {
          if (!prevChat) return null;
          return {
            ...prevChat,
            messages: [tempMessage, ...prevChat.messages],
            lastMessage: tempMessage,
            lastMessageAt: new Date()
          };
        });
      }
      
      // Intentar enviar mensaje a través del socket
      const socket = getSocket();
      if (socket && socket.connected) {
        await sendSocketMessage(chatId, content);
        return;
      }
      
      // Si no hay socket o no está conectado, usar REST API
      const response = await apiRequest(`/api/chats/${chatId}/messages`, 'POST', { content });
      console.log("Mensaje enviado mediante API REST:", response);
      
      if (response && response.chatMessage) {
        const realMessage = response.chatMessage;
        
        // Reemplazar mensaje temporal con el real
        setChats(prevChats => {
          return prevChats.map(chat => {
            if (chat.id === chatId) {
              return {
                ...chat,
                messages: chat.messages.map(msg => 
                  msg.id === tempMessage.id ? realMessage : msg
                ),
                lastMessage: realMessage,
                lastMessageAt: new Date(realMessage.createdAt || realMessage.timestamp)
              };
            }
            return chat;
          });
        });
        
        // Actualizar mensaje en el chat activo
        if (activeChat && activeChat.id === chatId) {
          setActiveChat(prevChat => {
            if (!prevChat) return null;
            return {
              ...prevChat,
              messages: prevChat.messages.map(msg => 
                msg.id === tempMessage.id ? realMessage : msg
              ),
              lastMessage: realMessage,
              lastMessageAt: new Date(realMessage.createdAt || realMessage.timestamp)
            };
          });
        }
      }
      return;
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo enviar el mensaje. Por favor, inténtalo de nuevo."
      });
    }
  };

  /**
   * Función para crear un chat (puede ser grupal o 1:1)
   */
  const createChat = async (participantIds: string[], name = '') => {
    if (!currentUser) return;
    
    // Asegurar que el usuario actual esté incluido
    if (!participantIds.includes(currentUser.id)) {
      participantIds.push(currentUser.id);
    }
    
    try {
      // Crear chat a través de la API
      const response = await apiRequest('/api/chats', 'POST', { 
        participantIds, 
        name, 
        isGroup: participantIds.length > 2 || !!name 
      });
      
      if (response && response.chat) {
        console.log("Nuevo chat creado mediante API:", response.chat);
        
        // Refrescar la lista de chats
        await loadChats();
        
        // Establecer el nuevo chat como activo
        const newChat = response.chat;
        setActiveChat(newChat);
        
        // Unirse a la sala del nuevo chat
        joinChatRoom(newChat.id);
      }
    } catch (error) {
      console.error("Error al crear chat mediante API:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el chat. Por favor, inténtalo de nuevo."
      });
    }
  };

  /**
   * Función mejorada para crear o navegar a un chat privado existente
   */
  const createPrivateChat = async (participantId: string, participantName?: string) => {
    if (!currentUser || participantId === currentUser.id) return;
    
    try {
      // Verificar si ya existe un chat privado con este usuario
      const existingChat = findExistingPrivateChat(participantId);
      
      if (existingChat) {
        // Si el chat existe, establecerlo como activo
        console.log("Chat privado existente encontrado, navegando a él:", existingChat.id);
        setActiveChat(existingChat);
        joinChatRoom(existingChat.id);
        return;
      }
      
      // Si no existe, crear un nuevo chat privado
      console.log("Creando nuevo chat privado con usuario:", participantId, participantName);
      
      // Crear chat con nombre de usuario para mostrar correctamente
      const response = await apiRequest('/api/chats', 'POST', {
        participantIds: [currentUser.id, participantId],
        name: participantName || '', // Usar nombre del participante
        isGroup: false
      });
      
      if (response && response.chat) {
        console.log("Nuevo chat privado creado mediante API:", response.chat);
        
        // Refrescar lista de chats
        await loadChats();
        
        // Establecer nuevo chat como activo
        const newChat = response.chat;
        setActiveChat(newChat);
        
        // Unirse a la sala del chat
        joinChatRoom(newChat.id);
      }
    } catch (error) {
      console.error("Error al crear chat privado:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el chat privado. Por favor, inténtalo de nuevo."
      });
    }
  };

  /**
   * Función para añadir participantes a un chat existente
   */
  const addParticipantToChat = async (chatId: string, participantId: string) => {
    try {
      // Comprobar si el chat existe
      const chat = chats.find(c => c.id === chatId);
      if (!chat) return false;
      
      // Comprobar si el usuario ya está en el chat
      if (chat.participants.some(p => p.id === participantId)) return false;
      
      // Añadir participante mediante API
      const response = await apiRequest(`/api/chats/${chatId}/participants`, 'POST', {
        userId: participantId
      });
      
      if (response && response.success) {
        console.log(`Participante ${participantId} añadido al chat ${chatId} mediante API`);
        
        // Refrescar la lista de chats
        await loadChats();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error al añadir participante:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo añadir el participante. Por favor, inténtalo de nuevo."
      });
      return false;
    }
  };

  // Proporcionar el contexto a los componentes hijos
  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        setActiveChat,
        sendMessage,
        createChat,
        createPrivateChat,
        getChat,
        loadingChats,
        onlineUsers,
        loadChats,
        addParticipantToChat,
        findExistingPrivateChat
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

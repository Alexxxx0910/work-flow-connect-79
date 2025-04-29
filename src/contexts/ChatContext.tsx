
/**
 * Contexto de Chat
 * 
 * Este archivo gestiona toda la funcionalidad de chat incluyendo:
 * - Simulación de tiempo real de chats usando un servicio temporal
 * - Envío y recepción de mensajes
 * - Creación de nuevos chats
 * - Gestión del estado del chat activo
 */

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { 
  getChats as getServiceChats,
  createChat as createServiceChat,
  sendMessage as sendServiceMessage,
  addParticipantToChat as addServiceParticipantToChat,
  setupChatListener,
  getChatById
} from '@/lib/chatService';
import { toast } from '@/components/ui/use-toast';
import { getSocket, initializeSocket } from '@/lib/socket';
import { apiRequest } from '@/lib/api';

// Definición de tipos para mensajes y chats
export interface MessageType {
  id: string;           // ID único del mensaje
  senderId: string;     // ID del usuario que envió el mensaje
  content: string;      // Contenido del mensaje
  timestamp: number;    // Timestamp cuando se envió el mensaje
};

export interface ChatParticipant {
  id: string;
  name: string;
  photoURL?: string;
  isOnline?: boolean;
}

export interface ChatType {
  id: string;           // ID único del chat
  name: string;         // Nombre del chat (para chats grupales)
  participants: ChatParticipant[]; // Participantes en el chat
  messages: MessageType[]; // Array de mensajes en el chat
  isGroup: boolean;     // Indica si es un chat grupal o privado
  lastMessage?: MessageType; // Último mensaje enviado (para mostrar vistas previas)
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

// Usuarios en línea simulados
const MOCK_ONLINE_USERS = ['user1', 'user2', 'user3'];

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
  const [onlineUsers] = useState<string[]>(MOCK_ONLINE_USERS);

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
              lastMessage: message
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
            lastMessage: message
          };
        });
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
                isOnline: data.isOnline
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
    });

    return () => {
      // Limpiar los listeners al desmontar
      socket.off('new_message');
      socket.off('user_status_change');
    };
  }, [currentUser, activeChat]);

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
   * Función para cargar todos los chats y configurar los listeners
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
      
      // Intentar cargar chats desde la API real
      try {
        const response = await apiRequest('/chats');
        if (response && response.chats) {
          setChats(response.chats);
          console.log("Chats cargados desde API:", response.chats.length);
          setLoadingChats(false);
          return;
        }
      } catch (apiError) {
        console.warn("No se pudieron cargar chats desde API, usando fallback:", apiError);
      }
      
      // Fallback al servicio temporal
      const userChats = await getServiceChats(currentUser.id);
      setChats(userChats);
      console.log("Chats cargados (fallback):", userChats.length);
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

  /**
   * Configurar listeners para actualizaciones de chat
   */
  useEffect(() => {
    if (!currentUser) return;

    console.log("Configurando listener para chats...");
    const unsubscribe = setupChatListener((updatedChats) => {
      console.log("Actualización de chats recibida:", updatedChats.length);
      
      // Filtrar solo los chats donde el usuario es participante
      const userChats = updatedChats.filter(chat => 
        chat.participants.some(p => p.id === currentUser.id)
      );
      
      setChats(userChats);
      
      // Si hay un chat activo, actualizarlo también
      if (activeChat) {
        const updatedActiveChat = userChats.find(chat => chat.id === activeChat.id);
        if (updatedActiveChat) {
          setActiveChat(updatedActiveChat);
        }
      }
    });
    
    return () => {
      console.log("Limpiando listener de chats");
      unsubscribe();
    };
  }, [currentUser, activeChat]);

  // Cargar chats iniciales cuando cambia el usuario
  useEffect(() => {
    loadChats();
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
      
      // Intentar enviar mensaje a través de la API real
      try {
        const socket = getSocket();
        if (socket) {
          // Enviar mensaje a través de socket
          socket.emit('send_message', { chatId, content });
          console.log("Mensaje enviado a través de socket");
          return;
        }
        
        // Si no hay socket, intentar con la API REST
        const response = await apiRequest(`/chats/${chatId}/messages`, 'POST', { content });
        console.log("Mensaje enviado mediante API REST:", response);
        return;
      } catch (apiError) {
        console.warn("No se pudo enviar mensaje a través de API, usando fallback:", apiError);
      }
      
      // Fallback al servicio temporal
      await sendServiceMessage(chatId, currentUser.id, content);
      console.log("Mensaje enviado correctamente (fallback)");
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
      // Intentar crear chat a través de la API real
      try {
        const response = await apiRequest('/chats', 'POST', { 
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
          return;
        }
      } catch (apiError) {
        console.warn("No se pudo crear chat mediante API, usando fallback:", apiError);
      }
      
      // Fallback al servicio temporal
      const newChat = await createServiceChat(participantIds, name);
      console.log("Nuevo chat creado (fallback):", newChat);
      
      // Actualizar el chat activo inmediatamente
      setActiveChat(newChat);
    } catch (error) {
      console.error("Error al crear chat:", error);
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
        return;
      }
      
      // Si no existe, crear un nuevo chat privado
      console.log("Creando nuevo chat privado con usuario:", participantId);
      
      // Intentar crear chat a través de la API real
      try {
        const response = await apiRequest('/chats', 'POST', {
          participantIds: [currentUser.id, participantId],
          name: '', // Chat privado sin nombre específico
          isGroup: false
        });
        
        if (response && response.chat) {
          console.log("Nuevo chat privado creado mediante API:", response.chat);
          
          // Refrescar lista de chats
          await loadChats();
          
          // Establecer nuevo chat como activo
          const newChat = response.chat;
          setActiveChat(newChat);
          return;
        }
      } catch (apiError) {
        console.warn("No se pudo crear chat privado mediante API, usando fallback:", apiError);
      }
      
      // Fallback al servicio temporal
      const participants = [currentUser.id, participantId];
      const newChat = await createServiceChat(participants, participantName || '');
      console.log("Nuevo chat privado creado (fallback):", newChat);
      
      setActiveChat(newChat);
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
      // Comprobar si el chat existe y es un chat grupal
      const chat = chats.find(c => c.id === chatId);
      if (!chat) return false;
      
      // Comprobar si el usuario ya está en el chat
      if (chat.participants.some(p => p.id === participantId)) return false;
      
      // Intentar añadir participante mediante API
      try {
        const response = await apiRequest(`/chats/${chatId}/participants`, 'POST', {
          userId: participantId
        });
        
        if (response && response.success) {
          console.log(`Participante ${participantId} añadido al chat ${chatId} mediante API`);
          
          // Refrescar la lista de chats
          await loadChats();
          return true;
        }
      } catch (apiError) {
        console.warn("No se pudo añadir participante mediante API, usando fallback:", apiError);
      }
      
      // Fallback al servicio temporal
      const success = await addServiceParticipantToChat(chatId, participantId);
      console.log(`Participante ${participantId} añadido al chat ${chatId} (fallback)`);
      
      return success;
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

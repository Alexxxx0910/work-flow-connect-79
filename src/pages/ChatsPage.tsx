
import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, Users, RefreshCw, MessageSquare } from 'lucide-react';
import { ChatGroupForm } from '@/components/ChatGroupForm';
import { NewPrivateChat } from '@/components/NewPrivateChat';

const ChatsPage: React.FC = () => {
  const { chats, activeChat, setActiveChat, sendMessage, loadingChats, loadChats } = useChat();
  const { currentUser } = useAuth();
  
  const [messageContent, setMessageContent] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [isPrivateChatDialogOpen, setIsPrivateChatDialogOpen] = useState(false);
  
  useEffect(() => {
    // Scroll al mensaje más reciente cuando se selecciona un chat o se envía un mensaje
    if (activeChat) {
      const messagesContainer = document.getElementById('messages-container');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  }, [activeChat?.messages]);

  // Filtrar chats por término de búsqueda
  const filteredChats = searchTerm 
    ? chats.filter(chat => {
        const otherParticipants = chat.participants.filter(
          p => p.id !== currentUser?.id
        );
        
        // Si es un grupo, buscar por nombre del grupo
        if (chat.isGroup) {
          return chat.name.toLowerCase().includes(searchTerm.toLowerCase());
        }
        
        // Si es privado, buscar por nombre del otro participante
        return otherParticipants.some(p => 
          p.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      })
    : chats;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeChat && messageContent.trim()) {
      sendMessage(activeChat.id, messageContent);
      setMessageContent('');
    }
  };

  const getChatName = (chat: any) => {
    if (chat.isGroup) return chat.name;
    
    const otherParticipant = chat.participants.find(
      (p: any) => p.id !== currentUser?.id
    );
    
    return otherParticipant?.name || 'Chat privado';
  };

  // Formatear la fecha y hora del último mensaje
  const formatLastMessageTime = (timestamp: number) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    
    // Si es hoy, mostrar solo la hora
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
    
    // Si es ayer, mostrar "Ayer"
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    }
    
    // Si es esta semana, mostrar el día
    const weekStart = new Date();
    weekStart.setDate(now.getDate() - now.getDay());
    if (date >= weekStart) {
      return date.toLocaleDateString('es-ES', { weekday: 'short' });
    }
    
    // En otro caso, mostrar la fecha
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-60px)]">
        {/* Panel lateral de chats */}
        <div className="w-1/3 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <h1 className="text-xl font-bold mb-3">Mensajes</h1>
            <Input 
              placeholder="Buscar conversaciones..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-3"
            />
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsGroupDialogOpen(true)}
                className="flex items-center text-xs"
              >
                <Users className="mr-1 h-4 w-4" />
                Crear grupo
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsPrivateChatDialogOpen(true)}
                className="flex items-center text-xs"
              >
                <UserPlus className="mr-1 h-4 w-4" />
                Chat privado
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={loadChats}
                className="flex items-center text-xs"
              >
                <RefreshCw className="mr-1 h-4 w-4" />
                Actualizar
              </Button>
            </div>
          </div>
          
          <ScrollArea className="flex-1">
            {loadingChats ? (
              <div className="flex items-center justify-center h-full">
                <p>Cargando conversaciones...</p>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">No tienes ninguna conversación aún</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filteredChats.map((chat) => (
                  <li 
                    key={chat.id}
                    className={`p-3 hover:bg-accent cursor-pointer transition-colors ${
                      activeChat?.id === chat.id ? 'bg-accent' : ''
                    }`}
                    onClick={() => setActiveChat(chat)}
                  >
                    <div className="flex justify-between mb-1">
                      <h3 className="font-medium truncate">{getChatName(chat)}</h3>
                      {chat.lastMessage?.timestamp && (
                        <span className="text-xs text-muted-foreground">
                          {formatLastMessageTime(chat.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.messages && chat.messages.length > 0 
                        ? `${chat.messages[0].senderId || 'Usuario'}: ${chat.messages[0].content}` 
                        : 'No hay mensajes aún'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
        
        {/* Área de mensajes */}
        <div className="flex-1 flex flex-col">
          {activeChat ? (
            <>
              <div className="p-3 border-b border-border">
                <h2 className="font-semibold">{getChatName(activeChat)}</h2>
                <p className="text-xs text-muted-foreground">
                  {activeChat.isGroup
                    ? `${activeChat.participants.length} participantes`
                    : activeChat.participants.find((p: any) => p.id !== currentUser?.id)?.isOnline
                      ? 'En línea'
                      : 'Desconectado'
                  }
                </p>
              </div>
              
              <ScrollArea className="flex-1 p-4" id="messages-container">
                <div className="space-y-4">
                  {activeChat.messages && activeChat.messages.length > 0 ? (
                    activeChat.messages.map((message: any) => (
                      <div 
                        key={message.id}
                        className={`flex ${message.senderId === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[70%] p-3 rounded-lg ${
                            message.senderId === currentUser?.id
                              ? 'bg-wfc-purple text-white'
                              : 'bg-muted'
                          }`}
                        >
                          {message.senderId !== currentUser?.id && (
                            <p className="text-xs font-medium mb-1">{message.senderId || 'Usuario'}</p>
                          )}
                          <p>{message.content}</p>
                          <p className="text-xs text-right mt-1 opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString('es-ES', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No hay mensajes aún</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
              
              <form onSubmit={handleSendMessage} className="p-3 border-t border-border flex gap-2">
                <Input 
                  placeholder="Escribe un mensaje..." 
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" className="bg-wfc-purple hover:bg-wfc-purple-medium">
                  Enviar
                </Button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-4">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Selecciona un chat</h2>
              <p className="text-muted-foreground mb-4">
                Elige una conversación de la lista o inicia una nueva
              </p>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setIsGroupDialogOpen(true)}
                  className="flex items-center"
                >
                  <Users className="mr-2 h-4 w-4" />
                  Crear chat grupal
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsPrivateChatDialogOpen(true)}
                  className="flex items-center"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Chat privado
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Diálogo para crear chat grupal */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent>
          <ChatGroupForm onClose={() => setIsGroupDialogOpen(false)} />
        </DialogContent>
      </Dialog>
      
      {/* Diálogo para chat privado */}
      <Dialog open={isPrivateChatDialogOpen} onOpenChange={setIsPrivateChatDialogOpen}>
        <DialogContent>
          <NewPrivateChat onClose={() => setIsPrivateChatDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default ChatsPage;

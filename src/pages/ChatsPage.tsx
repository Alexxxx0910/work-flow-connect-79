import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '@/components/Layout/MainLayout';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Send, 
  UserPlus, 
  Users, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Info,
  Loader2
} from 'lucide-react';
import { ChatGroupForm } from '@/components/ChatGroupForm';
import { NewPrivateChat } from '@/components/NewPrivateChat';
import { UserSelectDialog } from '@/components/UserSelectDialog';
import { toast } from '@/components/ui/use-toast';

const ChatsPage = () => {
  const { 
    chats, 
    activeChat, 
    setActiveChat, 
    sendMessage, 
    onlineUsers, 
    createPrivateChat,
    addParticipantToChat,
    loadChats,
    loadingChats
  } = useChat();
  const { currentUser } = useAuth();
  const { getUserById } = useData();
  const [messageText, setMessageText] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isSelectingUser, setIsSelectingUser] = useState(false);
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    scrollToBottom();
  }, [activeChat?.messages?.length]);
  
  useEffect(() => {
    if (currentUser) {
      console.log("ChatsPage montada, iniciando conexión en tiempo real");
      loadChats();
    }
  }, [currentUser]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  const getChatName = (chat: any) => {
    if (chat.name) return chat.name;
    
    if (!chat.isGroup && currentUser) {
      const otherParticipant = chat.participants.find((p: any) => p.id !== currentUser.id);
      if (otherParticipant) {
        return otherParticipant.name || 'Chat privado';
      }
    }
    
    return 'Chat';
  };
  
  const getChatAvatar = (chat: any) => {
    if (!chat.isGroup && currentUser) {
      const otherParticipant = chat.participants.find((p: any) => p.id !== currentUser.id);
      if (otherParticipant) {
        return otherParticipant.photoURL;
      }
    }
    return undefined;
  };
  
  const getAvatarFallback = (chat: any) => {
    const name = getChatName(chat);
    return name.charAt(0).toUpperCase();
  };
  
  const handleSendMessage = () => {
    if (!activeChat || !messageText.trim()) return;
    
    sendMessage(activeChat.id, messageText);
    setMessageText('');
  };
  
  const handleCreatePrivateChat = (userId: string) => {
    createPrivateChat(userId);
    toast({
      title: "Chat creado",
      description: "Se ha iniciado un nuevo chat privado"
    });
  };
  
  const handleAddParticipant = async (userId: string) => {
    if (!activeChat) return;
    
    const success = await addParticipantToChat(activeChat.id, userId);
    if (success) {
      toast({
        title: "Participante añadido",
        description: "Se ha añadido el participante al chat"
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo añadir el participante"
      });
    }
  };
  
  const formatTime = (timestamp: number | string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: number | string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const isUserOnline = (userId: string) => onlineUsers.includes(userId);

  const filteredChats = chats.filter(chat => 
    getChatName(chat).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  // Función para obtener el timestamp de un mensaje, considerando tanto timestamp como createdAt
  const getMessageTimestamp = (message: any) => {
    return message.timestamp || message.createdAt || Date.now();
  };
  
  return (
    <MainLayout>
      <div className="h-[calc(100vh-8rem)] flex">
        <div className={`relative transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-0 opacity-0' : 'w-full md:w-80 lg:w-96'}`}>
          {!sidebarCollapsed && (
            <Card className="h-full flex flex-col">
              <div className="p-4 border-b">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="font-semibold text-lg">Mensajes</h2>
                  <div className="flex space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="rounded-full"
                            onClick={() => setIsCreatingGroup(true)}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Crear chat grupal</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="rounded-full"
                            onClick={() => setIsSelectingUser(true)}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Nuevo chat privado</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar conversaciones..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <ScrollArea className="flex-1">
                {loadingChats ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <Loader2 className="h-8 w-8 animate-spin text-wfc-purple mb-2" />
                    <p className="text-gray-500">Cargando conversaciones...</p>
                  </div>
                ) : filteredChats.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    {searchQuery ? (
                      <p className="text-gray-500">No se encontraron conversaciones</p>
                    ) : (
                      <>
                        <p className="text-gray-500">No tienes ninguna conversación aún</p>
                        <div className="flex mt-2 space-x-2">
                          <Button 
                            variant="outline" 
                            className="text-wfc-purple"
                            onClick={() => setIsCreatingGroup(true)}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Crear grupo
                          </Button>
                          <Button 
                            variant="outline" 
                            className="text-wfc-purple"
                            onClick={() => setIsSelectingUser(true)}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Chat privado
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {filteredChats.map((chat) => (
                      <div
                        key={chat.id}
                        className={`p-3 flex items-start space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-md
                          ${activeChat?.id === chat.id ? 'bg-wfc-purple/10 border-l-4 border-wfc-purple' : ''}
                        `}
                        onClick={() => setActiveChat(chat)}
                      >
                        <div className="relative">
                          <Avatar>
                            <AvatarImage src={getChatAvatar(chat)} />
                            <AvatarFallback className={`bg-wfc-purple-medium text-white`}>
                              {getAvatarFallback(chat)}
                            </AvatarFallback>
                          </Avatar>
                          {chat.isGroup ? (
                            <Badge className="absolute -top-1 -right-1 bg-wfc-purple p-0 min-w-[1.1rem] h-[1.1rem] flex items-center justify-center">
                              <Users className="h-3 w-3" />
                            </Badge>
                          ) : (
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800
                              ${isUserOnline(chat.participants.find((p: any) => p.id !== currentUser?.id)?.id) 
                                ? 'bg-green-500' 
                                : 'bg-gray-300'}
                            `} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between">
                            <h3 className="font-medium leading-tight truncate">{getChatName(chat)}</h3>
                            {chat.lastMessage && (
                              <span className="text-xs text-gray-400">
                                {formatTime(getMessageTimestamp(chat.lastMessage))}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 truncate mt-1">
                            {chat.lastMessage 
                              ? chat.lastMessage.content 
                              : 'No hay mensajes aún'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              
              <div className="p-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => loadChats()}
                  disabled={loadingChats}
                >
                  {loadingChats ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    <>Actualizar conexión</>
                  )}
                </Button>
              </div>
            </Card>
          )}
          
          <button 
            onClick={toggleSidebar}
            className="absolute -right-4 top-1/2 transform -translate-y-1/2 bg-wfc-purple text-white rounded-full h-8 w-8 flex items-center justify-center shadow-md z-10 hover:bg-wfc-purple-medium transition-colors"
            aria-label={sidebarCollapsed ? "Mostrar contactos" : "Ocultar contactos"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
        
        <div className={`flex-1 transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'ml-0' : 'ml-4'}`}>
          <Card className="h-full flex flex-col">
            {activeChat ? (
              <>
                <div className="p-4 border-b flex items-center space-x-3">
                  {sidebarCollapsed && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={toggleSidebar} 
                      className="mr-2"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  )}
                  <Avatar>
                    <AvatarImage src={getChatAvatar(activeChat)} />
                    <AvatarFallback className="bg-wfc-purple-medium text-white">
                      {getAvatarFallback(activeChat)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold truncate">{getChatName(activeChat)}</h2>
                    <p className="text-xs text-gray-500">
                      {activeChat.isGroup 
                        ? `${activeChat.participants.length} participantes` 
                        : isUserOnline(activeChat.participants.find((p: any) => p.id !== currentUser?.id)?.id)
                          ? 'En línea'
                          : 'Desconectado'
                      }
                    </p>
                  </div>
                  
                  {activeChat.isGroup && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setIsAddingParticipant(true)}
                          >
                            <UserPlus className="h-5 w-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Añadir participante</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                
                <ScrollArea id="messages-container" className="flex-1 p-4">
                  {activeChat.messages?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <p className="text-gray-500">No hay mensajes aún</p>
                      <p className="text-sm text-gray-400 mt-2">Envía un mensaje para iniciar la conversación</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {activeChat.messages?.map((message: any, index: number, messages: any[]) => {
                        const isCurrentUser = currentUser && message.senderId === currentUser.id;
                        const isSystemMessage = message.senderId === "system";
                        const sender = isSystemMessage ? null : getUserById(message.senderId);
                        const messageTimestamp = getMessageTimestamp(message);
                        const prevMessageTimestamp = index > 0 ? getMessageTimestamp(messages[index - 1]) : null;
                        
                        const showDateSeparator = index === 0 || 
                          new Date(messageTimestamp).toDateString() !== 
                          new Date(prevMessageTimestamp).toDateString();
                        
                        return (
                          <React.Fragment key={message.id}>
                            {showDateSeparator && (
                              <div className="flex justify-center my-4">
                                <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-500">
                                  {formatDate(messageTimestamp)}
                                </div>
                              </div>
                            )}
                            
                            {isSystemMessage ? (
                              <div className="flex justify-center my-4">
                                <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-xs text-gray-500 flex items-center">
                                  <Info className="h-3 w-3 mr-1" />
                                  {message.content}
                                </div>
                              </div>
                            ) : (
                              <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} group`}>
                                {!isCurrentUser && (
                                  <Avatar className="h-8 w-8 mr-2 mt-1">
                                    <AvatarImage src={sender?.photoURL} />
                                    <AvatarFallback className="bg-wfc-purple-medium text-white">
                                      {sender?.name?.charAt(0).toUpperCase() || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                
                                <div className={`max-w-[80%]`}>
                                  {!isCurrentUser && activeChat.isGroup && (
                                    <p className="text-xs text-gray-500 mb-1">{sender?.name || 'Usuario'}</p>
                                  )}
                                  <div 
                                    className={`rounded-lg px-4 py-2 inline-block
                                      ${isCurrentUser 
                                        ? 'bg-wfc-purple text-white rounded-tr-none' 
                                        : 'bg-gray-100 dark:bg-gray-700 rounded-tl-none'}
                                    `}
                                  >
                                    <p className="break-words">{message.content}</p>
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {formatTime(messageTimestamp)}
                                  </p>
                                </div>
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
                
                <div className="p-4 border-t">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Escribe un mensaje..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim()}
                      className="bg-wfc-purple hover:bg-wfc-purple-medium"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                {sidebarCollapsed && (
                  <Button 
                    variant="outline" 
                    onClick={toggleSidebar} 
                    className="mb-4"
                  >
                    <ChevronRight className="h-4 w-4 mr-2" />
                    Ver contactos
                  </Button>
                )}
                <h2 className="text-xl font-semibold">Selecciona un chat</h2>
                <p className="text-gray-500 mt-2">
                  Elige una conversación de la lista o inicia una nueva
                </p>
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreatingGroup(true)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Crear chat grupal
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setIsSelectingUser(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Chat privado
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
      
      <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear chat grupal</DialogTitle>
          </DialogHeader>
          <ChatGroupForm onClose={() => setIsCreatingGroup(false)} />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isSelectingUser} onOpenChange={setIsSelectingUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo chat privado</DialogTitle>
          </DialogHeader>
          <NewPrivateChat onClose={() => setIsSelectingUser(false)} />
        </DialogContent>
      </Dialog>
      
      {activeChat && (
        <UserSelectDialog 
          open={isAddingParticipant} 
          onOpenChange={setIsAddingParticipant}
          title="Añadir participante"
          onUserSelect={handleAddParticipant}
          excludeUsers={activeChat.participants.map((p: any) => p.id)}
        />
      )}
    </MainLayout>
  );
};

export default ChatsPage;

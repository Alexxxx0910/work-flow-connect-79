import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/router';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Shell } from '@/components/Shell';
import { ChatType, useChat, ChatParticipant } from '@/contexts/ChatContext';
import { NewPrivateChat } from '@/components/NewPrivateChat';
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2, Plus, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';

const Dashboard = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const { chats, activeChat, setActiveChat, sendMessage, loadingChats, onlineUsers } = useChat();
  const router = useRouter();
  const [messageContent, setMessageContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    if (!currentUser && !authLoading) {
      router.push('/login');
    }
  }, [currentUser, authLoading, router]);

  if (authLoading) {
    return <div>Cargando...</div>;
  }

  if (!currentUser) {
    return null;
  }

  const handleSendMessage = async () => {
    if (!activeChat || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(activeChat.id, messageContent);
      setMessageContent('');
    } catch (error) {
      console.error("Error al enviar el mensaje:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo enviar el mensaje. Por favor, inténtalo de nuevo."
      });
    } finally {
      setIsSending(false);
    }
  };

  const renderChatList = () => {
    if (loadingChats) {
      return (
        <div className="flex flex-col space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`flex items-center space-x-4 p-3 rounded-md hover:bg-secondary cursor-pointer ${activeChat?.id === chat.id ? 'bg-secondary' : ''}`}
            onClick={() => setActiveChat(chat)}
          >
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-sm font-medium leading-none">{chat.name}</p>
              <p className="text-sm text-muted-foreground">
                {chat.lastMessage?.content || 'No messages yet'}
              </p>
            </div>
            <Separator orientation="vertical" className="h-10" />
            {chat.lastMessageAt && (
              <div className="text-xs text-muted-foreground">
                {format(new Date(chat.lastMessageAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (!activeChat) {
      return <div className="h-full flex items-center justify-center text-muted-foreground">Selecciona un chat para ver los mensajes</div>;
    }

    const isOnline = activeChat.participants.some(p => p.id !== currentUser?.id && onlineUsers.includes(p.id));
    const otherParticipant = activeChat.participants.find(p => p.id !== currentUser?.id);

    return (
      <div className="flex flex-col h-full">
        <div className="border-b p-4">
          <div className="font-bold text-lg">{activeChat.name}</div>
          <div className="text-sm text-muted-foreground">
            {isOnline ? <Badge variant="secondary">Online</Badge> : 'Offline'}
            {otherParticipant && !isOnline && (
              <span>
                Visto por última vez: {otherParticipant.lastSeen ? format(new Date(otherParticipant.lastSeen), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'Desconocido'}
              </span>
            )}
          </div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          {activeChat.messages.map((message) => (
            <div key={message.id} className={`mb-2 flex flex-col ${message.senderId === currentUser.id ? 'items-end' : 'items-start'}`}>
              <div className={`rounded-lg p-2 ${message.senderId === currentUser.id ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'}`}>
                {message.content}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(message.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                {message.read && message.senderId === currentUser.id && (
                  <CheckCheck className="inline-block w-4 h-4 ml-1" />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t">
          <div className="flex items-center space-x-2">
            <Textarea
              placeholder="Escribe tu mensaje..."
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              className="flex-1 resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button onClick={handleSendMessage} disabled={isSending}>
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Shell>
      <div className="grid md:grid-cols-4 grid-cols-1 gap-4">
        <div className="md:col-span-1">
          <div className="p-4">
            <div className="font-bold text-lg mb-4">Chats</div>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
              <SheetTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Nuevo Chat</Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>Nuevo Chat</SheetTitle>
                  <SheetDescription>
                    Selecciona un contacto para iniciar un chat.
                  </SheetDescription>
                </SheetHeader>
                <NewPrivateChat onClose={() => setIsSheetOpen(false)} />
                <SheetFooter>
                  <SheetClose asChild>
                    <Button type="button" variant="secondary">Cancelar</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
            <div className="mt-4">{renderChatList()}</div>
          </div>
        </div>
        <div className="md:col-span-3">{renderContent()}</div>
      </div>
    </Shell>
  );
};

export default Dashboard;

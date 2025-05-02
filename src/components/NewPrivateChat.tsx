
import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { toast } from '@/components/ui/use-toast';
import { apiRequest } from '@/lib/api';
import { Loader2, Search, RefreshCw } from 'lucide-react';

interface User {
  id: string;
  name: string;
  photoURL: string;
  role: string;
}

export const NewPrivateChat = ({ onClose }: { onClose: () => void }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [creatingChat, setCreatingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { currentUser } = useAuth();
  const { createPrivateChat, findExistingPrivateChat } = useChat();

  // Cargar usuarios de la base de datos
  const fetchUsers = async () => {
    if (!currentUser) {
      setError("Debes iniciar sesión para acceder a esta función");
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log("Solicitando lista de usuarios...");
      
      // Corregir la ruta eliminando el "/api" duplicado
      const response = await apiRequest('/users/search');
      
      console.log("Respuesta de búsqueda de usuarios:", response);
      
      if (response && response.success && Array.isArray(response.users)) {
        setUsers(response.users);
        console.log("Usuarios cargados:", response.users.length);
        setError(null);
      } else {
        console.error("Formato de respuesta inválido:", response);
        throw new Error("Formato de respuesta inválido o error al buscar usuarios");
      }
    } catch (err) {
      console.error("Error al cargar usuarios:", err);
      setError("No se pudieron cargar los usuarios. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  // Filtrar usuarios según término de búsqueda
  const filteredUsers = searchTerm 
    ? users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : users;

  const handleStartChat = async (userId: string, userName: string) => {
    if (creatingChat) return; // Evitar múltiples clics
    
    try {
      setCreatingChat(true);
      console.log("Iniciando chat con usuario:", userId, userName);
      
      // Verificar si ya existe un chat con este usuario
      const existingChat = findExistingPrivateChat(userId);
      
      if (existingChat) {
        console.log("Redirigiendo a chat existente:", existingChat);
        
        toast({
          title: "Chat existente",
          description: `Continuando conversación con ${userName}`
        });
        
        onClose();
      } else {
        // Crear nuevo chat privado con este usuario
        console.log("Creando nuevo chat con usuario:", userId, userName);
        await createPrivateChat(userId, userName);
        
        toast({
          title: "Chat con " + userName,
          description: "Se ha iniciado un chat con " + userName
        });
        
        onClose();
      }
      
    } catch (error) {
      console.error("Error al crear chat:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el chat privado. Por favor, inténtalo de nuevo más tarde."
      });
    } finally {
      setCreatingChat(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar usuarios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-wfc-purple" />
            <span className="ml-2">Cargando usuarios...</span>
          </div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 mx-auto flex items-center"
              onClick={fetchUsers}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Reintentar
            </Button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-4">
            {searchTerm ? "No se encontraron usuarios con ese nombre" : "No hay usuarios disponibles"}
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredUsers.map(user => (
              <li 
                key={user.id}
                className={`flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors ${creatingChat ? 'opacity-70' : 'cursor-pointer'}`}
                onClick={() => !creatingChat && handleStartChat(user.id, user.name)}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL} alt={user.name} />
                    <AvatarFallback className="bg-wfc-purple-medium text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.role || 'Usuario'}</div>
                  </div>
                </div>
                {creatingChat && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { toast } from '@/components/ui/use-toast';
import axios from 'axios';

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
  const [error, setError] = useState<string | null>(null);
  
  const { currentUser } = useAuth();
  const { createPrivateChat, chats } = useChat();

  // Cargar usuarios de la base de datos
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/api/users/search');
        
        // Filtrar para no incluir al usuario actual
        if (currentUser) {
          const filteredUsers = response.data.users.filter(
            (user: User) => user.id !== currentUser.id
          );
          setUsers(filteredUsers);
        } else {
          setUsers(response.data.users || []);
        }
      } catch (err) {
        console.error("Error al cargar usuarios:", err);
        setError("No se pudieron cargar los usuarios. Verifica tu conexión.");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser]);

  // Filtrar usuarios según término de búsqueda
  const filteredUsers = searchTerm 
    ? users.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : users;

  const handleStartChat = async (userId: string, userName: string) => {
    try {
      // Buscar si ya existe un chat privado con este usuario
      await createPrivateChat(userId);
      
      toast({
        title: "Chat con " + userName,
        description: "Se ha iniciado un chat con " + userName
      });
      
      onClose();
    } catch (error) {
      console.error("Error al crear chat:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el chat privado"
      });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-medium text-lg">Nuevo chat privado</h3>
      
      <Input
        placeholder="Buscar usuarios..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="text-center py-4">Cargando usuarios...</div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">{error}</div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-4">No se encontraron usuarios</div>
        ) : (
          <ul className="space-y-2">
            {filteredUsers.map(user => (
              <li 
                key={user.id}
                className="flex items-center justify-between p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md cursor-pointer"
                onClick={() => handleStartChat(user.id, user.name)}
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
                    <div className="text-xs text-gray-500">{user.role}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

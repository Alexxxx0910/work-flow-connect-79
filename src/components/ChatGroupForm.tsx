
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChat } from '@/contexts/ChatContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Loader2, RefreshCw } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { apiRequest } from '@/lib/api';

interface User {
  id: string;
  name: string;
  photoURL: string;
  role: string;
}

export const ChatGroupForm = ({ onClose }: { onClose: () => void }) => {
  const { createChat } = useChat();
  const [groupName, setGroupName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cargar usuarios desde la API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Corregir la ruta eliminando el "/api" duplicado
      const response = await apiRequest('/users/search');
      
      console.log("Respuesta de búsqueda de usuarios para grupo:", response);
      
      if (response && response.success && Array.isArray(response.users)) {
        setAllUsers(response.users);
        console.log("Usuarios cargados para grupo:", response.users.length);
        setError(null);
      } else {
        console.error("Formato de respuesta inválido:", response);
        throw new Error("Error al cargar usuarios");
      }
    } catch (err) {
      console.error("Error al cargar usuarios para grupo:", err);
      setError("No se pudieron cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);
  
  const filteredUsers = allUsers.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    !selectedUsers.some(selected => selected.id === user.id)
  );

  const handleSelectUser = (user: User) => {
    setSelectedUsers(prev => [...prev, user]);
    setSearchTerm('');
  };
  
  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(user => user.id !== userId));
  };
  
  const handleCreateGroup = async () => {
    if (selectedUsers.length < 1) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes seleccionar al menos un usuario para el chat"
      });
      return;
    }
    
    try {
      // Obtener los IDs de los usuarios seleccionados
      const participantIds = selectedUsers.map(user => user.id);
      
      // Crear el chat grupal
      await createChat(participantIds, groupName || undefined);
      
      toast({
        title: "Chat creado",
        description: "Se ha creado el chat grupal correctamente"
      });
      
      onClose();
    } catch (error) {
      console.error("Error al crear chat grupal:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo crear el chat grupal. Inténtalo de nuevo."
      });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <Label htmlFor="group-name">Nombre del grupo (opcional)</Label>
        <Input
          id="group-name"
          placeholder="Nombre del grupo"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="mt-1"
        />
      </div>
      
      {selectedUsers.length > 0 && (
        <div>
          <Label>Participantes seleccionados</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedUsers.map((user) => (
              <div 
                key={user.id}
                className="flex items-center bg-wfc-purple/10 text-wfc-purple rounded-full pl-1 pr-2 py-1 text-sm"
              >
                <Avatar className="h-5 w-5 mr-1">
                  <AvatarImage src={user.photoURL} alt={user.name} />
                  <AvatarFallback className="text-[10px] bg-wfc-purple-medium text-white">
                    {user.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {user.name}
                <button 
                  onClick={() => handleRemoveUser(user.id)}
                  className="ml-1 text-wfc-purple hover:text-wfc-purple-medium"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div>
        <Label htmlFor="search-users">Buscar usuarios</Label>
        <Input
          id="search-users"
          placeholder="Buscar por nombre"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mt-1"
        />
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-wfc-purple" />
          <span className="ml-2">Cargando usuarios...</span>
        </div>
      ) : error ? (
        <div className="text-center py-4">
          <p className="text-red-500">{error}</p>
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
      ) : searchTerm && (
        <div className="border rounded-md max-h-40 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <p className="text-sm text-gray-500 p-2">No se encontraron usuarios</p>
          ) : (
            <ul className="divide-y">
              {filteredUsers.map((user) => (
                <li 
                  key={user.id}
                  className="p-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                  onClick={() => handleSelectUser(user)}
                >
                  <div className="flex items-center">
                    <Avatar className="h-6 w-6 mr-2">
                      <AvatarImage src={user.photoURL} alt={user.name} />
                      <AvatarFallback className="text-xs bg-wfc-purple-medium text-white">
                        {user.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>{user.name}</span>
                  </div>
                  <Check className="h-4 w-4 text-gray-400" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      
      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button 
          onClick={handleCreateGroup} 
          className="bg-wfc-purple hover:bg-wfc-purple-medium"
        >
          Crear Chat
        </Button>
      </div>
    </div>
  );
};

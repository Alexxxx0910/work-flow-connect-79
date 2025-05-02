/**
 * Contexto de Autenticación
 * 
 * Este contexto proporciona funcionalidad de autenticación para la aplicación, incluyendo:
 * - Manejo de inicio de sesión y registro de usuarios
 * - Gestión del estado del usuario actual
 * - Actualización del perfil de usuario
 * - Cierre de sesión
 */

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { toast } from "@/components/ui/use-toast";
import { apiRequest, apiUpload } from "@/lib/api";
import { UserType } from "@/contexts/DataContext";
import { 
  saveToken, 
  getToken, 
  removeToken, 
  saveUserData, 
  removeUserData, 
  getUserData,
  clearSession 
} from "@/lib/authService";
import { disconnectSocket } from '@/lib/socket';

interface AuthContextType {
  currentUser: UserType | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: 'freelancer' | 'client') => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<UserType>) => Promise<void>;
  uploadProfilePhoto: (file: File) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Hook personalizado para acceder al contexto de autenticación
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Proveedor del contexto de autenticación
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserType | null>(getUserData());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar sesión al cargar
    const verifySession = async () => {
      const token = getToken();
      if (token) {
        try {
          const response = await apiRequest('/auth/verify');
          const user = response.user;
          setCurrentUser(user);
          saveUserData(user);
        } catch (error) {
          console.error('Error al verificar sesión:', error);
          clearSession();
        }
      }
      setLoading(false);
    };

    verifySession();
  }, []);

  /**
   * Función para iniciar sesión
   */
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await apiRequest('/auth/login', 'POST', { email, password });
      const { user, token } = response;
      
      // Guardar token y datos de usuario
      saveToken(token);
      saveUserData(user);
      setCurrentUser(user);
      
      toast({
        title: "Inicio de sesión exitoso",
        description: "Bienvenido a WorkFlowConnect",
      });
    } catch (error) {
      console.error('Error de inicio de sesión:', error);
      toast({
        variant: "destructive",
        title: "Error de inicio de sesión",
        description: error instanceof Error ? error.message : "Error al iniciar sesión",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Función para registrar nuevo usuario
   */
  const register = async (email: string, password: string, name: string, role: 'freelancer' | 'client' = 'freelancer') => {
    setLoading(true);
    try {
      const response = await apiRequest('/auth/register', 'POST', { 
        email, 
        password, 
        name,
        role 
      });
      
      const { user, token } = response;
      
      // Guardar token y datos de usuario
      saveToken(token);
      saveUserData(user);
      setCurrentUser(user);
      
      toast({
        title: "Registro exitoso",
        description: "¡Bienvenido a WorkFlowConnect!",
      });
    } catch (error) {
      console.error('Error de registro:', error);
      toast({
        variant: "destructive",
        title: "Error de registro",
        description: error instanceof Error ? error.message : "Error al registrar",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Función para cerrar sesión
   */
  const logout = async () => {
    try {
      // Llamar al endpoint de logout
      if (getToken()) {
        await apiRequest('/auth/logout', 'POST');
      }
      
      // Limpiar datos locales
      clearSession();
      disconnectSocket();
      setCurrentUser(null);
      
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Aún así, limpiamos los datos locales
      clearSession();
      setCurrentUser(null);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al cerrar sesión"
      });
    }
  };

  /**
   * Función para actualizar el perfil
   */
  const updateUserProfile = async (data: Partial<UserType>) => {
    if (!currentUser) throw new Error('No hay usuario autenticado');
    
    try {
      const response = await apiRequest('/users/profile', 'PUT', data);
      const updatedUser = response.user;
      
      saveUserData(updatedUser);
      setCurrentUser(updatedUser);
      
      toast({
        title: "Perfil actualizado",
        description: "Tus cambios han sido guardados",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al actualizar el perfil"
      });
      throw error;
    }
  };

  /**
   * Función para subir foto de perfil
   */
  const uploadProfilePhoto = async (file: File) => {
    if (!currentUser) throw new Error('No hay usuario autenticado');
    
    try {
      // Usamos apiUpload en lugar de implementar la lógica manualmente
      const data = await apiUpload('users/upload-photo', (() => {
        const formData = new FormData();
        formData.append('photo', file);
        return formData;
      })());
      
      const photoURL = data.photoURL;
      
      // Actualizar usuario con la nueva foto
      const updatedUser = { ...currentUser, photoURL };
      saveUserData(updatedUser);
      setCurrentUser(updatedUser);
      
      toast({
        title: "Foto actualizada",
        description: "Tu foto de perfil ha sido actualizada",
      });
      
      return photoURL;
    } catch (error) {
      console.error("Error en uploadProfilePhoto:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al subir la foto de perfil"
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        currentUser, 
        loading, 
        login, 
        register, 
        logout,
        updateUserProfile,
        uploadProfilePhoto
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;


import { toast } from '@/components/ui/use-toast';

// Constante para la URL base de la API
// En desarrollo, necesitamos la URL completa para evitar que Vite intercepte las solicitudes
const API_BASE_URL = import.meta.env.DEV 
  ? 'http://localhost:5000/api' 
  : '/api';

/**
 * Realiza una petición API con autenticación y manejo de errores.
 * 
 * @param endpoint Ruta a la que hacer la petición (sin /api inicial)
 * @param method Método HTTP (GET por defecto)
 * @param body Cuerpo de la petición para POST, PUT, etc.
 * @param showToast Mostrar toast de error si algo falla
 */
export const apiRequest = async (
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  showToast: boolean = true
) => {
  try {
    const token = localStorage.getItem('token');
    
    // Asegurar que el endpoint no comienza con /api (evitar duplicación)
    const normalizedEndpoint = endpoint.startsWith('/api/') 
      ? endpoint.substring(5) // Quitar /api/ al inicio
      : endpoint.startsWith('/') 
        ? endpoint.substring(1) // Quitar solo / al inicio
        : endpoint;

    const url = `${API_BASE_URL}/${normalizedEndpoint}`;
    
    console.log(`API Request: ${method} ${url}`, body);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const options: RequestInit = {
      method,
      headers,
      credentials: 'include',
    };
    
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `Error HTTP: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }
    
    // Verificar si la respuesta es HTML (lo que indica un problema con el servidor o proxy)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('Recibido HTML en lugar de JSON. Posible problema de configuración del servidor.');
      throw new Error('Error de configuración del servidor: recibido HTML en lugar de JSON');
    }
    
    const data = await response.json();
    console.log(`API Response: ${url}`, data);
    
    return data;
  } catch (error) {
    console.error("Error en la petición API:", error);
    
    if (showToast) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
    
    throw error;
  }
};

/**
 * Subir archivo o imagen mediante la API.
 * 
 * @param endpoint Ruta a la que hacer la petición
 * @param formData FormData con los archivos y otros campos
 * @param showToast Mostrar toast de error si algo falla
 */
export const apiUpload = async (
  endpoint: string,
  formData: FormData,
  showToast: boolean = true
) => {
  try {
    const token = localStorage.getItem('token');
    
    // Asegurar que el endpoint no comienza con /api (evitar duplicación)
    const normalizedEndpoint = endpoint.startsWith('/api/') 
      ? endpoint.substring(5) // Quitar /api/ al inicio
      : endpoint.startsWith('/') 
        ? endpoint.substring(1) // Quitar solo / al inicio
        : endpoint;
    
    const url = `${API_BASE_URL}/${normalizedEndpoint}`;
    
    console.log(`API Upload Request: POST ${url}`);
    
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `Error HTTP: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }
    
    // Verificar si la respuesta es HTML (lo que indica un problema con el servidor o proxy)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('Recibido HTML en lugar de JSON. Posible problema de configuración del servidor.');
      throw new Error('Error de configuración del servidor: recibido HTML en lugar de JSON');
    }
    
    const data = await response.json();
    console.log(`API Upload Response: ${url}`, data);
    
    return data;
  } catch (error) {
    console.error("Error en la petición de subida:", error);
    
    if (showToast) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
    
    throw error;
  }
};

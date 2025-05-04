
import { getToken } from './authService';

const API_URL = 'http://localhost:5000/api';

/**
 * Función para realizar peticiones HTTP a la API
 * @param endpoint - Ruta del endpoint (sin la base URL)
 * @param method - Método HTTP (GET, POST, PUT, DELETE)
 * @param body - Cuerpo de la petición (opcional)
 * @returns Promise con la respuesta de la API
 */
export async function apiRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
) {
  const token = getToken();
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  // Añadir token de autenticación si existe
  if (token) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  
  // Añadir cuerpo de la petición si existe
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    console.log(`API Request: ${method} ${API_URL}${endpoint}`, body);
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const contentType = response.headers.get('content-type');
    
    // Verificar si la respuesta es exitosa
    if (!response.ok) {
      let errorData;
      
      // Intentar obtener el mensaje de error como JSON si es posible
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json().catch(() => ({ 
          message: `Error HTTP: ${response.status} ${response.statusText}` 
        }));
      } else {
        errorData = { message: `Error HTTP: ${response.status} ${response.statusText}` };
      }
      
      const error = new Error(errorData.message || 'Error en la petición') as Error & {
        status: number;
        data: any;
      };
      error.status = response.status;
      error.data = errorData;
      throw error;
    }
    
    // Si la respuesta no contiene contenido o no es JSON, devolver un objeto vacío
    if (!contentType || !contentType.includes('application/json')) {
      console.log(`API Response (no JSON): ${API_URL}${endpoint}`, response.statusText);
      return { success: true };
    }
    
    const responseData = await response.json();
    console.log(`API Response: ${API_URL}${endpoint}`, responseData);
    return responseData;
  } catch (error) {
    console.error('Error en la petición API:', error);
    throw error;
  }
}

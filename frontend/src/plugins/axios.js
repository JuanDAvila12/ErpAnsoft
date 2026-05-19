import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_NODE_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar el token a cada petición
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Función helper para agregar errores al store
async function agregarErrorAlStore(errorData) {
  try {
    const { useErrorStore } = await import('@/stores/errorStore')
    const { addError } = useErrorStore()
    addError(errorData)
  } catch (e) {
    console.error('[Axios Error]', errorData, e)
  }
}

// Interceptor para manejar errores globales y enviarlos al store de errores
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      const data = error.response.data

      // Si el backend ya devuelve el formato { codigo, mensaje, modulo, detalle, timestamp }
      if (data && data.codigo) {
        agregarErrorAlStore({
          codigo: data.codigo,
          mensaje: data.mensaje || 'Error del servidor',
          modulo: data.modulo || 'Sistema',
          detalle: data.detalle || error.message,
          timestamp: data.timestamp || new Date().toISOString(),
        })
      } else {
        // Fallback: construir error a partir del status HTTP
        const status = error.response.status
        let codigo = 'SYS-001'
        let modulo = 'Sistema'
        let mensaje = data?.error || data?.mensaje || error.message

        if (status === 400) codigo = 'SYS-003'
        else if (status === 401) codigo = 'AUTH-001'
        else if (status === 403) codigo = 'AUTH-002'
        else if (status === 404) codigo = 'SYS-004'
        else if (status === 409) codigo = 'SYS-005'
        else if (status >= 500) codigo = 'SYS-002'

        agregarErrorAlStore({
          codigo,
          mensaje,
          modulo,
          detalle: `HTTP ${status}: ${error.message}`,
          timestamp: new Date().toISOString(),
        })
      }

      // Redirigir al login si no está autenticado
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = '/';
      }
    } else if (error.request) {
      // Error de red (sin respuesta del servidor)
      agregarErrorAlStore({
        codigo: 'SYS-002',
        mensaje: 'Error de conexión con el servidor',
        modulo: 'Sistema',
        detalle: `No se recibió respuesta del servidor: ${error.message}`,
        timestamp: new Date().toISOString(),
      })
    }

    return Promise.reject(error);
  }
);

export default apiClient;

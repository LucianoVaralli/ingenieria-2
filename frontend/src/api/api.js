import axios from 'axios';

// Creamos una instancia personalizada de Axios
const api = axios.create({
  // Esta es la URL base de tu FastAPI (puerto 8000)
    baseURL: 'http://127.0.0.1:8000',
});

// Este "interceptor" es mágico: antes de cada petición al servidor,
// se fija si tenés un token en el localStorage y lo pega en el header.
api.interceptors.request.use(
(config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
},
(error) => {
    return Promise.reject(error);
}
);

export default api;
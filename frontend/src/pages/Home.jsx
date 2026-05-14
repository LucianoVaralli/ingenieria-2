import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api.js';

const Home = () => {
const [user, setUser] = useState(null);
const navigate = useNavigate();

useEffect(() => {
    // Función para buscar los datos del usuario logueado
    const fetchUserData = async () => {
    try {
        // Gracias al interceptor en api.js, el token va solo en el header
        const res = await api.get('/socios/me'); // Ajustá este endpoint según tu backend
        setUser(res.data);
    } catch (err) {
        console.error("No se pudo obtener el usuario", err);
        // Si falla (ej: token vencido), lo mandamos al login
        navigate('/');
    }
    };

    fetchUserData();
}, [navigate]);

const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
};

return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
    <h1>Bienvenido a Sportify 🏋️‍♂️</h1>
    {user ? (
        <div>
            <p>Hola, <strong>{user.nombre}</strong>!</p>
            <p>Estado de tu cuota: {user.cuota_al_dia ? 'Al día' : 'Pendiente'}</p>
        </div>
    ) : (
        <p>Cargando datos del perfil...</p>
    )}
    
    <button 
        onClick={handleLogout}
        style={{ marginTop: '20px', backgroundColor: '#ff4444', color: 'white', border: 'none', padding: '10px 20px', cursor: 'pointer' }}
    >
        Cerrar Sesión
    </button>
    </div>
);
};

export default Home;
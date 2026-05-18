import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = ({ token }) => {
    const navigate = useNavigate();

    useEffect(() => {
        // Si no está logueado, rebota al login
        if (!token) {
            navigate('/login');
        }
    }, [token, navigate]);

    return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'white' }}>
            <h1>Bienvenido al Panel de Clases 🏋️‍♂️</h1>
            <p style={{ color: '#aaa', fontSize: '18px' }}>
                ¡Hola de nuevo! Este es tu espacio privado de Sportify.
            </p>

            <div style={{ marginTop: '50px', border: '2px dashed #555', padding: '40px', borderRadius: '15px' }}>
                <h3>[ Próximamente: Calendario Interactivo ]</h3>
                <p style={{ color: '#888' }}>
                    Acá tus compañeros van a renderizar el sistema de reservas para que puedas agendar tus días y horarios de entrenamiento.
                </p>
            </div>
        </div>
    );
};

export default Home;
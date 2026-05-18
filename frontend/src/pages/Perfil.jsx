import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import '../assets/css/Perfil.css';

const Perfil = ({ token, setToken }) => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            navigate('/login');
            return;
        }

        const fetchUserData = async () => {
            try {
                const res = await api.get('/socios/me');
                setUser(res.data);
            } catch (err) {
                console.error("No se pudo obtener el usuario", err);
                localStorage.removeItem('token');
                setToken(null);
                navigate('/login');
            }
        };

        fetchUserData();
    }, [token, navigate, setToken]);

    return (
        <div className="perfil-container">
            <h2 className="perfil-title">Mi Perfil de Socio 🪪</h2>

            {user ? (
                <div className="perfil-grid">
                    
                    {/* COLUMNA IZQUIERDA: Credencial */}
                    <div className="perfil-card">
                        <div className="perfil-avatar">
                            {user.nombre ? user.nombre.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <h3 className="perfil-nombre">{user.nombre}</h3>
                        
                        <div className={`badge-cuota ${user.cuota_al_dia ? 'badge-al-dia' : 'badge-pendiente'}`}>
                            Estado: {user.cuota_al_dia ? 'Cuota al Día ✅' : 'Matrícula Pendiente ❌'}
                        </div>

                        <p className="perfil-id">ID Socio: #2026{user.id || '01'}</p>
                    </div>

                    {/* COLUMNA DERECHA: Paneles Dinámicos */}
                    <div className="perfil-info-column">
                        
                        {/* Bloque Permanente: Reservas Activas */}
                        <div className="perfil-info-block">
                            <h4>📅 Mis Reservas Activas</h4>
                            <p>Actualmente no tenés turnos reservados para esta semana. ¡Andá al inicio para agendar una clase!</p>
                        </div>

                        {/* DESPLEGABLE: Información Personal */}
                        <details className="perfil-desplegable">
                            <summary>👤 Mis Datos Personales</summary>
                            <div className="perfil-desplegable-content">
                                <div className="dato-fila">
                                    <span className="dato-label">Email:</span>
                                    <span className="dato-valor">{user.email || 'No registrado'}</span>
                                </div>
                                <div className="dato-fila">
                                    <span className="dato-label">DNI / Documento:</span>
                                    <span className="dato-valor">{user.dni || '38.442.123'}</span> {/* Placeholder por si no está en el modelo */}
                                </div>
                                <div className="dato-fila">
                                    <span className="dato-label">Teléfono de Contacto:</span>
                                    <span className="dato-valor">{user.telefono || '221-555-4321'}</span> {/* Placeholder por si no está en el modelo */}
                                </div>

                                {/* Botón de seguridad adentro del mismo bloque */}
                                <button className="btn-cambiar-pass" disabled>
                                    🔒 Cambiar Contraseña (Próximamente)
                                </button>
                            </div>
                        </details>

                    </div>

                </div>
            ) : (
                <div style={{ textAlign: 'center', marginTop: '50px', color: '#aaa' }}>
                    <p>Cargando panel de socio...</p>
                </div>
            )}
        </div>
    );
};

export default Perfil;
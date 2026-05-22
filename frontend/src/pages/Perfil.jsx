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
            {user ? (
                <>
                    {/* ── HERO ── */}
                    <div className="perfil-hero">
                        <div className="perfil-hero-bg" />
                        <div className="perfil-hero-inner">
                            <div className="perfil-avatar">
                                {user.nombre ? user.nombre.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div className="perfil-hero-info">
                                <h2 className="perfil-nombre">{user.nombre}</h2>
                                <p className="perfil-id">ID Socio · #2026{user.id || '01'}</p>
                            </div>
                            <div className={`badge-cuota ${user.cuota_al_dia ? 'badge-al-dia' : 'badge-pendiente'}`}>
                                {user.cuota_al_dia ? '✓ Cuota al Día' : '⚠ Matrícula Pendiente'}
                            </div>
                        </div>
                    </div>

                    {/* ── DATOS PERSONALES ── */}
                    <div className="perfil-datos-row">
                        <div className="dato-item">
                            <span className="dato-label">Email</span>
                            <span className="dato-valor">{user.email || 'No registrado'}</span>
                        </div>
                        <div className="dato-item">
                            <span className="dato-label">DNI</span>
                            <span className="dato-valor">{user.dni || '—'}</span>
                        </div>
                        <div className="dato-item">
                            <span className="dato-label">Teléfono</span>
                            <span className="dato-valor">{user.telefono || '—'}</span>
                        </div>
                        <button className="btn-cambiar-pass" disabled>
                            🔒 Cambiar Contraseña
                        </button>
                    </div>

                    {/* ── RESERVAS ── */}
                    <div className="perfil-reservas-section">
                        <div className="perfil-section-header">
                            <span className="perfil-section-icon">📅</span>
                            <h3 className="perfil-section-title">Mis Reservas Activas</h3>
                        </div>

                        <div className="perfil-reservas-scroll">
                            {/* Estado vacío — reemplazá con tu map cuando tengas datos */}
                            <div className="reserva-empty">
                                <span className="reserva-empty-icon">🏋️</span>
                                <p>No tenés turnos reservados para esta semana.</p>
                                <span>Andá al inicio para agendar una clase</span>
                            </div>

                            {/* Cuando tengas reservas:
                            {reservas.map(r => (
                                <div className="reserva-card" key={r.id}>
                                    <div className="reserva-card-day">{r.dia}</div>
                                    <div className="reserva-card-body">
                                        <span className="reserva-card-clase">{r.nombre_clase}</span>
                                        <span className="reserva-card-horario">{r.horario}</span>
                                        <span className="reserva-card-profe">Prof. {r.profesor}</span>
                                    </div>
                                    <button className="reserva-card-cancel">Cancelar</button>
                                </div>
                            ))} */}
                        </div>
                    </div>
                </>
            ) : (
                <div className="perfil-loading">
                    <div className="perfil-loading-spinner" />
                    <p>Cargando panel de socio...</p>
                </div>
            )}
        </div>
    );
};

export default Perfil;
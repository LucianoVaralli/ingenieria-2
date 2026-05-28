import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import '../assets/css/Perfil.css';

 
const Perfil = ({ token, setToken }) => {
    const [user,     setUser]     = useState(null);
    const [reservas, setReservas] = useState([]);
    const navigate = useNavigate();
 
    useEffect(() => {
        if (!token) { navigate('/login'); return; }
 
        // Cargamos datos del usuario y sus reservas en paralelo
        const fetchData = async () => {
            try {
                const [resUser, resReservas] = await Promise.all([
                    api.get('/socios/me'),
                    api.get('/reservas/mis-reservas'),
                ]);
                setUser(resUser.data);
                // Solo mostramos reservas confirmadas y futuras
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);
                const activas = resReservas.data.filter(r =>
                    r.estado === 'confirmada' &&
                    new Date(r.fecha_clase) >= hoy
                );
                setReservas(activas);
            } catch (err) {
                console.error("Error cargando perfil", err);
                localStorage.removeItem('token');
                setToken(null);
                navigate('/login');
            }
        };
 
        fetchData();
    }, [token, navigate, setToken]);
 
    // Cancelar una reserva
    /*const handleCancelar = async (reservaId) => {
        if (!window.confirm('¿Seguro que querés cancelar esta reserva?')) return;
        try {
            await api.post(`/reservas/membresia/cancelar/${reservaId}`);
            // La sacamos del estado local sin recargar la página
            setReservas(prev => prev.filter(r => r.id !== reservaId));
        } catch (err) {
            alert(err.response?.data?.detail || 'No se pudo cancelar la reserva.');
        }
    }; */

    return (
        <div className="perfil-container">
            <div className='perfil-layout'>
        
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

                    {/* ── ACTA MÉDICA ── */}
                    <div className="perfil-acta-section">
                        <div className="perfil-section-header">
                            <span className="perfil-section-icon">🩺</span>
                            <h3 className="perfil-section-title">Apto Físico</h3>
                        </div>

                        {user.apto_fisico ? (
                            <a
                                href={`http://localhost:8000/${user.apto_fisico}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn-ver-acta"
                            >
                                Ver PDF
                            </a>
                        ) : (
                            <p className="acta-faltante">
                                No tenés un apto físico cargado.
                            </p>
                        )}
                    </div>

                    {/* ── RESERVAS ── */}
                    <div className="perfil-reservas-section">
                        <div className="perfil-section-header">
                            <span className="perfil-section-icon">📅</span>
                            <h3 className="perfil-section-title">Mis Reservas Activas</h3>
                            {/* Contador de reservas */}
                            {reservas.length > 0 && (
                                <span className="perfil-reservas-count">{reservas.length}</span>
                            )}
                        </div>
 
                        <div className="perfil-reservas-scroll">
                            {reservas.length === 0 ? (
                                /* Estado vacío */
                                <div className="reserva-empty">
                                    <span className="reserva-empty-icon">🏋️</span>
                                    <p>No tenés turnos reservados para esta semana.</p>
                                    <Link to="/" className="reserva-empty-link">
                                        Andá al inicio para agendar una clase
                                    </Link>
                                </div>
                            ) : (
                                /* Cards de reservas reales */
                                reservas.map(r => (
                                    <div className="reserva-card" key={r.id}>
                                        {/* Fecha */}
                                        <div className="reserva-card-day">
                                            {new Date(r.fecha_clase + 'T00:00:00').toLocaleDateString('es-AR', {
                                                weekday: 'short',
                                                day:     'numeric',
                                                month:   'short',
                                            })}
                                        </div>
                                        <div className="reserva-card-body">
                                            {/* El backend devuelve clase_id, pero necesitamos
                                                el nombre. Si tu endpoint /mis-reservas devuelve
                                                objetos con relación a clase, usá r.clase.actividad.
                                                Si no, mostramos lo que haya disponible. */}
                                            <span className="reserva-card-clase">
                                                {r.clase?.actividad || `Clase #${r.clase_id}`}
                                            </span>
                                            <span className="reserva-card-horario">
                                                {r.clase?.horario
                                                    ? r.clase.horario.slice(0, 5)
                                                    : '—'}
                                            </span>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                
                                                <span className="reserva-card-tipo">
                                                    {r.tipo === 'membresia'
                                                        ? '📋 Membresía'
                                                        : '🎫 Individual'}
                                                </span>

                                                {r.lista_espera && (
                                                    <span
                                                        style={{
                                                            background: '#00ff1e',
                                                            color: 'black',
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            fontWeight: 'bold',
                                                            width: 'fit-content'
                                                        }}
                                                    >
                                                        Lista de espera
                                                    </span>
                                                )}

                                            </div>


                                        </div>
                                        {/*<button
                                            className="reserva-card-cancel"
                                            onClick={() => handleCancelar(r.id)}
                                        >
                                            Cancelar
                                        </button>
                                        */}
                                    </div>
                                ))
                            )}
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
        </div>
    );
};
 
export default Perfil;
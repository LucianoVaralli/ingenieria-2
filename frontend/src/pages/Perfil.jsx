import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import '../assets/css/Perfil.css';

const Perfil = ({ token, setToken }) => {
    const [user,     setUser]     = useState(null);
    const [reservas, setReservas] = useState([]);
    const navigate = useNavigate();
    const [alertaIndividual, setAlertaIndividual] = useState([]);
    const [mensajeExito, setMensajeExito] = useState("");

    const salirListaEspera = async (reservaId) => {
        try {

            await api.delete(
                `/reservas/lista-espera/cancelar/${reservaId}`
            );

            setReservas(prev =>
                prev.filter(r => r.id !== reservaId)
            );

            setMensajeExito("Baja exitosa");

        } catch (error) {

            console.error(error);

            alert("No se pudo salir de la lista de espera");
        }
    };


    useEffect(() => {
        if (!token) { navigate('/login'); return; }

        const fetchData = async () => {
            try {
                const [resUser, resReservas] = await Promise.all([
                    api.get('/socios/me'),
                    api.get('/reservas/mis-reservas'),
                ]);

                setUser(resUser.data);

                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);

                const activas = resReservas.data.filter(r =>
                    r.estado === 'confirmada' &&
                    new Date(r.fecha_clase) >= hoy
                );

                setReservas(activas);

                // ALERTAS EN OTRO TRY (IMPORTANTE)
                try {
                    const resAlertas = await api.get('/reservas/alertas-individuales');
                    setAlertaIndividual(resAlertas.data);
                } catch (e) {
                    console.log("sin alertas, no rompe sesión");
                    setAlertaIndividual([]);
                }

            } catch (err) {
                console.error("Error cargando perfil", err);
                localStorage.removeItem('token');
                setToken(null);
                navigate('/login');
            }
        };
        fetchData();
    }, [token, navigate, setToken]);

    // ── LÓGICA DE AGRUPACIÓN PARA LA AGENDA SEMANAL ──
    const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const mapeoDias = { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };

    const reservasPorDia = diasSemana.reduce((acc, dia) => {
        acc[dia] = [];
        return acc;
    }, {});

    [...reservas]
        .sort((a, b) => {
            const momentoA = `${a.fecha_clase}T${a.clase?.horario || '00:00:00'}`;
            const momentoB = `${b.fecha_clase}T${b.clase?.horario || '00:00:00'}`;
            return momentoA.localeCompare(momentoB);
        })
        .forEach(r => {
            const fecha = new Date(r.fecha_clase + 'T00:00:00');
            const nombreDia = mapeoDias[fecha.getDay()];
            if (reservasPorDia[nombreDia]) {
                reservasPorDia[nombreDia].push(r);
            }
        });


    return (
        
        <div className="perfil-container">
            {user ? (
                <>
                    {/* ── BLOQUE 1: INFORMACIÓN DEL SOCIO (Estructura superior aislada) ── */}
                    <div className="perfil-info-block">
                        {/* HERO */}
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
                            </div>
                        </div>

                        {/* DATOS PERSONALES */}
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
                            {user.rol === 'Miembro' && (
                                <div className="dato-item">
                                    <span className="dato-label">Créditos disponibles</span>
                                    <span className="dato-valor">
                                        🎟️ {user.creditos_disponibles || 0}
                                    </span>
                                </div>
                            )}
                            <button className="btn-cambiar-pass" disabled>
                                🔒 Cambiar Contraseña
                            </button>
                        </div>
                        
                        {/* APTO FÍSICO */}
                        {!user.rol === 'Profesor' && (
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
                        )}
                    </div>
                    
                    {/* ── BLOQUE 2: CALENDARIO DE RESERVAS (Totalmente independiente) ── */}
                    {!user.rol === 'Profesor' && (
                        <div className="perfil-calendar-block">
                            <div className="perfil-reservas-section">
                                <div className="perfil-section-header">
                                    <span className="perfil-section-icon">📅</span>
                                    <h3 className="perfil-section-title">Mis Reservas Activas</h3>
                                    {reservas.length > 0 && (
                                        <span className="perfil-reservas-count">{reservas.length}</span>
                                    )}
                                </div>

                                {reservas.length === 0 ? (
                                    <div className="reserva-empty">
                                        <span className="reserva-empty-icon">🏋️</span>
                                        <p>No tenés turnos reservados para esta semana.</p>
                                        <Link to="/" className="reserva-empty-link">
                                            Andá al inicio para agendar una clase
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="perfil-agenda-container">
                                        {diasSemana.map(dia => {
                                            const clasesDelDia = reservasPorDia[dia];
                                            return (
                                                <div className="agenda-columna" key={dia}>
                                                    <div className="agenda-columna-header">
                                                        <h4>{dia}</h4>
                                                        <span className={`agenda-badge ${clasesDelDia.length > 0 ? 'active' : ''}`}>
                                                            {clasesDelDia.length}
                                                        </span>
                                                    </div>

                                                    <div className="agenda-columna-body">
                                                        {clasesDelDia.length === 0 ? (
                                                            <p className="agenda-columna-vacio">Sin clases</p>
                                                        ) : (
                                                            clasesDelDia.map(r => (
                                                                <div className="reserva-card-mini" key={r.id}>
                                                                    <div className="reserva-mini-fecha">
                                                                        {new Date(r.fecha_clase + 'T00:00:00').toLocaleDateString('es-AR', {
                                                                            day: 'numeric',
                                                                            month: 'short',
                                                                        })}
                                                                    </div>
                                                                    
                                                                    <div className="reserva-mini-detalles">
                                                                        <span className="reserva-mini-actividad">
                                                                            {r.clase?.actividad || `Clase #${r.clase_id}`}
                                                                        </span>
                                                                        <span className="reserva-mini-horario">
                                                                            {r.clase?.horario ? r.clase.horario.slice(0, 5) : '—'} hs
                                                                        </span>
                                                                        <span className="reserva-mini-tipo">
                                                                            {r.tipo === 'membresia' ? '📋 Memb.' : '🎫 Indiv.'}
                                                                        </span>

                                                                        {r.lista_espera && (
                                                                            <span className="reserva-mini-espera">
                                                                                En Espera
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {!user.rol === 'Profesor' && (
                        <Link to="/historial-pagos" className="btn-historial">
                            💳 Ver historial de pagos
                        </Link>
                    )}
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
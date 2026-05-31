import React, { useEffect, useState } from "react";
import api from "../api/api.js";
import "../assets/css/Notificaciones.css";

function Notificaciones() {
    const [notificaciones,          setNotificaciones]          = useState([]);
    const [notificacionSeleccionada, setNotificacionSeleccionada] = useState(null);

    useEffect(() => { cargarNotificaciones(); }, []);

    const cargarNotificaciones = async () => {
        try {
            const res = await api.get("/notificaciones/me");
            setNotificaciones(res.data);
        } catch (error) {
            console.error("Error cargando notificaciones", error);
        }
    };

    const abrirNotificacion = async (notif) => {
        setNotificacionSeleccionada(notif);
        if (!notif.leida) {
            try {
                await api.put(`/notificaciones/${notif.id}/leer`);
                setNotificaciones(prev =>
                    prev.map(n => n.id === notif.id ? { ...n, leida: true } : n)
                );
            } catch (error) {
                console.error("Error marcando notificación", error);
            }
        }
    };

    const noLeidas = notificaciones.filter(n => !n.leida).length;

    return (
        <div className="notificaciones-page">

            {/* ── ENCABEZADO ── */}
            <div className="notificaciones-header">
                <div className="notificaciones-label">Centro de mensajes</div>
                <h1 className="notificaciones-titulo">
                    Notificaciones
                    {noLeidas > 0 && (
                        <span style={{
                            marginLeft: '12px',
                            fontSize: '13px',
                            color: '#5CB84D',
                            fontWeight: '400',
                            fontStyle: 'italic'
                        }}>
                            {noLeidas} sin leer
                        </span>
                    )}
                </h1>
            </div>

            {/* ── LISTA ── */}
            {notificaciones.length === 0 ? (
                <div className="notificaciones-vacio">
                    <span className="notificaciones-vacio-icon">🔔</span>
                    <p>No tenés notificaciones por ahora.</p>
                </div>
            ) : (
                <div className="notificaciones-lista">
                    {notificaciones.map((notif) => (
                        <div
                            key={notif.id}
                            className={`notificacion-card ${notif.leida ? 'leida' : 'no-leida'}`}
                            onClick={() => abrirNotificacion(notif)}
                        >
                            <div className="notificacion-card-top">
                                <h3>{notif.titulo}</h3>
                                {!notif.leida && (
                                    <span className="notificacion-badge-nueva">Nueva</span>
                                )}
                            </div>
                            <p>
                                {notif.mensaje.length > 80
                                    ? notif.mensaje.substring(0, 80) + '...'
                                    : notif.mensaje}
                            </p>
                            <small>{new Date(notif.fecha).toLocaleString()}</small>
                        </div>
                    ))}
                </div>
            )}

            {/* ── MODAL DETALLE ── */}
            {notificacionSeleccionada && (
                <div
                    className="notificacion-overlay"
                    onClick={() => setNotificacionSeleccionada(null)}
                >
                    <div
                        className="notificacion-detalle"
                        onClick={e => e.stopPropagation()}
                    >
                        <h2>{notificacionSeleccionada.titulo}</h2>
                        <p>{notificacionSeleccionada.mensaje}</p>
                        <small>{new Date(notificacionSeleccionada.fecha).toLocaleString()}</small>
                        <button
                            className="notificacion-detalle-cerrar"
                            onClick={() => setNotificacionSeleccionada(null)}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Notificaciones;

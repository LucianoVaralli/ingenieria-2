import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import '../assets/css/HistorialPagos.css';

const HistorialPagos = () => {
    const navigate  = useNavigate();
    const [reservas, setReservas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [filtro,   setFiltro]   = useState('todos');

    useEffect(() => {
        const fetchReservas = async () => {
            try {
                const res = await api.get('/reservas/mis-reservas');
                setReservas(res.data.filter(r => r.estado === 'confirmada'));
            } catch (err) {
                console.error('Error cargando historial', err);
            } finally {
                setCargando(false);
            }
        };
        fetchReservas();
    }, []);

    // Filtramos estrictamente por el tipo de reserva para los botones superiores
    const reservasFiltradas = reservas.filter(r => {
        if (filtro === 'todos')    return true;
        if (filtro === 'completo') return r.tipo === 'membresia';
        if (filtro === 'parcial')  return r.tipo === 'individual';
        return true;
    });

    const totalPagado = reservas.reduce((sum, r) => sum + (r.monto_pagado || 0), 0);

    const formatFecha = (str) => {
        if (!str) return '—';
        return new Date(str).toLocaleDateString('es-AR', {
            day: 'numeric', month: 'short', year: 'numeric'
        });
    };

    const formatHora = (str) => str?.slice(0, 5) || '—';

    const emojiActividad = { yoga: '🧘', pilates: '🤸', funcional: '⚡' };

    return (
        <div className="historial-page">

            {/* ── ENCABEZADO ── */}
            <div className="historial-header">
                <button className="historial-back" onClick={() => navigate('/perfil')}>
                    ← Volver al perfil
                </button>
                <div>
                    <div className="historial-label">Mi cuenta</div>
                    <h1 className="historial-titulo">Historial de Pagos</h1>
                </div>
            </div>

            {/* ── STATS ── */}
            <div className="historial-stats">
                <div className="historial-stat">
                    <div className="historial-stat-label">Total pagado</div>
                    <div className="historial-stat-value">${totalPagado.toFixed(2)}</div>
                </div>
                <div className="historial-stat">
                    <div className="historial-stat-label">Membresías</div>
                    <div className="historial-stat-value">
                        {reservas.filter(r => r.tipo === 'membresia').length}
                    </div>
                </div>
                <div className="historial-stat">
                    <div className="historial-stat-label">Individuales</div>
                    <div className="historial-stat-value historial-stat-value--parcial">
                        {reservas.filter(r => r.tipo === 'individual').length}
                    </div>
                </div>
            </div>

            {/* ── FILTROS ── */}
            <div className="historial-filtros">
                {[
                    { key: 'todos',    label: 'Todos'         },
                    { key: 'completo', label: 'Membresías'    },
                    { key: 'parcial',  label: 'Individuales'  },
                ].map(f => (
                    <button
                        key={f.key}
                        className={`historial-filtro ${filtro === f.key ? 'historial-filtro--activo' : ''}`}
                        onClick={() => setFiltro(f.key)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* ── LISTA ── */}
            {cargando ? (
                <div className="historial-loading">
                    <div className="historial-spinner" />
                    <p>Cargando historial...</p>
                </div>
            ) : reservasFiltradas.length === 0 ? (
                <div className="historial-vacio">
                    <span>💳</span>
                    <p>No hay pagos para mostrar.</p>
                </div>
            ) : (
                <div className="historial-lista">
                    {reservasFiltradas.map(r => {
                        const actividad = r.clase?.actividad || 'Clase';
                        const emoji     = emojiActividad[actividad.toLowerCase()] || '🏋️';
                        
                        // Una clase es pago parcial SOLO si es individual Y todavía debe plata
                        const parcial   = r.tipo === 'individual' && (r.monto_pagado < r.monto_total);
                        
                        const descuento = (r.monto_total > r.monto_pagado && !parcial)
                            ? r.monto_total - r.monto_pagado
                            : 0;

                        return (
                            <div
                                key={r.id}
                                className={`historial-card ${parcial ? 'historial-card--parcial' : ''}`}
                            >
                                {/* Izquierda */}
                                <div className="historial-card-left">
                                    <span className="historial-card-emoji">{emoji}</span>
                                    <div>
                                        <span className="historial-card-actividad">
                                            {actividad.charAt(0).toUpperCase() + actividad.slice(1)}
                                        </span>
                                        <span className="historial-card-tipo">
                                            {r.tipo === 'individual' ? 'Clase individual' : 'Membresía mensual'}
                                        </span>
                                        <span className="historial-card-fecha">
                                            {r.clase?.dia
                                                ? `${r.clase.dia.charAt(0).toUpperCase() + r.clase.dia.slice(1)} · `
                                                : ''}
                                            {formatFecha(r.fecha_clase)} · {formatHora(r.clase?.horario)}
                                        </span>
                                    </div>
                                </div>

                                {/* Derecha */}
                                <div className="historial-card-right">
                                    <span className="historial-card-monto">
                                        ${(r.monto_pagado || 0).toFixed(2)}
                                    </span>

                                    {/* Descuento membresía */}
                                    {descuento > 0 && (
                                        <span className="historial-card-descuento">
                                            Descuento: -${descuento.toFixed(2)}
                                        </span>
                                    )}

                                    {/* Individual parcial: falta pagar el 50% restante */}
                                    {parcial && (
                                        <>
                                            <span className="historial-card-porcentaje">
                                                50% abonado al reservar
                                            </span>
                                            <span className="historial-card-pendiente">
                                                Resta: ${(r.monto_total - (r.monto_pagado || 0)).toFixed(2)} al asistir
                                            </span>
                                        </>
                                    )}

                                    {/* Badge de estado dinámico */}
                                    {parcial ? (
                                        <span className="historial-card-estado historial-card-estado--pendiente">
                                            ⏳ Pago parcial
                                        </span>
                                    ) : (
                                        <span className="historial-card-estado historial-card-estado--ok">
                                            ✓ Pagado
                                        </span>
                                    )}

                                    {r.fecha_pago && (
                                        <span className="historial-card-fecha-pago">
                                            {formatFecha(r.fecha_pago)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default HistorialPagos;
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import '../assets/css/Reserva.css';

const formatearHora = (hora) => hora?.slice(0, 5);

const ReservaMembresia = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const { clase, fechasDelMes } = location.state || {};

    // pasos: lista_espera | creditos | pago_confirmacion | error
    const [paso,         setPaso]         = useState('lista_espera');
    const [mensaje,      setMensaje]      = useState('');
    const [cargando,     setCargando]     = useState(false);
    const [datosReserva, setDatosReserva] = useState(null);
    const [creditos,     setCreditos]     = useState(0);

    useEffect(() => {
        const inicializar = async () => {
            if (!clase || !fechasDelMes) return;
            setCargando(true);
            try {
                const hoyDate = new Date();
                hoyDate.setHours(0, 0, 0, 0);
                const fechasFuturas = fechasDelMes.filter(f => new Date(f) >= hoyDate);

                const [perfilRes, cotizarRes] = await Promise.all([
                    api.get('/socios/me'),
                    api.post('/reservas/membresia/crear', {
                        clase_id:         clase.id,
                        fechas_clase:     fechasFuturas,
                        total_clases_mes: fechasDelMes.length,
                    })
                ]);

                const creditosActuales = perfilRes.data.creditos_disponibles || 0;
                setCreditos(creditosActuales);
                setDatosReserva({ ...cotizarRes.data, acepta_espera: true });

                if (cotizarRes.data.hay_lista_espera) {
                    setPaso('lista_espera');
                } else if (creditosActuales > 0) {
                    setPaso('creditos');
                } else {
                    setPaso('ir_pago'); // ← nuevo paso que navega directo
                }
            } catch (err) {
                setMensaje(err.response?.data?.detail || 'Error inesperado');
                setPaso('error');
            } finally {
                setCargando(false);
            }
        };

        inicializar();
    }, []);

    if (!clase || !fechasDelMes) {
        return (
            <div className="reserva-empty-state">
                <span className="reserva-empty-icon">📭</span>
                <p>No hay clase seleccionada.</p>
                <button className="boton-accion" onClick={() => navigate('/')}>Volver al inicio</button>
            </div>
        );
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const clasesPerdidas = fechasDelMes.filter(f => new Date(f) < hoy).length;
    const clasesFuturas  = fechasDelMes.length - clasesPerdidas;

    const emojiDisciplina = {
        yoga: '🧘', pilates: '🤸', funcional: '⚡'
    }[clase.actividad?.toLowerCase()] || '🏋️';

    const descuento  = Number(datosReserva?.descuento_aplicado ?? 0);
    const montoFinal = datosReserva?.monto_total ?? (clase.precio_individual * fechasDelMes.length);

    // ─────────────────────────────────────────────
    // Llamar al backend para cotizar
    // ─────────────────────────────────────────────
    const handleCotizar = async (aceptaEspera) => {
        setCargando(true);
        try {
            const fechasFuturas = fechasDelMes.filter(f => new Date(f) >= hoy);

            if (fechasFuturas.length === 0) {
                setMensaje('No quedan clases futuras para este mes.');
                setPaso('error');
                return;
            }

            const res = await api.post('/reservas/membresia/crear', {
                clase_id:         clase.id,
                fechas_clase:     fechasFuturas,
                total_clases_mes: fechasDelMes.length,
            });

            setDatosReserva({ ...res.data, acepta_espera: aceptaEspera });
            if (creditos > 0) {
                setPaso('creditos');
            } else {
                setPaso('ir_pago');
            }
        } catch (err) {
            setMensaje(err.response?.data?.detail || 'Error inesperado');
            setPaso('error');
        } finally {
            setCargando(false);
        }
    };

    const handleAceptarEspera = () => {
        if (creditos > 0) {
            setPaso('creditos');
        } else {
            setPaso('ir_pago');
        }
    };

    // ─────────────────────────────────────────────
    // Desde créditos → ir al pago
    // ─────────────────────────────────────────────
    const handleContinuarDesdeCreditos = () => {
        setPaso('ir_pago');
    };

    // ─────────────────────────────────────────────
    // Botón volver
    // ─────────────────────────────────────────────
    const handleVolver = () => {
        if (paso === 'creditos') return setPaso('lista_espera');
        navigate(-1);
    };


    return (
        <div className="reserva-page">
            <div className="reserva-page-header">
                <button className="reserva-back" onClick={handleVolver}>← Volver</button>
                <span className="reserva-page-label">Membresía mensual</span>
            </div>

            <div className="reserva-layout">

                {/* COLUMNA IZQUIERDA */}
                <div className="reserva-info-col">
                    <div className="reserva-clase-hero">
                        <div className="reserva-clase-emoji">{emojiDisciplina}</div>
                        <div>
                            <h2 className="reserva-clase-nombre">{clase.actividad}</h2>
                            <p className="reserva-clase-sub">{clase.dia} · {formatearHora(clase.horario)}</p>
                        </div>
                    </div>

                    <div className="reserva-desglose">
                        <div className="reserva-desglose-titulo">Desglose del mes</div>
                        <div className="reserva-desglose-fila">
                            <span>Clases del mes</span>
                            <span>{fechasDelMes.length}</span>
                        </div>
                        <div className="reserva-desglose-fila">
                            <span>Precio por clase</span>
                            <span>${clase.precio_individual}</span>
                        </div>
                        <div className="reserva-desglose-fila">
                            <span>Clases Activas</span>
                            <span>{clasesFuturas}</span>
                        </div>
                        {clasesPerdidas > 0 && (
                            <div className="reserva-desglose-fila reserva-desglose-fila--descuento">
                                <span>Descuento ({clasesPerdidas} clase{clasesPerdidas > 1 ? 's' : ''} perdida{clasesPerdidas > 1 ? 's' : ''})</span>
                                <span>-${Number(descuento).toFixed(2)}</span>
                            </div>
                        )}
                        {datosReserva?.creditos_a_usar > 0 && (
                            <div className="reserva-desglose-fila reserva-desglose-fila--descuento">
                                <span>🎟️ Créditos ({datosReserva.creditos_a_usar} clase{datosReserva.creditos_a_usar > 1 ? 's' : ''} gratis)</span>
                                <span>-${Number(datosReserva.descuento_creditos || 0).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="reserva-desglose-total">
                            <span>Total</span>
                            <span>${Number(montoFinal).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA */}
                <div className="reserva-accion-col">
                    {paso === 'cargando' && (
                        <div className="reserva-accion-card" style={{ textAlign: 'center' }}>
                            <span className="reserva-spinner" />
                        </div>
                    )}

                    {paso === 'ir_pago' && (() => {
                        navigate('/pago', {
                            state: {
                                monto:             datosReserva.monto_total,
                                fechasConCupo:     datosReserva.fechas_con_cupo,
                                fechasSinCupo:     datosReserva.fechas_sin_cupo ?? [],
                                aceptaListaEspera: datosReserva.acepta_espera ?? false,
                                claseInfo:         clase,
                                claseId:           clase.id,
                                creditosUsados:    datosReserva.creditos_a_usar ?? 0,
                            }
                        });
                        return null;
                    })()}
                    {/* PASO 1: lista de espera */}
                    {paso === 'lista_espera' && (
                        <div className="reserva-accion-card">
                            <div className="reserva-espera-icon">⚠️</div>
                            <h3 className="reserva-accion-titulo">Algunas fechas sin cupo</h3>
                            <p className="reserva-accion-desc">
                                Es posible que algunas clases del mes no tengan lugares disponibles.
                                Si querés entrar en lista de espera para esas fechas, te avisamos cuando se libere un cupo.
                            </p>
                            <div className="reserva-fechas">
                                <span className="reserva-fechas-label">Clases del mes</span>
                                <div className="reserva-fechas-lista">
                                    {fechasDelMes
                                        .filter(f => new Date(f) >= hoy)
                                        .map(f => {
                                            const fecha = new Date(f + 'T00:00:00');
                                            return (
                                                <span key={f} className="reserva-fecha-chip">
                                                    {fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                                </span>
                                            );
                                        })
                                    }
                                </div>
                            </div>
                            <div className="reserva-espera-botones">
                                <button className="boton-accion" onClick={() => handleCotizar(true)} disabled={cargando}>
                                    {cargando ? <span className="reserva-spinner" /> : 'Acepto entrar en espera si es necesario'}
                                </button>
                                <button className="boton-cancelar" onClick={() => navigate('/')} disabled={cargando}>
                                    No, volver al inicio
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PASO 2: créditos */}
                    {paso === 'creditos' && (
                        <div className="reserva-accion-card">
                            {creditos > 0 ? (
                                <>
                                    <div className="pago-credito-icon">🎟️</div>
                                    <h3 className="reserva-accion-titulo">Tenés créditos disponibles</h3>
                                    <p className="reserva-accion-desc">
                                        Tenés <strong>{creditos} crédito{creditos > 1 ? 's' : ''}</strong> disponible{creditos > 1 ? 's' : ''}.
                                        {datosReserva?.creditos_a_usar > 0
                                            ? ` Se aplicarán ${datosReserva.creditos_a_usar} a esta membresía.`
                                            : ' No alcanzan para cubrir clases adicionales.'}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h3 className="reserva-accion-titulo">Sin créditos disponibles</h3>
                                    <p className="reserva-accion-desc">
                                        No tenés créditos. Continuá para abonar la membresía.
                                    </p>
                                </>
                            )}
                            <button className="boton-accion" onClick={handleContinuarDesdeCreditos} disabled={cargando}>
                                {datosReserva?.monto_total === 0 ? 'Confirmar sin pago →' : 'Continuar al pago →'}
                            </button>
                        </div>
                    )}

                    {/* PASO: error */}
                    {paso === 'error' && (
                        <div className="reserva-accion-card reserva-accion-card--error">
                            <div className="reserva-error-icon">✕</div>
                            <h3 className="reserva-accion-titulo">{mensaje}</h3>
                            <button className="boton-cancelar" onClick={() => navigate('/')}>
                                Volver al inicio
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ReservaMembresia;

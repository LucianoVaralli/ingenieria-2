import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import '../assets/css/Reserva.css';

const formatearHora = (hora) => hora?.slice(0, 5);

const ReservaMembresia = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const { clase, fechasDelMes } = location.state || {};

    const [paso,         setPaso]         = useState('inicial');
    const [mensaje,      setMensaje]      = useState('');
    const [cargando,     setCargando]     = useState(false);
    const [datosReserva, setDatosReserva] = useState(null);
    const [creditos, setCreditos] = useState(0);

    useEffect(() => {
        const cargarPerfil = async () => {
            try {
                const res = await api.get('/socios/me');
                setCreditos(res.data.creditos_disponibles || 0);
            } catch (err) {
                console.error(err);
            }
        };

        cargarPerfil();
    }, []);

    if (!clase || !fechasDelMes) {
        return (
            <div className="reserva-empty-state">
                <span className="reserva-empty-icon">📭</span>
                <p>No hay clase seleccionada.</p>
                <button className="boton-accion" onClick={() => navigate('/')}>
                    Volver al inicio
                </button>
            </div>
        );
    }

    const handleReservar = async () => {
        setCargando(true);
        try {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

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

            console.log("RESPUESTA MEMBRESIA:", res.data); // lo uso para ver el error

            setDatosReserva(res.data);

            if (res.data.hay_lista_espera) {
                setPaso('confirmar_espera');
            } else {
                navegarAlPago(res.data, true);
            }
        } catch (err) {
            setMensaje(err.response?.data?.detail || 'Error inesperado');
            setPaso('error');
        } finally {
            setCargando(false);
        }
    };

    const handleResponderEspera = async (acepta) => {
        if (!acepta) {
            setCargando(true);
            try {
                await api.post('/reservas/membresia/confirmar-pago', {
                    reservas_ids:        datosReserva.reservas_ids,
                    fechas_sin_cupo:     datosReserva.fechas_sin_cupo,
                    acepta_lista_espera: false,
                    pago_exitoso:        false,
                });
            } catch (_) {}
            finally { setCargando(false); }
            setMensaje('Reserva cancelada.');
            setPaso('error');
            return;
        }
        navegarAlPago(datosReserva, true);
    };

    const navegarAlPago = (datos, aceptaEspera) => {

        console.log("DATOS A PAGO:", datos);

        navigate('/pago', {
            state: {
                monto:             datos.monto_total,
                fechasConCupo:     datos.fechas_con_cupo,
                fechasSinCupo:     datos.fechas_sin_cupo ?? [],
                aceptaListaEspera: aceptaEspera,
                claseInfo:         clase,
                claseId:           clase.id,
            }
        });
    };

    const hoy = new Date();
    const clasesPerdidas = fechasDelMes.filter(f => new Date(f) < hoy).length;
    const clasesFuturas  = fechasDelMes.length - clasesPerdidas;

    // ── 2. LÓGICA DE PRECIOS SIMULADOS (Paso inicial) ──
    // REVISÁ ACÁ: Modificá estas fórmulas para que hagan EXACTAMENTE lo mismo que tu backend actual
    const precioBase        = clase.precio_individual * fechasDelMes.length;
    
    // Ejemplo: Si en tu backend el descuento ahora es del 25% o es un valor fijo, cambialo acá:
    const descuentoEstimado = clase.precio_individual * fechasDelMes.length * (clasesPerdidas * 0.20);
    // ── 3. VALORES DEFINITIVOS (Prioriza siempre lo que responde el Backend) ──
    const descuento = Number(datosReserva ? (datosReserva.descuento_aplicado ?? descuentoEstimado) : descuentoEstimado) || 0;
    const montoFinal = datosReserva ? datosReserva.monto_total : (precioBase - descuentoEstimado);

    // Emoji por disciplina
    const emojiDisciplina = {
        yoga: '🧘', pilates: '🤸', funcional: '⚡'
    }[clase.actividad?.toLowerCase()] || '🏋️';

    return (
        <div className="reserva-page">

            {/* ── ENCABEZADO ── */}
            <div className="reserva-page-header">
                <button className="reserva-back" onClick={() => navigate(-1)}>
                    ← Volver
                </button>
                <span className="reserva-page-label">Membresía mensual</span>
            </div>

            <div className="reserva-layout">

                {/* ── COLUMNA IZQUIERDA: info de la clase ── */}
                <div className="reserva-info-col">

                    <div className="reserva-clase-hero">
                        <div className="reserva-clase-emoji">{emojiDisciplina}</div>
                        <div>
                            <h2 className="reserva-clase-nombre">{clase.actividad}</h2>
                            <p className="reserva-clase-sub">
                                {clase.dia} · {formatearHora(clase.horario)}
                            </p>
                        </div>
                    </div>

                    {/* Desglose de precios */}
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
                                <span>
                                    Descuento ({clasesPerdidas} clase{clasesPerdidas > 1 ? 's' : ''} perdida{clasesPerdidas > 1 ? 's' : ''})
                                </span>
                                <span>-${Number(descuento || 0).toFixed(2)}</span>
                            </div>
                        )}

                        <div className="reserva-desglose-total">
                            <span>Total</span>
                            <span>${Number(montoFinal || 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* ── COLUMNA DERECHA: acción ── */}
                <div className="reserva-accion-col">

                    {/* PASO: inicial */}
                    {paso === 'inicial' && (
                        <div className="reserva-accion-card">
                            <h3 className="reserva-accion-titulo">Confirmá tu membresía</h3>
                            <p className="reserva-accion-desc">
                                Al confirmar, reservás todas las clases futuras de <strong>{clase.actividad}</strong> de este mes. Podés cancelar hasta 2 horas antes de cada clase.
                            </p>

                            {/* Lista de fechas futuras */}
                            <div className="reserva-fechas">
                                <span className="reserva-fechas-label">Clases incluidas</span>
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

                            {creditos > 0 && (
                                <div className="reserva-creditos-alert">
                                    🎟️ Tenés {creditos} crédito{creditos > 1 ? 's' : ''} disponible{creditos > 1 ? 's' : ''}. 
                                    Esta reserva se descontará automáticamente sin cobrarte nuevamente.
                                </div>
                            )}

                            <button
                                className="boton-accion"
                                onClick={handleReservar}
                                disabled={cargando}
                            >
                                {cargando ? (
                                    <span className="reserva-spinner" />
                                ) : (
                                    'Confirmar y pagar →'
                                )}
                            </button>
                        </div>
                    )}

                    {/* PASO: lista de espera */}
                    {paso === 'confirmar_espera' && (
                        <div className="reserva-accion-card">
                            <div className="reserva-espera-icon">⚠️</div>
                            <h3 className="reserva-accion-titulo">Clases sin cupos</h3>
                            <p className="reserva-accion-desc">
                                Las siguientes clases no tienen cupos disponibles:
                            </p>
                            <div className="reserva-fechas-lista reserva-fechas-lista--sin-cupo">
                                {datosReserva.fechas_sin_cupo.map(f => {
                                    const fecha = new Date(f + 'T00:00:00');
                                    return (
                                        <span key={f} className="reserva-fecha-chip reserva-fecha-chip--vacio">
                                            {fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                        </span>
                                    );
                                })}
                            </div>
                            <p className="reserva-espera-pregunta">
                                {datosReserva.mensaje_espera}
                            </p>
                            <div className="reserva-espera-botones">
                                <button
                                    className="boton-accion"
                                    onClick={() => handleResponderEspera(true)}
                                    disabled={cargando}
                                >
                                    Confirmar lista de espera
                                </button>
                                <button
                                    className="boton-cancelar"
                                    onClick={() => handleResponderEspera(false)}
                                    disabled={cargando}
                                >
                                    Rechazar lista de espera
                                </button>
                            </div>
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

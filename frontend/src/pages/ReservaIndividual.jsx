import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import '../assets/css/Reserva.css';
import '../assets/css/Pago.css';

const formatearHora = (hora) => hora?.slice(0, 5);

const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr + 'T00:00:00');
    return fecha.toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
};

const ReservaIndividual = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const { clase, fechaSeleccionada } = location.state || {};

    // pasos: confirmacion | lista_espera | tipo_pago | pago | exito | error
    const [paso, setPaso]         = useState('confirmacion');
    const [mensaje, setMensaje]   = useState('');
    const [cargando, setCargando] = useState(false);

    const [tipoPago, setTipoPago]               = useState('sena');
    const [reservaId, setReservaId]             = useState(null);
    const [monto, setMonto]                     = useState(clase ? Number(clase.precio_individual) * 0.5 : 0);
    const [debeListaEspera, setDebeListaEspera] = useState(false);

    // Datos de tarjeta
    const [nroTarjeta, setNroTarjeta]   = useState('');
    const [titular, setTitular]         = useState('');
    const [cvv, setCvv]                 = useState('');
    const [vencimiento, setVencimiento] = useState('');

    if (!clase || !fechaSeleccionada) {
        return (
            <div className="reserva-empty-state">
                <span className="reserva-empty-icon">📭</span>
                <p>No hay clase seleccionada.</p>
                <button className="boton-accion" onClick={() => navigate('/')}>Volver al inicio</button>
            </div>
        );
    }

    const emojiDisciplina = {
        yoga: '🧘', pilates: '🤸', funcional: '⚡'
    }[clase.actividad?.toLowerCase()] || '🏋️';

    const handleCambioModalidad = (tipo) => {
        setTipoPago(tipo);
        setMonto(tipo === 'sena'
            ? Number(clase.precio_individual) * 0.5
            : Number(clase.precio_individual)
        );
    };

    // ─────────────────────────────────────────────
    // PASO 1 → verificar cupo
    // ─────────────────────────────────────────────
    const handleVerificarCupo = async () => {
        setCargando(true);
        setMensaje('');
        try {
            const res = await api.post('/reservas/individual/verificar-cupo', {
                clase_id: clase.id,
                fecha_clase: fechaSeleccionada,
                tipo_pago: tipoPago
            });

            setDebeListaEspera(res.data.debe_lista_espera);

            if (res.data.debe_lista_espera) {
                setPaso('lista_espera');
            } else {
                setPaso('tipo_pago');
            }
        } catch (err) {
            setMensaje(err.response?.data?.detail || 'Error al verificar la disponibilidad.');
            setPaso('error');
        } finally {
            setCargando(false);
        }
    };

    // ─────────────────────────────────────────────
    // PASO 2 → crear reserva (solo clase_id, fecha, tipo_pago)
    // ─────────────────────────────────────────────
    const handleCrearReserva = async () => {
        setCargando(true);
        setMensaje('');
        try {
            const res = await api.post('/reservas/individual/crear', {
                clase_id: clase.id,
                fecha_clase: fechaSeleccionada,
                tipo_pago: tipoPago
            });

            setReservaId(res.data.reserva_id);
            setMonto(res.data.monto_a_pagar);
            setPaso('pago');
        } catch (err) {
            setMensaje(err.response?.data?.detail || 'Error al crear la reserva.');
            setPaso('error');
        } finally {
            setCargando(false);
        }
    };

    // ─────────────────────────────────────────────
    // PASO 3 → pagar
    // ─────────────────────────────────────────────
    const handlePagar = async () => {
        if (!nroTarjeta.trim() || !titular.trim() || !cvv.trim() || !vencimiento.trim()) {
            setMensaje('Por favor, completá todos los datos de la tarjeta.');
            return;
        }

        setCargando(true);
        setMensaje('');
        try {
            await api.post('/reservas/individual/pagar', {
                reserva_id:          reservaId,
                numero_tarjeta:      nroTarjeta,
                titular,
                cvv,
                fecha_vencimiento:   vencimiento,
                acepta_lista_espera: debeListaEspera
            });

            setPaso('exito');
        } catch (err) {
            setMensaje(err.response?.data?.detail || 'No se pudo procesar el pago.');
            setPaso('error');
        } finally {
            setCargando(false);
        }
    };

    // ─────────────────────────────────────────────
    // LISTA DE ESPERA: acepta sin pago
    // ─────────────────────────────────────────────
    const handleAceptarEspera = async () => {
        setCargando(true);
        setMensaje('');
        try {
            const res = await api.post('/reservas/individual/crear', {
                clase_id: clase.id,
                fecha_clase: fechaSeleccionada,
                tipo_pago: tipoPago
            });
            setReservaId(res.data.reserva_id);
            setMonto(res.data.monto_a_pagar);
            setPaso('pago'); // igual paga, pero con acepta_lista_espera=true
        } catch (err) {
            setMensaje(err.response?.data?.detail || 'Error al unirse a la lista de espera.');
            setPaso('error');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="reserva-page">
            <div className="reserva-page-header">
                <button className="reserva-back" onClick={() => navigate(-1)}>← Volver</button>
                <span className="reserva-page-label">Reserva Individual</span>
            </div>

            <div className="reserva-layout">
                {/* COLUMNA IZQUIERDA */}
                <div className="reserva-info-col">
                    <div className="reserva-clase-hero">
                        <div className="reserva-clase-emoji">{emojiDisciplina}</div>
                        <div>
                            <h2 className="reserva-clase-nombre" style={{ textTransform: 'capitalize' }}>
                                {clase.actividad}
                            </h2>
                            <p className="reserva-clase-sub">
                                {clase.dia} · {formatearHora(clase.horario)}
                            </p>
                        </div>
                    </div>

                    <div className="reserva-desglose">
                        <div className="reserva-desglose-titulo">Detalle de la sesión</div>
                        <div className="reserva-desglose-fila" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                            <span style={{ fontWeight: '500' }}>Fecha elegida:</span>
                            <span style={{ textTransform: 'capitalize', color: '#555', marginTop: '2px' }}>
                                {formatearFecha(fechaSeleccionada)}
                            </span>
                        </div>
                        <div className="reserva-desglose-fila">
                            <span>Precio base</span>
                            <span>${Number(clase.precio_individual).toFixed(2)}</span>
                        </div>
                        <div className="reserva-desglose-fila" style={{ color: '#666', fontSize: '0.95em' }}>
                            <span>Concepto</span>
                            <span>{tipoPago === 'sena' ? 'Seña (50%)' : 'Totalidad (100%)'}</span>
                        </div>
                        <div className="reserva-desglose-total">
                            <span>Total a abonar</span>
                            <span>${Number(monto).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Tarjeta visual — solo en el paso de pago */}
                    {paso === 'pago' && (
                        <div className="pago-card-visual" style={{ marginTop: '20px' }}>
                            <div className="pago-card-chip">▬</div>
                            <div className="pago-card-numero">{nroTarjeta || '···· ···· ···· ····'}</div>
                            <div className="pago-card-bottom">
                                <div>
                                    <div className="pago-card-sublabel">Titular</div>
                                    <div className="pago-card-valor" style={{ textTransform: 'uppercase' }}>
                                        {titular || 'NOMBRE APELLIDO'}
                                    </div>
                                </div>
                                <div>
                                    <div className="pago-card-sublabel">CVV</div>
                                    <div className="pago-card-valor">{cvv ? '•'.repeat(cvv.length) : '•••'}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* COLUMNA DERECHA */}
                <div className="reserva-accion-col">

                    {/* PASO 1: selección de modalidad */}
                    {paso === 'confirmacion' && (
                        <div className="reserva-accion-card">
                            <h3 className="reserva-accion-titulo">Configurá tu reserva</h3>
                            <p className="reserva-accion-desc">
                                Seleccioná cómo querés abonar la clase:
                            </p>
                            <div style={{ display: 'flex', gap: '12px', margin: '25px 0' }}>
                                <button
                                    type="button"
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '8px',
                                        border: tipoPago === 'sena' ? '2px solid #4caf50' : '1px solid #ccc',
                                        backgroundColor: tipoPago === 'sena' ? 'rgba(76,175,80,0.1)' : 'transparent',
                                        color: tipoPago === 'sena' ? '#4caf50' : '#aaa',
                                        fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => handleCambioModalidad('sena')}
                                >
                                    Abonar Seña (50%)
                                </button>
                                <button
                                    type="button"
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '8px',
                                        border: tipoPago === 'total' ? '2px solid #4caf50' : '1px solid #ccc',
                                        backgroundColor: tipoPago === 'total' ? 'rgba(76,175,80,0.1)' : 'transparent',
                                        color: tipoPago === 'total' ? '#4caf50' : '#aaa',
                                        fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => handleCambioModalidad('total')}
                                >
                                    Abonar Total (100%)
                                </button>
                            </div>
                            <button className="boton-accion" onClick={handleVerificarCupo} disabled={cargando}>
                                {cargando ? <span className="reserva-spinner" /> : 'Siguiente →'}
                            </button>
                        </div>
                    )}

                    {/* PASO 2: lista de espera */}
                    {paso === 'lista_espera' && (
                        <div className="reserva-accion-card">
                            <div className="reserva-espera-icon">⚠️</div>
                            <h3 className="reserva-accion-titulo">Clase sin cupos disponibles</h3>
                            <p className="reserva-accion-desc">
                                No hay vacantes para el {formatearFecha(fechaSeleccionada)}.
                                Si se libera un lugar, te notificaremos.
                            </p>
                            <div className="reserva-espera-botones">
                                <button className="boton-accion" onClick={handleAceptarEspera} disabled={cargando}>
                                    {cargando ? <span className="reserva-spinner" /> : 'Acepto entrar en espera'}
                                </button>
                                <button className="boton-cancelar" onClick={() => navigate('/')} disabled={cargando}>
                                    No, volver al inicio
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PASO 2b: confirmar tipo de pago (con cupo disponible) */}
                    {paso === 'tipo_pago' && (
                        <div className="reserva-accion-card">
                            <h3 className="reserva-accion-titulo">Confirmá tu reserva</h3>
                            <p className="reserva-accion-desc">
                                Vas a reservar <strong>{clase.actividad}</strong> el {formatearFecha(fechaSeleccionada)}.
                                Abonás <strong>{tipoPago === 'sena' ? 'una seña del 50%' : 'el total (100%)'}</strong>.
                            </p>
                            <button className="boton-accion" onClick={handleCrearReserva} disabled={cargando}>
                                {cargando ? <span className="reserva-spinner" /> : 'Confirmar y pagar →'}
                            </button>
                        </div>
                    )}

                    {/* PASO 3: formulario de pago */}
                    {paso === 'pago' && (
                        <div className="pago-form-card">
                            <h2 className="pago-form-titulo">Datos de pago</h2>

                            <div className="pago-field">
                                <label className="pago-label">Número de tarjeta</label>
                                <input
                                    className="pago-input pago-input--wide"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="1111 2222 3333 4444"
                                    value={nroTarjeta}
                                    maxLength={19}
                                    onChange={(e) => {
                                        const numeros = e.target.value.replace(/\D/g, '');
                                        const parts = [];
                                        for (let i = 0; i < numeros.length; i += 4) {
                                            parts.push(numeros.substring(i, i + 4));
                                        }
                                        setNroTarjeta(parts.join(' '));
                                    }}
                                />
                            </div>

                            <div className="pago-field">
                                <label className="pago-label">Nombre del titular</label>
                                <input
                                    className="pago-input pago-input--wide"
                                    type="text"
                                    placeholder="Tal como aparece en la tarjeta"
                                    value={titular}
                                    onChange={(e) => setTitular(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ''))}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="pago-field" style={{ flex: 1 }}>
                                    <label className="pago-label">CVV</label>
                                    <input
                                        className="pago-input"
                                        type="text"
                                        inputMode="numeric"
                                        style={{ WebkitTextSecurity: 'disc' }}
                                        placeholder="•••"
                                        maxLength={3}
                                        value={cvv}
                                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                                    />
                                </div>
                                <div className="pago-field" style={{ flex: 1 }}>
                                    <label className="pago-label">Vencimiento</label>
                                    <input
                                        className="pago-input"
                                        type="text"
                                        placeholder="MM/AA"
                                        maxLength={5}
                                        value={vencimiento}
                                        onChange={(e) => {
                                            let valor = e.target.value.replace(/\D/g, '');
                                            if (valor.length > 2) {
                                                valor = valor.slice(0, 2) + '/' + valor.slice(2, 4);
                                            }
                                            setVencimiento(valor);
                                        }}
                                    />
                                </div>
                            </div>

                            {mensaje && <p className="pago-error-msg">{mensaje}</p>}

                            <button className="pago-btn-primary" onClick={handlePagar} disabled={cargando}>
                                {cargando
                                    ? <><span className="pago-spinner" /> Procesando...</>
                                    : `Pagar $${Number(monto).toFixed(2)}`
                                }
                            </button>

                            <p className="pago-seguro-txt">🔒 Pago simulado — tus datos no se almacenan</p>
                        </div>
                    )}

                    {/* PASO 4: éxito */}
                    {paso === 'exito' && (
                        <div className="pago-resultado pago-resultado--ok">
                            <div className="pago-resultado-icon">✓</div>
                            <h3>¡Reserva procesada!</h3>
                            <p>Tu solicitud fue registrada correctamente.</p>
                            <button className="pago-btn-primary" onClick={() => navigate('/perfil')}>
                                Ver mis reservas
                            </button>
                        </div>
                    )}

                    {/* PASO 5: error */}
                    {paso === 'error' && (
                        <div className="pago-resultado pago-resultado--error">
                            <div className="pago-resultado-icon pago-resultado-icon--error">✕</div>
                            <h3>Hubo un problema</h3>
                            <p className="pago-error-msg">{mensaje}</p>
                            <button className="pago-btn-ghost" onClick={() => setPaso('confirmacion')}>
                                Intentar de nuevo
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ReservaIndividual;

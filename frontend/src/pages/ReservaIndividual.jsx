import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import '../assets/css/Reserva.css';

const formatearHora = (hora) => hora?.slice(0, 5);

const ReservaMembresia = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { clase, fechasDelMes } = location.state || {};

    // pasos: cargando | lista_espera | creditos | pago | exito | exito_espera | error
    const [paso, setPaso]                 = useState('cargando');
    const [mensaje, setMensaje]           = useState('');
    const [cargando, setCargando]         = useState(false);
    const [datosReserva, setDatosReserva] = useState(null);
    const [creditos, setCreditos]         = useState(0);

    const [nroTarjeta, setNroTarjeta]   = useState('');
    const [titular, setTitular]         = useState('');
    const [cvv, setCvv]                 = useState('');
    const [vencimiento, setVencimiento] = useState('');

    useEffect(() => {
        if (!clase || !fechasDelMes) return;

        const inicializar = async () => {
            setCargando(true);
            try {
                const [perfilRes, cotizarRes] = await Promise.all([
                    api.get('/socios/me'),
                    api.post('/reservas/membresia/crear', {
                        clase_id:         clase.id,
                        fechas_clase:     fechasDelMes,
                        total_clases_mes: fechasDelMes.length,
                    })
                ]);

                const creditosActuales = perfilRes.data.creditos_disponibles || 0;
                setCreditos(creditosActuales);
                setDatosReserva(cotizarRes.data);

                // Nuevo flujo: lista de espera va primero y NO continúa al pago
                if (cotizarRes.data.hay_lista_espera) {
                    setPaso('lista_espera');
                } else if (creditosActuales > 0) {
                    setPaso('creditos');
                } else {
                    setPaso('pago');
                }
            } catch (err) {
                const detalle = err.response?.data?.detail;
                setMensaje(typeof detalle === 'string' ? detalle : 'Error al inicializar.');
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

    const clasesPerdidas = datosReserva?.clases_perdidas ?? 0;
    const clasesFuturas  = fechasDelMes.length - clasesPerdidas;
    const descuento      = Number(datosReserva?.descuento_aplicado ?? 0);
    const montoFinal     = Number(datosReserva?.monto_total ?? clase.precio_individual * fechasDelMes.length);

    const emojiDisciplina = {
        yoga: '🧘', pilates: '🤸', funcional: '⚡'
    }[clase.actividad?.toLowerCase()] || '🏋️';

    // NUEVO: lista de espera sin pago — solo agrega y termina
    const handleAceptarEspera = async () => {
        setCargando(true);
        setMensaje('');
        try {
            await api.post('/reservas/membresia/lista-espera', {
                clase_id:        clase.id,
                fechas_sin_cupo: datosReserva.fechas_sin_cupo || [],
            });
            setPaso('exito_espera');
        } catch (err) {
            const detalle = err.response?.data?.detail;
            setMensaje(typeof detalle === 'string' ? detalle : 'Error al agregar a lista de espera.');
            setPaso('error');
        } finally {
            setCargando(false);
        }
    };

    const handleContinuarDesdeCreditos = () => {
        if (montoFinal === 0) {
            handleConfirmarConCreditos();
        } else {
            setPaso('pago');
        }
    };

    const handleConfirmarConCreditos = async () => {
        setCargando(true);
        setMensaje('');
        try {
            await api.post('/reservas/membresia/pagar', {
                clase_id:            clase.id,
                creditos_a_usar:     datosReserva.creditos_a_usar || 0,
                monto_total:         0,
                fechas_con_cupo:     datosReserva.fechas_con_cupo || [],
                fechas_sin_cupo:     [],
                acepta_lista_espera: false,
                pago_exitoso:        true,
                numero_tarjeta:      '0000000000000000',
                titular:             'credito',
                cvv:                 '000',
                fecha_vencimiento:   '12/99',
            });
            setPaso('exito');
        } catch (err) {
            const detalle = err.response?.data?.detail;
            setMensaje(typeof detalle === 'string' ? detalle : 'Error al confirmar con créditos.');
            setPaso('error');
        } finally {
            setCargando(false);
        }
    };

    const handlePagar = async () => {
        if (!nroTarjeta || !titular || !cvv || !vencimiento) {
            setMensaje('Por favor, completá todos los datos de la tarjeta.');
            return;
        }
        setCargando(true);
        setMensaje('');
        try {
            await api.post('/reservas/membresia/pagar', {
                clase_id:            clase.id,
                creditos_a_usar:     datosReserva.creditos_a_usar || 0,
                monto_total:         montoFinal,
                fechas_con_cupo:     datosReserva.fechas_con_cupo || [],
                fechas_sin_cupo:     [],
                acepta_lista_espera: false,
                pago_exitoso:        true,
                numero_tarjeta:      nroTarjeta.replace(/\s/g, ''),
                titular,
                cvv,
                fecha_vencimiento:   vencimiento,
            });
            setPaso('exito');
        } catch (err) {
            const detalle = err.response?.data?.detail;
            setMensaje(typeof detalle === 'string' ? detalle : 'Error al procesar el pago.');
        } finally {
            setCargando(false);
        }
    };

    const handleVolver = () => {
        if (paso === 'creditos') return setPaso('cargando');
        if (paso === 'pago')     return setPaso(creditos > 0 ? 'creditos' : 'cargando');
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
                                <span>-${descuento.toFixed(2)}</span>
                            </div>
                        )}
                        {datosReserva?.creditos_a_usar > 0 && (
                            <div className="reserva-desglose-fila reserva-desglose-fila--descuento">
                                <span>🎟️ Créditos ({datosReserva.creditos_a_usar} clase{datosReserva.creditos_a_usar > 1 ? 's' : ''} gratis)</span>
                                <span>-${Number(datosReserva.descuento_creditos || 0).toFixed(2)}</span>
                            </div>
                        )}
                        {/* Solo mostramos total si no estamos en flujo de espera */}
                        {paso !== 'lista_espera' && paso !== 'exito_espera' && (
                            <div className="reserva-desglose-total">
                                <span>Total</span>
                                <span>${montoFinal.toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* COLUMNA DERECHA */}
                <div className="reserva-accion-col">

                    {paso === 'cargando' && (
                        <div className="reserva-accion-card" style={{ textAlign: 'center' }}>
                            <span className="reserva-spinner" />
                        </div>
                    )}

                    {/* PASO: lista de espera — sin pago */}
                    {paso === 'lista_espera' && (
                        <div className="reserva-accion-card">
                            <div className="reserva-espera-icon">⚠️</div>
                            <h3 className="reserva-accion-titulo">Algunas fechas sin cupo</h3>
                            <p className="reserva-accion-desc">
                                Las siguientes fechas no tienen lugares disponibles. Si aceptás, te anotamos en lista de espera sin cargo — te avisaremos si se libera un cupo.
                            </p>
                            <div className="reserva-fechas-lista" style={{ margin: '12px 0' }}>
                                {datosReserva?.fechas_sin_cupo?.map((f, i) => (
                                    <span key={i} className="reserva-fecha-chip reserva-fecha-chip--vacio">
                                        {new Date(f + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                    </span>
                                ))}
                            </div>
                            <div className="reserva-espera-botones">
                                <button className="boton-accion" onClick={handleAceptarEspera} disabled={cargando}>
                                    {cargando ? <span className="reserva-spinner" /> : 'Anotarme en lista de espera'}
                                </button>
                                <button className="boton-cancelar" onClick={() => navigate('/')} disabled={cargando}>
                                    No, volver al inicio
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PASO: créditos disponibles */}
                    {paso === 'creditos' && (
                        <div className="reserva-accion-card">
                            <div className="pago-credito-icon">🎟️</div>
                            <h3 className="reserva-accion-titulo">Tenés créditos disponibles</h3>
                            <p className="reserva-accion-desc">
                                Tenés <strong>{creditos} crédito{creditos > 1 ? 's' : ''}</strong> disponible{creditos > 1 ? 's' : ''}.{' '}
                                {montoFinal === 0
                                    ? 'Cubren el total de la membresía, no necesitás pagar nada.'
                                    : `Se aplicarán ${datosReserva?.creditos_a_usar} y abonarás el resto con tarjeta.`}
                            </p>
                            {mensaje && <p className="pago-error-msg">{mensaje}</p>}
                            <button className="boton-accion" onClick={handleContinuarDesdeCreditos} disabled={cargando}>
                                {cargando
                                    ? <span className="reserva-spinner" />
                                    : montoFinal === 0 ? 'Confirmar sin pago →' : 'Continuar al pago →'}
                            </button>
                        </div>
                    )}

                    {/* PASO: pago con tarjeta */}
                    {paso === 'pago' && (
                        <div className="pago-form-card">
                            <h2 className="pago-form-titulo">Datos de pago</h2>
                            <div className="pago-field">
                                <label className="pago-label">Número de tarjeta</label>
                                <input className="pago-input pago-input--wide" type="text" inputMode="numeric"
                                    placeholder="1111 2222 3333 4444" value={nroTarjeta} maxLength={19}
                                    onChange={(e) => {
                                        const n = e.target.value.replace(/\D/g, '');
                                        const parts = [];
                                        for (let i = 0; i < n.length; i += 4) parts.push(n.substring(i, i + 4));
                                        setNroTarjeta(parts.join(' '));
                                    }}
                                />
                            </div>
                            <div className="pago-field">
                                <label className="pago-label">Nombre del titular</label>
                                <input className="pago-input pago-input--wide" type="text"
                                    placeholder="Tal como aparece en la tarjeta" value={titular}
                                    onChange={(e) => setTitular(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, ''))}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div className="pago-field" style={{ flex: 1 }}>
                                    <label className="pago-label">CVV</label>
                                    <input className="pago-input" type="text" inputMode="numeric"
                                        style={{ WebkitTextSecurity: 'disc' }} placeholder="•••" maxLength={3}
                                        value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                                    />
                                </div>
                                <div className="pago-field" style={{ flex: 1 }}>
                                    <label className="pago-label">Vencimiento</label>
                                    <input className="pago-input" type="text" placeholder="MM/AA" maxLength={5}
                                        value={vencimiento}
                                        onChange={(e) => {
                                            let v = e.target.value.replace(/\D/g, '');
                                            if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2, 4);
                                            setVencimiento(v);
                                        }}
                                    />
                                </div>
                            </div>
                            {mensaje && <p className="pago-error-msg">{mensaje}</p>}
                            <button className="pago-btn-primary" onClick={handlePagar} disabled={cargando}>
                                {cargando ? <><span className="pago-spinner" /> Procesando...</> : `Pagar $${montoFinal.toFixed(2)}`}
                            </button>
                            <p className="pago-seguro-txt">🔒 Pago simulado — tus datos no se almacenan</p>
                        </div>
                    )}

                    {/* PASO: éxito reserva con pago o crédito */}
                    {paso === 'exito' && (
                        <div className="pago-resultado pago-resultado--ok">
                            <div className="pago-resultado-icon">✓</div>
                            <h3>¡Membresía confirmada!</h3>
                            <p>Tus clases del mes fueron reservadas correctamente.</p>
                            <button className="pago-btn-primary" onClick={() => navigate('/perfil')}>
                                Ver mis reservas
                            </button>
                        </div>
                    )}

                    {/* PASO: éxito lista de espera */}
                    {paso === 'exito_espera' && (
                        <div className="pago-resultado pago-resultado--ok">
                            <div className="pago-resultado-icon">🕐</div>
                            <h3>¡Estás en lista de espera!</h3>
                            <p>
                                Te avisaremos si se libera un cupo para las fechas solicitadas.
                                No se realizó ningún cobro.
                            </p>
                            <button className="pago-btn-primary" onClick={() => navigate('/')}>
                                Volver al inicio
                            </button>
                        </div>
                    )}

                    {/* PASO: error */}
                    {paso === 'error' && (
                        <div className="pago-resultado pago-resultado--error">
                            <div className="pago-resultado-icon pago-resultado-icon--error">✕</div>
                            <h3>{mensaje}</h3>
                            <button className="pago-btn-ghost" onClick={() => navigate('/')}>
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
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import '../assets/css/Reserva.css';
import '../assets/css/Pago.css';
import PagarConMP from '../components/PagarConMP';

const formatearHora = (hora) => hora?.slice(0, 5);

const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr + 'T00:00:00');
    return fecha.toLocaleDateString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
};

const extraerMensajeError = (err, fallback) => {
    const detail = err?.response?.data?.detail;
    if (Array.isArray(detail)) {
        return detail.map(d => d.msg || JSON.stringify(d)).join(', ');
    }
    if (typeof detail === 'string') {
        return detail;
    }
    return fallback;
};

const ReservaIndividual = () => {
    const location = useLocation();
    const desdeListaEspera =
        location.state?.desdeListaEspera || false;
    const reservaIdExistente =
        location.state?.reservaId || null;
    const navigate = useNavigate();
    const { clase, fechaSeleccionada } = location.state || {};

    const montoListaEspera =
        location.state?.monto || 0;

    const tipoReservaListaEspera =
        location.state?.tipoReserva || null;

    // pasos: cargando | lista_espera | creditos | tipo_pago | pago | exito | exito_espera | error
    const [paso, setPaso]         = useState('cargando');
    const [mensaje, setMensaje]   = useState('');
    const [cargando, setCargando] = useState(false);

    const [monto, setMonto] =
        useState(
            desdeListaEspera
                ? montoListaEspera
                : (clase ? Number(clase.precio_individual) * 0.5 : 0)
        );

    const [tipoPago, setTipoPago]                       = useState('sena');

    const [creditosDisponibles, setCreditosDisponibles] = useState(0);
    const [usaCredito, setUsaCredito]                   = useState(false);

    const [metodoPago, setMetodoPago] = useState('tarjeta'); // 'tarjeta' | 'mp'

    // Datos de tarjeta
    const [nroTarjeta, setNroTarjeta]   = useState('');
    const [titular, setTitular]         = useState('');
    const [cvv, setCvv]                 = useState('');
    const [vencimiento, setVencimiento] = useState('');

    useEffect(() => {
        const verificar = async () => {
            setCargando(true);
            try {
                const res = await api.post('/reservas/individual/verificar-cupo', {
                    clase_id:    clase.id,
                    fecha_clase: fechaSeleccionada,
                    tipo_pago:   'sena'
                });

                setCreditosDisponibles(res.data.creditos_disponibles || 0);

                if (res.data.puede_usar_credito) {
                    setUsaCredito(true);
                    setMonto(0);
                }

                if (res.data.debe_lista_espera) {
                    setPaso('lista_espera');
                } else if (res.data.creditos_disponibles > 0) {
                    setPaso('creditos');
                } else {
                    setPaso('tipo_pago');
                }
            } catch (err) {
                setMensaje(extraerMensajeError(err, 'Error al verificar disponibilidad.'));
                setPaso('error');
            } finally {
                setCargando(false);
            }
        };

        if (desdeListaEspera) {

            setPaso('pago');

        } else if (clase && fechaSeleccionada) {

            verificar();

        }
    }, []);

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

        if (desdeListaEspera) {

            if (tipoReservaListaEspera === "Membresia") {
                setMonto(montoListaEspera);
                return;
            }

            setMonto(
                tipo === "sena"
                    ? montoListaEspera * 0.5
                    : montoListaEspera
            );

            return;
        }

        setMonto(
            tipo === "sena"
                ? Number(clase.precio_individual) * 0.5
                : Number(clase.precio_individual)
        );
    };

    const handleAceptarEspera = async () => {
        setCargando(true);
        setMensaje('');
        try {
            await api.post('/reservas/individual/lista-espera', {
                clase_id:    clase.id,
                fecha_clase: fechaSeleccionada,
            });
            setPaso('exito_espera');
        } catch (err) {
            setMensaje(extraerMensajeError(err, 'Error al agregar a lista de espera.'));
            setPaso('error');
        } finally {
            setCargando(false);
        }
    };

    const handleContinuarDesdeCreditos = () => {
        if (usaCredito) {
            handlePagarConCredito();
        } else {
            setPaso('tipo_pago');
        }
    };

    // 🌟 FIX: usa el endpoint atómico /pagar-directo, sin reserva
    // previa. Antes intentaba crear con /cotizar (que ya no devuelve
    // reserva_id) y pagar con reserva_id undefined.
    const handlePagarConCredito = async () => {
        setCargando(true);
        setMensaje('');
        try {
            await api.post('/reservas/individual/pagar-directo', {
                clase_id:    clase.id,
                fecha_clase: fechaSeleccionada,
                tipo_pago:   tipoPago,
                usa_credito: true
            });

            setPaso('exito');
        } catch (err) {
            setMensaje(extraerMensajeError(err, 'No se pudo confirmar con créditos.'));
            setPaso('error');
        } finally {
            setCargando(false);
        }
    };

    // 🌟 FIX: solo cotiza (valida cupo/fecha/monto), ya no guarda
    // ningún reservaId porque /cotizar no crea nada.
    const handleCotizar = async () => {
        const res = await api.post('/reservas/individual/cotizar', {
            clase_id:    clase.id,
            fecha_clase: fechaSeleccionada,
            tipo_pago:   tipoPago
        });
        return res.data;
    };

    // 🌟 FIX: usa /pagar-directo para el flujo normal, sin reserva
    // previa. El caso "desdeListaEspera" sigue usando el endpoint
    // legado /individual/pagar con reservaIdExistente, porque ese sí
    // tiene una reserva pendiente_pago real creada por /aceptar-cupo.
    const handlePagar = async () => {

        if (!nroTarjeta.trim() || !titular.trim() || !cvv.trim() || !vencimiento.trim()) {

            setMensaje('Por favor, completá todos los datos de la tarjeta.');
            return;
        }

        setCargando(true);
        setMensaje('');

        try {

            if (desdeListaEspera) {

                await api.post('/reservas/individual/pagar', {
                    reserva_id:          reservaIdExistente,
                    numero_tarjeta:      nroTarjeta.replace(/\s/g, ''),
                    titular,
                    cvv,
                    fecha_vencimiento: vencimiento,
                    acepta_lista_espera: false,
                    usa_credito: false
                });

            } else {

                await api.post('/reservas/individual/pagar-directo', {
                    clase_id:    clase.id,
                    fecha_clase: fechaSeleccionada,
                    tipo_pago:   tipoPago,
                    usa_credito: false,
                    numero_tarjeta:    nroTarjeta.replace(/\s/g, ''),
                    titular,
                    cvv,
                    fecha_vencimiento: vencimiento
                });
            }

            setPaso('exito');

        } catch (err) {

            setMensaje(
                extraerMensajeError(err, 'No se pudo procesar la reserva.')
            );

            setPaso('error');

        } finally {

            setCargando(false);
        }
    };

    // 🌟 FIX: ya no hace falta cancelar nada al volver — como no se
    // crea ninguna reserva hasta confirmar el pago, no queda nada
    // huérfano bloqueando el cupo.
    const handleVolver = () => {
        if (paso === 'creditos') {
            // En lugar de 'cargando', volvemos a la pantalla anterior del sitio
            navigate(-1); 
            return;
        }
        if (paso === 'pago') {
            if (creditos > 0) {
                return setPaso('creditos');
            } else {
                // Si no hay créditos que mostrar atrás, sale de la reserva
                navigate(-1); 
                return;
            }
        }
        navigate(-1);
    };

    return (
        <div className="reserva-page">
            <div className="reserva-page-header">
                <button className="reserva-back" onClick={handleVolver}>← Volver</button>
                <span className="reserva-page-label">Reserva Individual</span>
            </div>

            <div className="reserva-layout">
                {/* COLUMNA IZQUIERDA */}
                <div className="reserva-info-col">
                    <div className="reserva-clase-hero">
                        <div className="reserva-clase-emoji">{emojiDisciplina}</div>
                        <div>
                            <h2 className="reserva-clase-nombre">
                                {clase.actividad}
                            </h2>
                            <p className="reserva-clase-sub">
                                {clase.dia} · {formatearHora(clase.horario)}
                            </p>
                        </div>
                    </div>

                    <div className="reserva-desglose">
                        <div className="reserva-desglose-titulo">Detalle de la sesión</div>

                        <div className="reserva-desglose-fila reserva-desglose-fila--fecha">
                            <span className="reserva-fecha-label">Fecha elegida:</span>
                            <span className="reserva-fecha-valor">
                                {formatearFecha(fechaSeleccionada)}
                            </span>
                        </div>

                        <div className="reserva-desglose-fila">
                            <span>Precio base</span>
                            <span>
                            {
                                desdeListaEspera
                                    ? `$${Number(montoListaEspera).toFixed(2)}`
                                    : `$${Number(clase.precio_individual).toFixed(2)}`
                            }
                            </span>
                        </div>

                        {paso !== 'lista_espera' && paso !== 'exito_espera' && (
                            <div className="reserva-desglose-fila reserva-desglose-fila--concepto">
                                <span>Concepto</span>
                                <span>{tipoPago === 'sena' ? 'Seña (50%)' : 'Totalidad (100%)'}</span>
                            </div>
                        )}

                        {usaCredito && (
                            <div className="reserva-desglose-fila reserva-desglose-fila--descuento">
                                <span>🎟️ Crédito aplicado</span>
                                <span>-${Number(clase.precio_individual).toFixed(2)}</span>
                            </div>
                        )}

                        {paso !== 'lista_espera' && paso !== 'exito_espera' && (
                            <div className="reserva-desglose-total">
                                <span>Total a abonar</span>
                                <span>${Number(monto).toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    {paso === 'pago' && metodoPago === 'tarjeta' && monto > 0 && (
                        <div className="pago-card-visual pago-card-visual--con-margen">
                            <div className="pago-card-chip">▬</div>
                            <div className="pago-card-numero">{nroTarjeta || '···· ···· ···· ····'}</div>
                            <div className="pago-card-bottom">
                                <div>
                                    <div className="pago-card-sublabel">Titular</div>
                                    <div className="pago-card-valor pago-card-valor--uppercase">
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

                    {paso === 'cargando' && (
                        <div className="reserva-accion-card reserva-accion-card--cargando">
                            <span className="reserva-spinner" />
                        </div>
                    )}

                    {paso === 'lista_espera' && (
                        <div className="reserva-accion-card">
                            <div className="reserva-espera-icon">⚠️</div>
                            <h3 className="reserva-accion-titulo">Clase sin cupos disponibles</h3>
                            <p className="reserva-accion-desc">
                                No hay vacantes para el {formatearFecha(fechaSeleccionada)}.
                                Podés anotarte en lista de espera sin costo — si se libera un lugar, te notificamos.
                            </p>
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

                    {paso === 'creditos' && (
                        <div className="reserva-accion-card">
                            <div className="pago-credito-icon">🎟️</div>
                            <h3 className="reserva-accion-titulo">Tenés créditos disponibles</h3>
                            <p className="reserva-accion-desc">
                                Tenés <strong>{creditosDisponibles} crédito{creditosDisponibles > 1 ? 's' : ''}</strong> disponible{creditosDisponibles > 1 ? 's' : ''}.{' '}
                                {usaCredito
                                    ? 'Esta clase quedará completamente cubierta con tus créditos, sin cargo adicional.'
                                    : 'No alcanza para cubrir esta clase. Continuá para abonar el saldo.'}
                            </p>
                            {mensaje && <p className="pago-error-msg">{mensaje}</p>}
                            <button className="boton-accion" onClick={handleContinuarDesdeCreditos} disabled={cargando}>
                                {cargando
                                    ? <span className="reserva-spinner" />
                                    : usaCredito ? 'Confirmar con crédito →' : 'Continuar →'}
                            </button>
                        </div>
                    )}

                    {paso === 'tipo_pago' && (
                        <div className="reserva-accion-card">
                            <h3 className="reserva-accion-titulo">Configurá tu pago</h3>
                            <p className="reserva-accion-desc">Seleccioná cómo querés abonar la clase:</p>

                            {
                                !(desdeListaEspera && tipoReservaListaEspera === "Membresia") && (

                                    <div style={{ display: 'flex', gap: '12px', margin: '25px 0' }}>

                                        <button
                                            type="button"
                                            style={{
                                                flex: 1,
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: tipoPago === 'sena'
                                                    ? '2px solid #4caf50'
                                                    : '1px solid #ccc',
                                                backgroundColor:
                                                    tipoPago === 'sena'
                                                        ? 'rgba(76,175,80,0.1)'
                                                        : 'transparent',
                                                color:
                                                    tipoPago === 'sena'
                                                        ? '#4caf50'
                                                        : '#aaa',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onClick={() => handleCambioModalidad('sena')}
                                        >
                                            Abonar Seña (50%)
                                        </button>

                                        <button
                                            type="button"
                                            style={{
                                                flex: 1,
                                                padding: '12px',
                                                borderRadius: '8px',
                                                border: tipoPago === 'total'
                                                    ? '2px solid #4caf50'
                                                    : '1px solid #ccc',
                                                backgroundColor:
                                                    tipoPago === 'total'
                                                        ? 'rgba(76,175,80,0.1)'
                                                        : 'transparent',
                                                color:
                                                    tipoPago === 'total'
                                                        ? '#4caf50'
                                                        : '#aaa',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onClick={() => handleCambioModalidad('total')}
                                        >
                                            Abonar Total (100%)
                                        </button>

                                    </div>

                                )
                            }

                            {
                                desdeListaEspera &&
                                tipoReservaListaEspera === "Membresia" && (

                                    <div
                                        style={{
                                            margin: '25px 0',
                                            textAlign: 'center',
                                            color: '#4caf50',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Las membresías se abonan siempre al 100%.
                                    </div>

                                )
                            }

                           <button 
                                className="boton-accion" 
                                onClick={async () => {
                                    setCargando(true);
                                    try {
                                        await handleCotizar();
                                        setPaso('pago');
                                    } catch(e) { 
                                        setMensaje(extraerMensajeError(e, 'Error al cotizar la reserva.'));
                                    } finally {
                                        setCargando(false); 
                                    }
                                }} 
                                disabled={cargando}
                            >
                                {cargando ? <span className="reserva-spinner" /> : 'Confirmar y pagar →'}
                            </button>
                        </div>
                    )}

                    {paso === 'pago' && (
                        <div className="pago-form-card">
                            <h2 className="pago-form-titulo">Elegí cómo pagar</h2>

                            <div className="metodo-pago-selector">
                                <button
                                    type="button"
                                    className={`metodo-pago-btn metodo-pago-btn--tarjeta ${metodoPago === 'tarjeta' ? 'activo' : ''}`}
                                    onClick={() => setMetodoPago('tarjeta')}
                                >
                                    Tarjeta
                                </button>
                                <button
                                    type="button"
                                    className={`metodo-pago-btn metodo-pago-btn--mp ${metodoPago === 'mp' ? 'activo' : ''}`}
                                    onClick={() => setMetodoPago('mp')}
                                >
                                    Mercado Pago
                                </button>
                            </div>

                            {metodoPago === 'tarjeta' && (<>
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
                                <div className="pago-row-cvv">
                                    <div className="pago-field">
                                        <label className="pago-label">CVV</label>
                                        <input className="pago-input" type="text" inputMode="numeric"
                                            style={{ WebkitTextSecurity: 'disc' }} placeholder="•••" maxLength={3}
                                            value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                                        />
                                    </div>
                                    <div className="pago-field">
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
                                    {cargando ? <><span className="pago-spinner" /> Procesando...</> : `Pagar $${Number(monto).toFixed(2)}`}
                                </button>
                                <p className="pago-seguro-txt">Pago simulado — tus datos no se almacenan</p>
                            </>)}

                            {metodoPago === 'mp' && (
                                <div className="mp-bloque">
                                    <p className="mp-descripcion">
                                        Serás redirigido al sitio de Mercado Pago para completar el pago de forma segura.
                                    </p>
                                    {mensaje && <p className="pago-error-msg">{mensaje}</p>}
                                    <PagarConMP
                                        tipo="individual-directa"
                                        payload={{
                                            clase_id:    clase.id,
                                            fecha_clase: fechaSeleccionada,
                                            tipo_pago:   tipoPago
                                        }}
                                        onError={(err) => setMensaje(
                                            typeof err === 'string'
                                                ? err
                                                : extraerMensajeError(err, 'Error al conectar con Mercado Pago')
                                        )}
                                    />
                                    <p className="pago-seguro-txt">Ambiente de pruebas (sandbox)</p>
                                </div>
                            )}
                        </div>
                    )}

                    {paso === 'exito' && (
                        <div className="pago-resultado pago-resultado--ok">
                            <div className="pago-resultado-icon">✓</div>
                            <h3>¡Reserva confirmada!</h3>
                            <p>Tu clase fue reservada correctamente.</p>
                            <button className="pago-btn-primary" onClick={() => navigate('/perfil')}>
                                Ver mis reservas
                            </button>
                        </div>
                    )}

                    {paso === 'exito_espera' && (
                        <div className="pago-resultado pago-resultado--ok">
                            <div className="pago-resultado-icon"></div>
                            <h3>¡Estás en lista de espera!</h3>
                            <p>Te avisaremos si se libera un cupo para el {formatearFecha(fechaSeleccionada)}.</p>
                            <button className="pago-btn-primary" onClick={() => navigate('/')}>
                                Volver al inicio
                            </button>
                        </div>
                    )}

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

export default ReservaIndividual;
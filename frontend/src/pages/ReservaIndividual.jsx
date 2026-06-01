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

const formatearNumero = (valor) => {
    const numeros = valor.replace(/\D/g, '');

    const parts = [];

    for (let i = 0; i < numeros.length; i += 4) {
        parts.push(numeros.substring(i, i + 4));
    }

    return parts.join(' ');
};

const ReservaIndividual = () => {

    const location = useLocation();
    const navigate = useNavigate();

    const { clase, fechaSeleccionada } = location.state || {};

    const [paso, setPaso] = useState('confirmacion');

    const [mensaje, setMensaje] = useState('');
    const [cargando, setCargando] = useState(false);
    const [alerta, setAlerta] = useState(null);

    const [reservaId, setReservaId] = useState(null);
    const [monto, setMonto] = useState(0);
    const [debeListaEspera, setDebeListaEspera] = useState(false);
    
    const [tipoPago, setTipoPago] = useState('sena');

    // pago
    const [nroTarjeta, setNroTarjeta] = useState('');
    const [titular, setTitular] = useState('');
    const [cvv, setCvv] = useState('');
    const [vencimiento, setVencimiento] = useState('');

    if (!clase || !fechaSeleccionada) {
        return (
            <div className="reserva-empty-state">
                <span className="reserva-empty-icon">📭</span>
                <p>No hay clase seleccionada.</p>

                <button
                    className="boton-accion"
                    onClick={() => navigate('/clases')}
                >
                    Volver
                </button>
            </div>
        );
    }

    const emojiDisciplina = {
        yoga: '🧘',
        pilates: '🤸',
        funcional: '⚡'
    }[clase.actividad?.toLowerCase()] || '🏋️';

    // ─────────────────────────────────────────────
    // CREAR RESERVA
    // ─────────────────────────────────────────────

    const handleCrearReserva = async () => {

        setCargando(true);
        setMensaje('');

        try {

            const res = await api.post(
                '/reservas/individual/verificar-cupo',
                {
                    clase_id: clase.id,
                    fecha_clase: fechaSeleccionada,
                    tipo_pago: 'sena'
                }
            );

            setDebeListaEspera(res.data.debe_lista_espera);

            if (res.data.debe_lista_espera) {
                setPaso('lista_espera');
            } else {
                setPaso('tipo_pago');
            }

        } catch (err) {

            setMensaje(
                typeof err.response?.data?.detail === 'string'
                    ? err.response.data.detail
                    : 'Error inesperado'
            );

            setPaso('error');

        } finally {
            setCargando(false);
        }
    };

    // ─────────────────────────────────────────────
    // RECHAZAR LISTA ESPERA
    // ─────────────────────────────────────────────

    const handleRechazarLista = async () => {

        setMensaje('Reserva cancelada');
        setPaso('error');
    };

    // ─────────────────────────────────────────────
    // ACEPTAR LISTA ESPERA
    // ─────────────────────────────────────────────

    const handleAceptarLista = () => {
        setPaso('tipo_pago');
    };

    const handleContinuarPago = async () => {

        setCargando(true);

        try {

            const res = await api.post(
                '/reservas/individual/crear',
                {
                    clase_id: clase.id,
                    fecha_clase: fechaSeleccionada,
                    tipo_pago: tipoPago
                }
            );

            setReservaId(res.data.reserva_id);
            setMonto(res.data.monto_a_pagar);

            setPaso('pago');

        } catch (err) {

            setMensaje(
                typeof err.response?.data?.detail === 'string'
                    ? err.response.data.detail
                    : 'Error inesperado'
            );

            setPaso('error');

        } finally {
            setCargando(false);
        }
    };

    // ─────────────────────────────────────────────
    // PAGAR
    // ─────────────────────────────────────────────

    const handlePagar = async () => {

        if (!nroTarjeta.trim() || !titular.trim() || !cvv.trim() || !vencimiento.trim()) {
            setMensaje('Por favor, completá todos los los datos de la tarjeta.');
            return;
        }

        setCargando(true);
        setMensaje('');

        try {

            const res = await api.post('/reservas/individual/pagar', {
                reserva_id: reservaId,
                numero_tarjeta: nroTarjeta,
                titular,
                cvv,
                fecha_vencimiento: vencimiento,
                acepta_lista_espera: debeListaEspera
            });

            // ALERTA (si existe)
            if (res.data.alerta) {
                setAlerta({
                    mensaje: res.data.alerta
                });
            }

            // MENSAJE PRINCIPAL
            if (res.data.mensaje === 'Pago realizado y agregado a lista de espera') {
                setMensaje('Reserva exitosa con lista de espera');
            } else {
                setMensaje('Reserva exitosa');
            }

            setPaso('exito');

        } catch (err) {

            setMensaje(
                typeof err.response?.data?.detail === 'string'
                    ? err.response.data.detail
                    : 'No se pudo procesar el pago.'
            );

            setPaso('error');

        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="reserva-page">

            {/* HEADER */}

            <div className="reserva-page-header">

                <button
                    className="reserva-back"
                    onClick={() => navigate(-1)}
                >
                    ← Volver
                </button>

                <span className="reserva-page-label">
                    Reserva individual
                </span>

            </div>

            <div className="reserva-layout">

                {/* IZQUIERDA */}

                <div className="reserva-info-col">

                    <div className="reserva-clase-hero">

                        <div className="reserva-clase-emoji">
                            {emojiDisciplina}
                        </div>

                        <div>

                            <h2 className="reserva-clase-nombre">
                                {clase.actividad}
                            </h2>

                            <p className="reserva-clase-sub">
                                {formatearFecha(fechaSeleccionada)}
                            </p>

                            <p className="reserva-clase-sub">
                                {formatearHora(clase.horario)}
                            </p>

                        </div>

                    </div>

                    <div className="reserva-desglose">

                        <div className="reserva-desglose-titulo">
                            Resumen
                        </div>

                        <div className="reserva-desglose-fila">
                            <span>Precio total</span>
                            <span>${clase.precio_individual}</span>
                        </div>

                            <div className="reserva-desglose-fila reserva-desglose-fila--descuento">
                                <span>
                                    {tipoPago === 'sena'
                                        ? 'Seña (50%)'
                                        : 'Pago total (100%)'}
                                </span>

                                <span>
                                    $
                                    {tipoPago === 'sena'
                                        ? (clase.precio_individual * 0.5).toFixed(2)
                                        : clase.precio_individual.toFixed(2)}
                                </span>
                            </div>

                            <div className="reserva-desglose-total">
                                <span>Total a pagar</span>
                                <span>${(clase.precio_individual * (tipoPago === 'sena' ? 0.5 : 1)).toFixed(2)}</span>
                            </div>

                    </div>

                </div>

                {/* DERECHA */}

                <div className="reserva-accion-col">

                    {/* CONFIRMACION */}

                    {paso === 'confirmacion' && (

                        <div className="reserva-accion-card">

                            <h3 className="reserva-accion-titulo">
                                Confirmar reserva
                            </h3>

                            <p className="reserva-accion-desc">
                                Vas a reservar una clase individual de{' '}
                                <strong>{clase.actividad}</strong>.
                            </p>

                            <button
                                className="boton-accion"
                                onClick={handleCrearReserva}
                                disabled={cargando}
                            >
                                {cargando
                                    ? <span className="reserva-spinner" />
                                    : 'Confirmar y pagar →'}
                            </button>

                        </div>
                    )}

                    {/* LISTA ESPERA */}

                    {paso === 'lista_espera' && (

                        <div className="reserva-accion-card">

                            <div className="reserva-espera-icon">
                                ⚠️
                            </div>

                            <h3 className="reserva-accion-titulo">
                                Clase sin cupos
                            </h3>

                            <p className="reserva-espera-pregunta">
                                La clase no posee disponibilidad.
                                ¿Desea confirmar lista de espera?
                            </p>

                            <div className="reserva-espera-botones">

                                <button
                                    className="boton-accion"
                                    onClick={handleAceptarLista}
                                >
                                    Confirmar lista de espera
                                </button>

                                <button
                                    className="boton-cancelar"
                                    onClick={handleRechazarLista}
                                >
                                    Rechazar lista de espera
                                </button>

                            </div>

                        </div>
                    )}
                    {paso === 'tipo_pago' && (

                        <div className="reserva-accion-card">

                            <h3 className="reserva-accion-titulo">
                                Seleccionar forma de pago
                            </h3>

                            <div
                                className="reserva-tipo-pago"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    marginBottom: '20px'
                                }}
                            >

                                <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                        type="radio"
                                        value="sena"
                                        checked={tipoPago === 'sena'}
                                        onChange={(e) => setTipoPago(e.target.value)}
                                    />
                                    Pagar seña (50%)
                                </label>

                                <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                        type="radio"
                                        value="total"
                                        checked={tipoPago === 'total'}
                                        onChange={(e) => setTipoPago(e.target.value)}
                                    />
                                    Pagar total (100%)
                                </label>

                            </div>

                            <button
                                className="boton-accion"
                                onClick={handleContinuarPago}
                            >
                                Continuar →
                            </button>

                        </div>

                    )}

                    {/* PAGO */}

                    {paso === 'pago' && (

                        <div className="pago-form-card">

                            <h2 className="pago-form-titulo">
                                Datos de pago
                            </h2>

                            <div className="pago-field">

                                <label className="pago-label">
                                    Número de tarjeta
                                </label>

                                <input
                                    className="pago-input pago-input--wide"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="1111 2222 3333 4444"
                                    value={nroTarjeta}
                                    onChange={(e) =>
                                        setNroTarjeta(
                                            formatearNumero(e.target.value)
                                        )
                                    }
                                    maxLength={19}
                                />

                            </div>

                            <div className="pago-field">

                                <label className="pago-label">
                                    Nombre del titular
                                </label>

                                <input
                                    className="pago-input pago-input--wide"
                                    type="text"
                                    placeholder="Tal como aparece en la tarjeta"
                                    value={titular}
                                    onChange={(e) => {
                                        const valor = e.target.value.replace(
                                            /[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g,
                                            ''
                                        );

                                        setTitular(valor);
                                    }}
                                />

                            </div>

                            <div
                                className="pago-field"
                                style={{ maxWidth: '160px' }}
                            >

                                <label className="pago-label">
                                    Código de seguridad
                                </label>

                                <input
                                    className="pago-input"
                                    type="password"
                                    inputMode="numeric"
                                    placeholder="•••"
                                    value={cvv}
                                    onChange={(e) =>
                                        setCvv(
                                            e.target.value
                                                .replace(/\D/g, '')
                                                .slice(0, 4)
                                        )
                                    }
                                />

                            </div>

                            <div
                                className="pago-field"
                                style={{ maxWidth: '160px' }}
                            >
                                <label className="pago-label">
                                    Fecha de vencimiento
                                </label>

                                <input
                                    className="pago-input"
                                    type="text"
                                    placeholder="MM/AA"
                                    value={vencimiento}
                                    onChange={(e) => {
                                        let valor = e.target.value.replace(/\D/g, '');

                                        if (valor.length > 2) {
                                            valor = valor.slice(0, 2) + '/' + valor.slice(2, 4);
                                        }

                                        setVencimiento(valor);
                                    }}
                                    maxLength={5}
                                />
                            </div>

                            {mensaje && (
                                <p className="pago-error-msg">
                                    {mensaje}
                                </p>
                            )}

                            <button
                                className="pago-btn-primary"
                                onClick={handlePagar}
                                disabled={cargando}
                            >

                                {cargando
                                    ? (
                                        <>
                                            <span className="pago-spinner" />
                                            Procesando...
                                        </>
                                    )
                                    : `Pagar $${monto.toFixed(2)}`
                                }

                            </button>

                            <p className="pago-seguro-txt">
                                🔒 Pago simulado — tus datos no se almacenan
                            </p>

                        </div>
                    )}

                    {/* EXITO */}

                    {paso === 'exito' && (

                        <div className="pago-resultado pago-resultado--ok">

                            <div className="pago-resultado-icon">
                                ✓
                            </div>

                            <h3>{mensaje}</h3>

                            <p>
                                Tu reserva fue procesada correctamente.
                            </p>

                            <button
                                className="pago-btn-primary"
                                onClick={() => navigate('/perfil')}
                            >
                                Ir a mis reservas
                            </button>

                        </div>
                    )}

                    {/* ERROR */}

                    {paso === 'error' && (

                        <div className="pago-resultado pago-resultado--error">

                            <div className="pago-resultado-icon pago-resultado-icon--error">
                                ✕
                            </div>

                            <h3>{mensaje}</h3>

                            <button
                                className="pago-btn-ghost"
                                onClick={() => navigate('/home')}
                            >
                                Volver al home
                            </button>

                        </div>
                    )}

                </div>

            </div>

        </div>
    );
};

export default ReservaIndividual;
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../assets/css/Pago.css';
import api from '../api/api.js';

// Función auxiliar para separar los números de la tarjeta de 4 en 4
const formatearNumero = (valor) => {
    const v = valor.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0; i < match.length; i += 4) {
        parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
        return parts.join(' ');
    } else {
        return valor;
    }
};

const Pago = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const {
        monto            = 0,
        fechasConCupo     = [], 
        fechasSinCupo    = [],
        aceptaListaEspera = true,
        claseInfo        = null,
        claseId          = null, 
    } = location.state || {};

    // 1. Agregamos los estados para el Titular y el CVV
    const [nroTarjeta, setNroTarjeta] = useState('');
    const [titular,    setTitular]    = useState('');
    const [cvv,        setCvv]        = useState('');
    
    const [estado,     setEstado]     = useState('inicial');  // inicial | exito | error
    const [mensaje,    setMensaje]    = useState('');
    const [cargando,   setCargando]   = useState(false);

    if (!fechasConCupo.length && !fechasSinCupo.length) {
        return (
            <div className="pago-empty">
                <span>📭</span>
                <p>No hay reservas pendientes de pago.</p>
                <button className="pago-btn-primary" onClick={() => navigate('/')}>
                    Volver al inicio
                </button>
            </div>
        );
    }

    const handlePagar = async () => {
        // Validación frontend simple
        if (!nroTarjeta.trim() || !titular.trim() || !cvv.trim()) {
            setMensaje('Por favor, completá todos los datos de la tarjeta.');
            return;
        }

        setCargando(true);
        setMensaje('');

        try {
            // NOTA: Acá NO enviamos 'titular' ni 'cvv' para que no explote tu backend desactualizado
            const res = await api.post('/reservas/membresia/confirmar-pago', {
                clase_id:            claseId,
                fechas_con_cupo:     fechasConCupo,
                fechas_sin_cupo:     fechasSinCupo,
                acepta_lista_espera: aceptaListaEspera,
                pago_exitoso:        true,
                monto_total:         monto,
                numero_tarjeta:      nroTarjeta,  
            });

            setMensaje('Reserva exitosa');
            setEstado('exito');

        } catch (err) {
            setMensaje(
                typeof err.response?.data?.detail === 'string'
                    ? err.response.data.detail
                    : 'No se pudo procesar el pago.'
            );
            setEstado('error');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="pago-page">

            {/* ── ENCABEZADO ── */}
            <div className="pago-header">
                <button className="pago-back" onClick={() => navigate(-1)}>← Volver</button>
                <span className="pago-header-label">Pago seguro</span>
            </div>

            <div className="pago-layout">

                {/* ── IZQUIERDA: resumen ── */}
                <div className="pago-resumen-col">
                    <div className="pago-resumen-card">
                        <div className="pago-resumen-label">Resumen de compra</div>

                        {claseInfo && (
                            <>
                                <div className="pago-resumen-fila">
                                    <span>Clase</span>
                                    <span style={{ textTransform: 'capitalize' }}>
                                        {claseInfo.actividad}
                                    </span>
                                </div>

                                <div className="pago-resumen-fila">
                                    <span>Día y horario</span>
                                    <span style={{ textTransform: 'capitalize' }}>
                                        {claseInfo.dia} {claseInfo.horario?.slice(0, 5)}
                                    </span>
                                </div>

                                <div className="pago-resumen-fila">
                                    <span>Clases incluidas</span>
                                    <span>{fechasConCupo.length}</span>
                                </div>
                            </>
                        )}

                        <div className="pago-resumen-total">
                            <span>Total</span>
                            <span>${monto.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* 2. Card visual de tarjeta actualizada con Titular y CVV */}
                    <div className="pago-card-visual">
                        <div className="pago-card-chip">▬</div>

                        <div className="pago-card-numero">
                            {nroTarjeta || '···· ···· ···· ····'}
                        </div>

                        <div className="pago-card-bottom">
                            <div>
                                <div className="pago-card-sublabel">Titular</div>
                                <div
                                    className="pago-card-valor"
                                    style={{ textTransform: 'uppercase' }}
                                >
                                    {titular || 'NOMBRE APELLIDO'}
                                </div>
                            </div>

                            <div>
                                <div className="pago-card-sublabel">CVV</div>
                                <div className="pago-card-valor">
                                    {cvv ? '•'.repeat(cvv.length) : '•••'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── DERECHA: formulario ── */}
                <div className="pago-form-col">

                    {estado === 'inicial' && (
                        <div className="pago-form-card">

                            <h2 className="pago-form-titulo">Datos de pago</h2>

                            {/* 3. Inputs agregados al formulario */}

                            {/* Número de tarjeta */}
                            {monto > 0 ? (
                                <>

                                    {/* Número de tarjeta */}
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
                                            onChange={e =>
                                                setNroTarjeta(
                                                    formatearNumero(e.target.value)
                                                )
                                            }
                                            maxLength={19}
                                        />
                                    </div>

                                    {/* Titular de la tarjeta */}
                                    <div className="pago-field">
                                        <label className="pago-label">
                                            Nombre del titular
                                        </label>

                                        <input
                                            className="pago-input pago-input--wide"
                                            type="text"
                                            placeholder="Tal como aparece en la tarjeta"
                                            value={titular}
                                            onChange={e => setTitular(e.target.value)}
                                        />
                                    </div>

                                    {/* CVV */}
                                    <div
                                        className="pago-field"
                                        style={{ maxWidth: '160px' }}
                                    >
                                        <label className="pago-label">
                                            Código de seguridad (CVV)
                                        </label>

                                        <input
                                            className="pago-input"
                                            type="password"
                                            inputMode="numeric"
                                            placeholder="•••"
                                            value={cvv}
                                            onChange={e =>
                                                setCvv(
                                                    e.target.value
                                                        .replace(/\D/g, '')
                                                        .slice(0, 4)
                                                )
                                            }
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
                                        {cargando ? (
                                            <>
                                                <span className="pago-spinner" />
                                                {' '}Procesando...
                                            </>
                                        ) : (
                                            monto > 0
                                                ? `Pagar $${monto.toFixed(2)}`
                                                : 'Confirmar reserva'
                                        )}
                                    </button>

                                    <p className="pago-seguro-txt">
                                        🔒 Pago simulado — tus datos no se almacenan
                                    </p>

                                </>
                            ) : (

                                <div className="pago-credito-box">

                                    <div className="pago-credito-icon">🎟️</div>

                                    <h3>Reserva cubierta con créditos</h3>

                                    <p>
                                        Esta reserva no requiere pago porque tenés créditos disponibles generados por cancelaciones/eliminaciones anteriores.
                                    </p>

                                    <button
                                        className="pago-btn-primary"
                                        onClick={handlePagar}
                                        disabled={cargando}
                                    >
                                        Confirmar reserva
                                    </button>

                                </div>

                            )}

                        </div>
                    )}

                    {estado === 'exito' && (
                        <div className="pago-resultado pago-resultado--ok">

                            <div className="pago-resultado-icon">✓</div>

                            <h3>¡Reserva confirmada!</h3>

                            <p>
                                Tu lugar está asegurado.
                                Te enviamos el comprobante a tu correo.
                            </p>

                            <button
                                className="pago-btn-primary"
                                onClick={() => navigate('/perfil')}
                            >
                                Ver mis reservas
                            </button>

                        </div>
                    )}

                    {estado === 'error' && (
                        <div className="pago-resultado pago-resultado--error">

                            <div className="pago-resultado-icon pago-resultado-icon--error">
                                ✕
                            </div>

                            <h3>{mensaje}</h3>

                            <button
                                className="pago-btn-ghost"
                                onClick={() => {
                                    setEstado('inicial');
                                    setMensaje('');
                                }}
                            >
                                Intentar de nuevo
                            </button>

                            <button
                                className="pago-btn-ghost"
                                onClick={() => navigate('/')}
                            >
                                Volver al inicio
                            </button>

                        </div>
                    )}

                </div> {/* pago-form-col */}

            </div> {/* pago-layout */}

        </div> /* pago-page */
    );
};
export default Pago;

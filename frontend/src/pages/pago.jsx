import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../assets/css/Pago.css';
import api from '../api/api.js';
import PagarConMP from '../components/PagarConMP';

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

    console.log("LOCATION STATE:", location.state);

    const {
        monto            = 0,
        fechasConCupo     = [], 
        fechasSinCupo    = [],
        aceptaListaEspera = true,
        claseInfo        = null,
        claseId          = null,
        creditosUsados   = 0,
        esPrimeraMembresia = false,
        reservaId = null,
        todasLasClases   = null,   // resumen de múltiples clases en renovación
        montoTotal       = null,   // total sumado de todas las clases
    } = location.state || {};

    const montoMostrado = montoTotal ?? monto;

    const [nroTarjeta, setNroTarjeta] = useState('');
    const [titular,    setTitular]    = useState('');
    const [cvv,        setCvv]        = useState('');
    const [vencimiento, setVencimiento] = useState('');
    
    const [estado,     setEstado]     = useState('inicial');  // inicial | exito | error
    const [mensaje,    setMensaje]    = useState('');
    const [cargando,   setCargando]   = useState(false);
    const [metodoPago, setMetodoPago] = useState('tarjeta'); // 'tarjeta' | 'mp'

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
        // Validación frontend simple (solo si requiere pago en dinero)
        if (montoMostrado > 0 && (!nroTarjeta.trim() || !titular.trim() || !cvv.trim() || !vencimiento.trim() )) {
            setMensaje('Por favor, completá todos los datos de la tarjeta.');
            return;
        }

        setCargando(true);
        setMensaje('');

        if (reservaId) {
            try {
                const res = await api.post('/reservas/individual/pagar', {
                    reserva_id: reservaId,
                    numero_tarjeta: nroTarjeta,
                    titular: titular,
                    cvv: cvv,
                    fecha_vencimiento: vencimiento,
                    acepta_lista_espera: true,
                    usa_credito: false
                });

                setMensaje('Reserva confirmada');
                setEstado('exito');

                return; // 🔴 IMPORTANTE: corta el flujo
            } catch (err) {
                setMensaje(
                    typeof err.response?.data?.detail === 'string'
                        ? err.response.data.detail
                        : 'No se pudo procesar el pago.'
                );
                setEstado('error');
                return;
            }
        }

        try {
            // Pagar la clase principal
            await api.post('/reservas/membresia/pagar', {
                clase_id:            claseId,
                fechas_con_cupo:     fechasConCupo,
                fechas_sin_cupo:     fechasSinCupo,
                acepta_lista_espera: aceptaListaEspera,
                pago_exitoso:        true,
                monto_total:         monto,
                numero_tarjeta:      nroTarjeta,
                titular:             titular,
                cvv:                 cvv,
                fecha_vencimiento:   vencimiento,
            });

            // Si hay clases pendientes en sessionStorage, procesarlas también
            const pendientesRaw = sessionStorage.getItem('renovaciones_pendientes');
            if (pendientesRaw) {
                const pendientes = JSON.parse(pendientesRaw);
                sessionStorage.removeItem('renovaciones_pendientes');

                for (const item of pendientes) {
                    const subtotal = item.clase.precio_individual * item.fechas_mes.length;
                    await api.post('/reservas/membresia/pagar', {
                        clase_id:            item.clase.id,
                        fechas_con_cupo:     item.fechas_mes,
                        fechas_sin_cupo:     [],
                        acepta_lista_espera: true,
                        pago_exitoso:        true,
                        monto_total:         subtotal,
                        numero_tarjeta:      nroTarjeta,
                        titular:             titular,
                        cvv:                 cvv,
                        fecha_vencimiento:   vencimiento,
                    });
                }
            }

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

                        {todasLasClases ? (
                            /* ── Múltiples clases (renovación) ── */
                            <>
                                {todasLasClases.map((c, i) => (
                                    <div key={i} className="pago-resumen-bloque">
                                        <div className="pago-resumen-fila">
                                            <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{c.actividad}</span>
                                            <span>${c.subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="pago-resumen-fila pago-resumen-fila--sub">
                                            <span style={{ textTransform: 'capitalize', color: '#aaa', fontSize: '0.85em' }}>
                                                {c.dia} · {c.horario?.slice(0,5)} hs · {c.clases} clase{c.clases !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                <div className="pago-resumen-total">
                                    <span>Total</span>
                                    <span>${Number(montoMostrado).toFixed(2)}</span>
                                </div>
                            </>
                        ) : claseInfo ? (
                            /* ── Una sola clase ── */
                            <>
                                <div className="pago-resumen-fila">
                                    <span>Clase</span>
                                    <span style={{ textTransform: 'capitalize' }}>{claseInfo.actividad}</span>
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
                                {creditosUsados > 0 && (
                                    <div className="pago-resumen-fila" style={{ color: '#4caf50' }}>
                                        <span>🎟️ Créditos aplicados</span>
                                        <span>-{creditosUsados} clase{creditosUsados > 1 ? 's' : ''}</span>
                                    </div>
                                )}
                                <div className="pago-resumen-total">
                                    <span>Total</span>
                                    <span>${Number(montoMostrado).toFixed(2)}</span>
                                </div>
                            </>
                        ) : null}

                    </div>

                    {/* Card visual de tarjeta */}
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

                            <h2 className="pago-form-titulo">Elegí cómo pagar</h2>

                            {montoMostrado > 0 && (
                                <div className="metodo-pago-selector">
                                    <button
                                        className={`metodo-pago-btn metodo-pago-btn--tarjeta ${metodoPago === 'tarjeta' ? 'activo' : ''}`}
                                        onClick={() => setMetodoPago('tarjeta')}
                                    >
                                        Tarjeta
                                    </button>
                                    <button
                                        className={`metodo-pago-btn metodo-pago-btn--mp ${metodoPago === 'mp' ? 'activo' : ''}`}
                                        onClick={() => setMetodoPago('mp')}
                                    >
                                        Mercado Pago
                                    </button>
                                </div>
                            )}

                            {montoMostrado > 0 ? (
                                <>
                                    {/* ── Formulario tarjeta ── */}
                                    {metodoPago === 'tarjeta' && (
                                        <>
                                            {/* Número de tarjeta */}
                                            <div className="pago-field">
                                                <label className="pago-label">Número de tarjeta</label>
                                                <input
                                                    className="pago-input pago-input--wide"
                                                    type="text"
                                                    inputMode="numeric"
                                                    autoComplete="cc-number"
                                                    placeholder="1111 2222 3333 4444"
                                                    value={nroTarjeta}
                                                    onChange={(e) => {
                                                        const numeros = e.target.value.replace(/\D/g, '');
                                                        const parts = [];
                                                        for (let i = 0; i < numeros.length; i += 4) {
                                                            parts.push(numeros.substring(i, i + 4));
                                                        }
                                                        setNroTarjeta(parts.join(' '));
                                                    }}
                                                    maxLength={19}
                                                />
                                            </div>

                                            {/* Titular */}
                                            <div className="pago-field">
                                                <label className="pago-label">Nombre del titular</label>
                                                <input
                                                    className="pago-input pago-input--wide"
                                                    type="text"
                                                    autoComplete="cc-name"
                                                    placeholder="Tal como aparece en la tarjeta"
                                                    value={titular}
                                                    onChange={(e) => {
                                                        const valor = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
                                                        setTitular(valor);
                                                    }}
                                                />
                                            </div>

                                            {/* CVV y Vencimiento */}
                                            <div className="pago-field" style={{ maxWidth: '160px' }}>
                                                <label className="pago-label">Código de seguridad (CVV)</label>
                                                <input
                                                    className="pago-input"
                                                    type="text"
                                                    inputMode="numeric"
                                                    autoComplete="cc-csc"
                                                    style={{ WebkitTextSecurity: 'disc' }}
                                                    placeholder="•••"
                                                    value={cvv}
                                                    onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                                                />
                                            </div>

                                            <div className="pago-field">
                                                <label className="pago-label">Fecha de vencimiento</label>
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
                                                />
                                            </div>

                                            {mensaje && <p className="pago-error-msg">{mensaje}</p>}

                                            <button
                                                className="pago-btn-primary"
                                                onClick={handlePagar}
                                                disabled={cargando}
                                            >
                                                {cargando ? (
                                                    <><span className="pago-spinner" />{' '}Procesando...</>
                                                ) : (
                                                    `Pagar $${Number(montoMostrado).toFixed(2)}`
                                                )}
                                            </button>

                                            <p className="pago-seguro-txt">
                                                🔒 Pago simulado — tus datos no se almacenan
                                            </p>
                                        </>
                                    )}

                                    {/* ── Mercado Pago ── */}
                                    {metodoPago === 'mp' && (
                                        <div className="mp-bloque">
                                            <p className="mp-descripcion">
                                                Serás redirigido al sitio de Mercado Pago para completar el pago de forma segura.
                                            </p>
                                            {mensaje && <p className="pago-error-msg">{mensaje}</p>}
                                            <PagarConMP
                                                tipo="membresia"
                                                payload={{
                                                    clase_id:        claseId,
                                                    fechas_con_cupo: fechasConCupo,
                                                    fechas_sin_cupo: fechasSinCupo,
                                                    monto_total:     montoMostrado,
                                                    es_renovacion:   location.state?.esRenovacion ?? true,
                                                }}
                                                onError={(msg) => setMensaje(msg)}
                                            />
                                        </div>
                                    )}
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
                                        {cargando ? (
                                            <>
                                                <span className="pago-spinner" />
                                                {' '}Confirmando...
                                            </>
                                        ) : (
                                            'Confirmar reserva'
                                        )}
                                    </button>
                                </div>
                            )}

                        </div>
                    )}

                    {estado === 'exito' && (
                        <div className="pago-resultado pago-resultado--ok">
                            <div className="pago-resultado-icon">✓</div>
                            <h3>
                                {esPrimeraMembresia ? '¡Membresía activada!' : '¡Membresía renovada!'}
                            </h3>
                            <p>
                                {esPrimeraMembresia
                                    ? 'Tu membresía fue creada correctamente. Ya podés reservar todas las clases del mes.'
                                    : 'Tu membresía fue renovada correctamente.'}

                                {location.state?.fechaVencimiento && (
                                    <>
                                        <br />
                                        Vence el: <strong>{location.state.fechaVencimiento}</strong>
                                    </>
                                )}
                            </p>
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

                </div>
            </div>
        </div>
    );
};
export default Pago;
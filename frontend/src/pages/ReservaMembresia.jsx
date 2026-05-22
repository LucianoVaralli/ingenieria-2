import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import '../assets/css/Reserva.css';

/**
 * ReservaMembresia
 * Recibe por location.state: { clase, fechasDelMes }
 *
 * Flujo:
 *  1. Muestra detalle y botón "Reservar Turno"
 *  2. Llama a POST /reservas/membresia/crear
 *  3a. Si todas tienen cupo → navega a Pago
 *  3b. Si alguna no tiene cupo → muestra cartel con fechas sin cupo
 *       - "Confirmar lista de espera" → navega a Pago
 *       - "Cancelar lista de espera" → cancela todo → informa "reserva cancelada"
 */
const ReservaMembresia = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const { clase, fechasDelMes } = location.state || {};

    const [paso,         setPaso]         = useState('inicial');
    const [mensaje,      setMensaje]      = useState('');
    const [cargando,     setCargando]     = useState(false);
    const [datosReserva, setDatosReserva] = useState(null);

    if (!clase || !fechasDelMes) {
        return (
            <div className="reserva-container">
                <p>No hay clase seleccionada.</p>
                <button className="boton-accion" onClick={() => navigate('/clases')}>
                    Volver a clases
                </button>
            </div>
        );
    }

    // ── Paso 1: crear reservas pendientes ─────────────────────────────────
    const handleReservar = async () => {
        setCargando(true);
        try {
            const res = await api.post('/reservas/membresia/crear', {
                clase_id:     clase.id,
                fechas_clase: fechasDelMes
            });

            setDatosReserva(res.data);

            if (res.data.hay_lista_espera) {
                // Escenario 3: hay fechas sin cupo → mostrar cartel
                setPaso('confirmar_espera');
            } else {
                // Escenarios 1 y 2: todas con cupo → ir al pago
                navegarAlPago(res.data, true);
            }

        } catch (err) {
            // Escenario 5: ya tiene reserva en ese horario
            setMensaje(err.response?.data?.detail || 'Error inesperado');
            setPaso('error');
        } finally {
            setCargando(false);
        }
    };

    // ── Paso 2: respuesta al cartel de lista de espera ────────────────────
    const handleResponderEspera = async (acepta) => {
        if (!acepta) {
            // Escenario 6: canceló lista de espera
            // Limpiamos las reservas pendientes llamando a confirmar-pago con acepta=false
            setCargando(true);
            try {
                await api.post('/reservas/membresia/confirmar-pago', {
                    reservas_ids:         datosReserva.reservas_ids,
                    fechas_sin_cupo:      datosReserva.fechas_sin_cupo,
                    acepta_lista_espera:  false,
                    pago_exitoso:         false,
                });
            } catch (_) {
                // El backend devuelve 400 "reserva cancelada" → es lo esperado
            } finally {
                setCargando(false);
            }
            setMensaje('reserva cancelada');
            setPaso('error');
            return;
        }

        // Confirmó lista de espera → ir al pago
        navegarAlPago(datosReserva, true);
    };

    // ── Navegar a la pantalla de Pago ─────────────────────────────────────
    const navegarAlPago = (datos, aceptaEspera) => {
        navigate('/pago', {
            state: {
                monto:              datos.monto_total,
                reservasIds:        datos.reservas_ids,
                fechasSinCupo:      datos.fechas_sin_cupo ?? [],
                aceptaListaEspera:  aceptaEspera,
                claseInfo:          clase,
                claseId:            clase.id, 
            }
        });
    };

    // ── Cálculo de precios ────────────────────────────────────────────────
   const hoy = new Date();
   const clasesPerdidas = fechasDelMes.filter(f => new Date(f) < hoy).length;
   const descuentoPorClase = clase.precio_individual * 0.20;
   const descuentoEstimado = clasesPerdidas * descuentoPorClase;
   const precioBase = clase.precio_individual * fechasDelMes.length;
   const descuento  = datosReserva?.descuento_aplicado ?? descuentoEstimado;
   const montoFinal = datosReserva?.monto_total ?? (precioBase - descuentoEstimado);

    return (
        <div className="reserva-container">
            <h2>Reservar con Membresía</h2>

            {/* ── Detalle de la clase ──────────────────────────────── */}
            <div className="reserva-card">
                <p><strong>Actividad:</strong> {clase.actividad}</p>
                <p><strong>Día:</strong> {clase.dia}</p>
                <p><strong>Horario:</strong> {clase.horario}</p>
                <p><strong>Clases del mes:</strong> {fechasDelMes.length}</p>
                <p><strong>Precio por clase:</strong> ${clase.precio_individual}</p>
                {(descuentoEstimado > 0 || descuento > 0) && (
                    <p className="reserva-descuento">
                         Descuento por {clasesPerdidas} clase{clasesPerdidas > 1 ? 's' : ''} perdida{clasesPerdidas > 1 ? 's' : ''}: -${descuento.toFixed(2)}
                    </p>
                )}
                <p className="reserva-total"><strong>Total: ${montoFinal.toFixed(2)}</strong></p>
            </div>

            {/* ── Paso: inicial ────────────────────────────────────── */}
            {paso === 'inicial' && (
                <button
                    className="boton-accion"
                    onClick={handleReservar}
                    disabled={cargando}
                >
                    {cargando ? 'Procesando...' : 'Reservar Turno'}
                </button>
            )}

            {/* ── Paso: cartel lista de espera (escenario 3 y 6) ───── */}
            {paso === 'confirmar_espera' && (
                <div className="reserva-aviso">
                    <p>Las siguientes clases no tienen cupo disponible:</p>
                    <ul>
                        {datosReserva.fechas_sin_cupo.map(f => <li key={f}>{f}</li>)}
                    </ul>
                    <p>
                        <strong>
                            {datosReserva.mensaje_espera}
                        </strong>
                    </p>
                    <div className="reserva-botones">
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
                            Cancelar lista de espera
                        </button>
                    </div>
                </div>
            )}

            {/* ── Paso: error ──────────────────────────────────────── */}
            {paso === 'error' && (
                <div className="reserva-error">
                    <h3>❌ {mensaje}</h3>
                    <button className="boton-cancelar" onClick={() => navigate('/clases')}>
                        Volver a clases
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReservaMembresia;

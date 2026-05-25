import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/api.js';
import '../assets/css/Reserva.css';

const formatearHora = (hora) => {
    return hora?.slice(0, 5);
};

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

    
    const handleReservar = async () => {
        setCargando(true);
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Separamos antes de mandar al backend
        const fechasFuturas = fechasDelMes.filter(f => new Date(f) >= hoy);
        const fechasPasadas = fechasDelMes.filter(f => new Date(f) < hoy);

        if (fechasFuturas.length === 0) {
            setMensaje('No quedan clases futuras para este mes.');
            setPaso('error');
            return;
        }

        const res = await api.post('/reservas/membresia/crear', {
            clase_id:          clase.id,
            fechas_clase:      fechasFuturas,   // ← solo futuras al backend
            total_clases_mes:  fechasDelMes.length, // ← total real para el descuento
        });

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
                    reservas_ids:         datosReserva.reservas_ids,
                    fechas_sin_cupo:      datosReserva.fechas_sin_cupo,
                    acepta_lista_espera:  false,
                    pago_exitoso:         false,
                });
            } catch (_) {
                
            } finally {
                setCargando(false);
            }
            setMensaje('reserva cancelada');
            setPaso('error');
            return;
        }

        // Confirmó lista de espera 
        navegarAlPago(datosReserva, true);
    };

    
    const navegarAlPago = (datos, aceptaEspera) => {
        navigate('/pago', {
            state: {
                monto:              datos.monto_total,
                fechasConCupo:      datos.fechas_con_cupo,
                fechasSinCupo:      datos.fechas_sin_cupo ?? [],
                aceptaListaEspera:  aceptaEspera,
                claseInfo:          clase,
                claseId:            clase.id, 
            }
        });
    };

    
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

            {}
            <div className="reserva-card">
                <p><strong>Actividad:</strong> {clase.actividad}</p>
                <p><strong>Día:</strong> {clase.dia}</p>
                <p><strong>Horario:</strong> {formatearHora(clase.horario)}</p>
                <p><strong>Clases del mes:</strong> {fechasDelMes.length}</p>
                <p><strong>Precio por clase:</strong> ${clase.precio_individual}</p>
                {(descuentoEstimado > 0 || descuento > 0) && (
                    <p className="reserva-descuento">
                         Descuento por {clasesPerdidas} clase{clasesPerdidas > 1 ? 's' : ''} perdida{clasesPerdidas > 1 ? 's' : ''}: -${descuento.toFixed(2)}
                    </p>
                )}
                <p className="reserva-total"><strong>Total: ${montoFinal.toFixed(2)}</strong></p>
            </div>

            {}
            {paso === 'inicial' && (
                <button
                    className="boton-accion"
                    onClick={handleReservar}
                    disabled={cargando}
                >
                    {cargando ? 'Procesando...' : 'Reservar Turno'}
                </button>
            )}

            {}
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

            {}
            {paso === 'error' && (
                <div className="reserva-error">
                    <h3> {mensaje}</h3>
                    <button className="boton-cancelar" onClick={() => navigate('/clases')}>
                        Volver a clases
                    </button>
                </div>
            )}
        </div>
    );
};

export default ReservaMembresia;

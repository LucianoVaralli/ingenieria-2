import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../assets/css/Pago.css';
import api from '../api/api.js';


const TARJETAS = {
    '123456': { tipo: 'crédito', fondos: true },
    '456789': { tipo: 'débito',  fondos: true },
    '123789': { tipo: 'crédito', fondos: false },
    '456123': { tipo: 'débito',  fondos: false },
};

const Pago = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const {
        monto            = 0,
        reservasIds      = [],
        fechasSinCupo    = [],
        aceptaListaEspera = true,
        claseInfo        = null,
        claseId          = null, 
    } = location.state || {};

    const [nroTarjeta, setNroTarjeta] = useState('');
    const [estado,     setEstado]     = useState('inicial');  // inicial | exito | error
    const [mensaje,    setMensaje]    = useState('');
    const [cargando,   setCargando]   = useState(false);

    if (!reservasIds.length && !fechasSinCupo.length) {
    return (
        <div className="pago-container">
            <p>No hay reservas pendientes de pago.</p>
            <button className="boton-pago" onClick={() => navigate('/clases')}>
                Volver a clases
            </button>
        </div>
    );
}

    const handlePagar = async () => {
    if (!nroTarjeta.trim()) {
        setMensaje('Ingresá el número de tarjeta.');
        return;
    }

    setCargando(true);
    setMensaje('');

    try {
        const tarjeta = TARJETAS[nroTarjeta];

        //  fallo de conexión
        if (tarjeta?.tipo === 'error') {
            throw new Error('CONNECTION_ERROR');
        }

        // E3 y E4: fondos insuficientes
        if (tarjeta && !tarjeta.fondos) {
            setMensaje('la cuenta no tiene saldo suficiente');
            setEstado('error');
            setCargando(false);
            return;
        }

        // pago exitoso
        const res = await api.post('/reservas/membresia/confirmar-pago', {
            reservas_ids:        reservasIds,
            fechas_sin_cupo:     fechasSinCupo,
            acepta_lista_espera: aceptaListaEspera,
            pago_exitoso:        true,
            clase_id:             claseId, 
        });
        console.log('Respuesta del backend:', res.data);
        const mensajePago = res.data.mensaje === 'registrado en lista de espera'
            ? 'Reserva exitosa con lista de espera'
            : 'Reserva exitosa';
        setMensaje(mensajePago);
        setEstado('exito');

    } catch (err) {
        if (err.message === 'CONNECTION_ERROR') {
            setMensaje('hay inconvenientes con la conexión al banco');
        } else {
            setMensaje(
                err.response?.data?.detail ||
                'no se ha realizado el pago correctamente, no se puede llevar a cabo la reserva'
            );
        }
        setEstado('error');
    } finally {
        setCargando(false);
    }
    };

    return (
        <div className="pago-container">
            <h2>Pago de Membresía</h2>

            {}
            {claseInfo && (
                <div className="pago-resumen">
                    <p><strong>Clase:</strong> {claseInfo.actividad}</p>
                    <p><strong>Horario:</strong> {claseInfo.dia} {claseInfo.horario}</p>
                </div>
            )}
            <div className="pago-monto">
                Total a pagar: <strong>${monto.toFixed(2)}</strong>
            </div>

            {}
            {estado === 'inicial' && (
                <div className="pago-form">
                    <label className="pago-label">Número de tarjeta</label>
                    <input
                        className="pago-input"
                        type="text"
                        inputMode="numeric"
                        placeholder="Ingresá el número de tu tarjeta"
                        value={nroTarjeta}
                        onChange={e => setNroTarjeta(e.target.value)}
                        maxLength={20}
                    />

                    {mensaje && <p className="pago-error">{mensaje}</p>}

                    <button
                        className="boton-pago"
                        onClick={handlePagar}
                        disabled={cargando}
                    >
                        {cargando ? 'Procesando...' : 'Pagar'}
                    </button>
                </div>
            )}

            {}
            {estado === 'exito' && (
                <div className="pago-exito">
                    <h3> {mensaje}</h3>
                    <p>Te enviamos el comprobante de pago a tu correo.</p>
                    <button className="boton-pago" onClick={() => navigate('/mis-reservas')}>
                        Ver mis reservas
                    </button>
                </div>
            )}

            {}
            {estado === 'error' && (
                <div className="pago-error-box">
                    <h3> {mensaje}</h3>
                    <button className="boton-pago-cancelar" onClick={() => navigate('/clases')}>
                        Volver a clases
                    </button>
                </div>
            )}
        </div>
    );
};

export default Pago;

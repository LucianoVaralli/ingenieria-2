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
        fechasConCupo     = [], 
        fechasSinCupo    = [],
        aceptaListaEspera = true,
        claseInfo        = null,
        claseId          = null, 
    } = location.state || {};

    const [nroTarjeta, setNroTarjeta] = useState('');
    const [estado,     setEstado]     = useState('inicial');  // inicial | exito | error
    const [mensaje,    setMensaje]    = useState('');
    const [cargando,   setCargando]   = useState(false);

    if (!fechasConCupo.length && !fechasSinCupo.length) {
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
        const res = await api.post('/reservas/membresia/confirmar-pago', {
            clase_id:            claseId,
            fechas_con_cupo:     fechasConCupo,
            fechas_sin_cupo:     fechasSinCupo,
            acepta_lista_espera: aceptaListaEspera,
            pago_exitoso:        true,
            monto_total:         monto,
            numero_tarjeta:      nroTarjeta,  // ← el backend valida
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
                    <button className="boton-pago" onClick={() => navigate('/perfil')}>
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

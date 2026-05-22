import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api.js';

const MisReservas = () => {
    const [reservas, setReservas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchReservas = async () => {
            try {
                const res = await api.get('/reservas/mis-reservas');
                setReservas(res.data);
            } catch (err) {
                navigate('/login');
            } finally {
                setCargando(false);
            }
        };
        fetchReservas();
    }, [navigate]);

    if (cargando) return <p style={{ textAlign: 'center' }}>Cargando reservas...</p>;

    return (
        <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <h2>Mis Reservas</h2>

            {reservas.length === 0 ? (
                <p>No tenés reservas aún.</p>
            ) : (
                reservas.map(r => (
                    <div key={r.id} style={{
                        background: '#2a2a2a',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '12px',
                        color: 'white'
                    }}>
                        <p><strong>Fecha:</strong> {r.fecha_clase}</p>
                        <p><strong>Tipo:</strong> {r.tipo}</p>
                        <p><strong>Estado:</strong> {r.estado}</p>
                        <p><strong>Monto:</strong> ${r.monto_total}</p>
                    </div>
                ))
            )}
        </div>
    );
};

export default MisReservas;
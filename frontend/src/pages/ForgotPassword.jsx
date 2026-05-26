import React, { useState } from 'react';
import api from '../api/api.js';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const navigate = useNavigate();

    const handleForgotPassword = async (e) => {
        e.preventDefault();

        try {
            const res = await api.post(
                '/auth/forgot-password',
                { email: email }
            );

            // Notificación flotante de Éxito estilizada
            toast.success(res.data.message || '¡Código enviado correctamente!', {
                style: {
                    borderRadius: '8px',
                    background: '#222',
                    color: '#fff',
                },
            });

            // Redirige a la nueva pantalla después de 2 segundos
            setTimeout(() => {
                navigate('/reset-password');
            }, 2000);

        } catch (err) {
            console.error(err);

            const mensajeError = err.response?.data?.message || "Error al enviar el código";

            // Notificación flotante de Error estilizada
            toast.error(mensajeError, {
                style: {
                    borderRadius: '8px',
                    background: '#222',
                    color: '#fff',
                },
            });
        }
    };

    return (
        <div>
            <h1>Recuperar contraseña</h1>
            <form onSubmit={handleForgotPassword}>
                <input
                    type="email"
                    placeholder="Ingresar email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <button type="submit">
                    Enviar código
                </button>
            </form>
        </div>
    );
};

export default ForgotPassword;
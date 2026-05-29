import React, { useState } from 'react';
import api from '../api/api.js';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
// ── IMPORTACIÓN DEL CSS NUEVO ──
import '../assets/css/ForgotPassword.css';

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

            // 🌟 CAMBIO CLAVE: Guardamos el email en el navegador antes de irnos
            localStorage.setItem('reset_email', email);

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
        <div className="forgot-container">
            <div className="forgot-card">
                <h2 className="forgot-title">Recuperar contraseña</h2>

                <form className="forgot-form" onSubmit={handleForgotPassword}>
                    <div className="forgot-input-group">
                        <label className="forgot-label">Correo Electrónico</label>
                        <input
                            type="email"
                            className="forgot-input"
                            placeholder="usuario@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="forgot-button">
                        ENVIAR CÓDIGO
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForgotPassword;
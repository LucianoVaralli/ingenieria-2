import React, { useState } from 'react';
import api from '../api/api.js';
import { toast, Toaster } from 'react-hot-toast'; // Importamos Toaster para capturar el éxito
import { useNavigate } from 'react-router-dom';
import '../assets/css/ForgotPassword.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const navigate = useNavigate();

    // Estado local para capturar el error de la validación o del backend
    const [errorEmail, setErrorEmail] = useState('');

    // Handler para actualizar el valor y limpiar el error rojo en tiempo real al tipear
    const handleEmailChange = (val) => {
        setEmail(val);
        setErrorEmail('');
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();

        // 1. VALIDACIÓN CLIENTE: Campo vacío
        if (!email.trim()) {
            setErrorEmail("El correo electrónico es obligatorio.");
            return;
        }

        try {
            const res = await api.post(
                '/auth/forgot-password',
                { email: email }
            );

            // Notificación flotante de Éxito (Se mantiene porque el flujo avanza limpio)
            toast.success(res.data.message || '¡Código enviado correctamente!', {
                style: {
                    borderRadius: '8px',
                    background: '#222',
                    color: '#fff',
                },
            });

            // Guardamos el email en el navegador antes de irnos
            localStorage.setItem('reset_email', email);

            // Redirige a la nueva pantalla después de 2 segundos
            setTimeout(() => {
                navigate('/reset-password');
            }, 2000);

        } catch (err) {
            console.error(err);
            // Capturamos el detalle que tira el backend (Ej: "Correo ya registrado" o "Usuario inexistente")
            const mensajeError = err.response?.data?.message || err.response?.data?.detail || "Error al enviar el código";

            // 🔥 SE ACABÓ EL TOAST DE ERROR: 
            // Inyectamos el rechazo de la base de datos directo como error estático en el casillero
            setErrorEmail(mensajeError);
        }
    };

    return (
        <div className="forgot-container">
            {/* Montamos el contenedor de Toasters para la alerta verde de éxito */}
            <Toaster />

            <div className="forgot-card">

                {/* BOTÓN VOLVER INTEGRADO */}
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="forgot-back-button"
                >
                    ← Volver
                </button>

                <h2 className="forgot-title">Recuperar contraseña</h2>

                {/* noValidate apaga los globos nativos del navegador */}
                <form className="forgot-form" onSubmit={handleForgotPassword} noValidate>

                    {/* Contenedor estructural del Input + Error */}
                    <div className="forgot-input-group">
                        <label className="forgot-label">Correo Electrónico</label>
                        <input
                            type="email"
                            className={`forgot-input ${errorEmail ? 'invalid-border' : ''}`}
                            placeholder="usuario@email.com"
                            value={email}
                            onChange={(e) => handleEmailChange(e.target.value)}
                        />
                        {/* Renderizado condicional del mensaje de error inferior */}
                        {errorEmail && (
                            <p className="forgot-error-message">{errorEmail}</p>
                        )}
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
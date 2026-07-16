import React, { useState } from 'react';
import api from '../api/api.js';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import '../assets/css/ResetPassword.css';

const ResetPassword = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        code: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [errors, setErrors] = useState({
        code: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const passwordRegex =
        /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{6,16}$/;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });

        setErrors({
            ...errors,
            [name]: ''
        });
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        const emailGuardado = localStorage.getItem('reset_email');

        // 1. LIMPIEZA INICIAL: Reseteamos los errores visuales locales en cada intento
        let localErrors = { code: '', newPassword: '', confirmPassword: '' };
        let hasFailed = false;

        // VALIDACIÓN CLIENTE: Verificar longitud exacta del código (6 dígitos)
        if (!formData.code.trim()) {
            localErrors.code = 'El código de verificación es obligatorio.';
            hasFailed = true;
        } else if (formData.code.trim().length !== 6) {
            localErrors.code = 'El código debe tener exactamente 6 dígitos.';
            hasFailed = true;
        }

        if (!formData.newPassword.trim()) {
            localErrors.newPassword = 'La nueva contraseña es obligatoria.';
            hasFailed = true;
        }
        if (!formData.confirmPassword.trim()) {
            localErrors.confirmPassword = 'Debés confirmar la contraseña.';
            hasFailed = true;
        }

        // VALIDACIÓN CLIENTE: Regla de negocio compleja de la contraseña
        if (formData.newPassword.trim() && !passwordRegex.test(formData.newPassword)) {
            localErrors.newPassword = 'Debe tener entre 6 y 16 caracteres, incluir al menos una mayúscula y un carácter especial.';
            hasFailed = true;
        }

        // VALIDACIÓN CLIENTE: Coincidencia mutua
        if (formData.newPassword.trim() && formData.confirmPassword.trim() && formData.newPassword !== formData.confirmPassword) {
            localErrors.confirmPassword = 'Las contraseñas no coinciden.';
            hasFailed = true;
        }

        if (hasFailed) {
            setErrors(localErrors);
            return;
        }

        if (!emailGuardado) {
            toast.error('El código expiró. Por favor, solicita un nuevo código.');
            return;
        }

        try {
            // Pisamos la pantalla con un estado limpio antes de impactar a la API
            setErrors({ code: '', newPassword: '', confirmPassword: '' });

            const res = await api.post('/auth/reset-password', {
                email: emailGuardado,
                code: formData.code,
                password: formData.newPassword,
                confirmar_password: formData.confirmPassword
            });

            if (res.data.success === false) {
                setErrors({
                    code: res.data.message || 'Código de verificación incorrecto.',
                    newPassword: '',
                    confirmPassword: ''
                });
                return;
            }

            toast.success(res.data.message || '¡Contraseña actualizada correctamente!');
            localStorage.removeItem('reset_email');

            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            console.error('Error capturado en ResetPassword:', err);

            const detalleBackend = err.response?.data?.detail;
            const mensajeBackend = err.response?.data?.message;

            // CASO A: Errores estructurales de Pydantic (Vienen en formato Array)
            if (detalleBackend && Array.isArray(detalleBackend)) {
                let apiErrors = { code: '', newPassword: '', confirmPassword: '' };

                detalleBackend.forEach((error) => {
                    const campoAfectado = error.loc[error.loc.length - 1];

                    if (campoAfectado === 'code') {
                        apiErrors.code = 'El código debe tener exactamente 6 caracteres.';
                    } else if (campoAfectado === 'password' || campoAfectado === 'password_nueva') {
                        apiErrors.newPassword = 'La contraseña no cumple con los requisitos del servidor.';
                    }
                });

                setErrors(apiErrors);
            }
            // CASO B: Mensajes de texto normales enviados por el backend (Expiración / Invalidez)
            else {
                const mensajeError = detalleBackend || mensajeBackend || 'Error al cambiar la contraseña';
                const msgString = String(mensajeError).toLowerCase();

                // Si el mensaje del servidor hace referencia al código o token
                if (msgString.includes('código') || msgString.includes('code') || msgString.includes('token') || msgString.includes('inválido') || msgString.includes('expir')) {
                    setErrors({
                        code: mensajeError, // Se inyecta correctamente arriba abajo del código
                        newPassword: '',
                        confirmPassword: ''
                    });
                } else {
                    // Errores genéricos o de contraseña persistentes del backend
                    setErrors({
                        code: '',
                        newPassword: mensajeError,
                        confirmPassword: ''
                    });
                }
            }
        }
    };

    return (
        <div className="reset-container">

            <div className="reset-card">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="reset-back-button"
                >
                    ← Volver
                </button>

                <h1 className="reset-title">
                    Restablecer Contraseña
                </h1>

                <form onSubmit={handleResetPassword} className="reset-form" noValidate>

                    {/* CÓDIGO DE VERIFICACIÓN */}
                    <div className="reset-input-group">
                        <input
                            type="text"
                            name="code"
                            placeholder="Código de 6 dígitos"
                            maxLength="6"
                            value={formData.code}
                            onChange={handleChange}
                            className={`reset-input ${errors.code ? 'invalid-border' : ''}`}
                        />
                        {errors.code && (
                            <p className="reset-error-message">{errors.code}</p>
                        )}
                    </div>

                    {/* NUEVA CONTRASEÑA */}
                    <div className="reset-input-group">
                        <div className="reset-input-wrapper">
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                name="newPassword"
                                placeholder="Nueva Contraseña"
                                value={formData.newPassword}
                                onChange={handleChange}
                                className={`reset-input ${errors.newPassword ? 'invalid-border' : ''}`}
                            />
                            <button
                                type="button"
                                className="reset-eye-btn"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                                {showNewPassword ? <FiEyeOff size={22} /> : <FiEye size={22} />}
                            </button>
                        </div>
                        {errors.newPassword && (
                            <p className="reset-error-message">{errors.newPassword}</p>
                        )}
                    </div>

                    {/* CONFIRMAR NUEVA CONTRASEÑA */}
                    <div className="reset-input-group">
                        <div className="reset-input-wrapper">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                placeholder="Confirmar Nueva Contraseña"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className={`reset-input ${errors.confirmPassword ? 'invalid-border' : ''}`}
                            />
                            <button
                                type="button"
                                className="reset-eye-btn"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <FiEyeOff size={22} /> : <FiEye size={22} />}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="reset-error-message">{errors.confirmPassword}</p>
                        )}
                    </div>

                    <button type="submit" className="reset-button">
                        Actualizar Contraseña
                    </button>

                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
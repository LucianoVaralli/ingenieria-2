import React, { useState } from 'react';
import api from '../api/api.js';
import { toast, Toaster } from 'react-hot-toast'; // Importamos Toaster para manejar el éxito flotante
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

    // Nuevo estado para controlar los errores fijos individuales
    const [errors, setErrors] = useState({
        code: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Expresión regular oficial (6-16 caracteres, mayúscula y carácter especial)
    const passwordRegex =
        /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{6,16}$/;

    // Al escribir, actualizamos los datos y limpiamos el error específico inmediatamente
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });

        // Limpieza inteligente en tiempo real
        setErrors({
            ...errors,
            [name]: ''
        });
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        const emailGuardado = localStorage.getItem('reset_email');

        // Estructura temporal para evaluar todos los errores al mismo tiempo
        let localErrors = { code: '', newPassword: '', confirmPassword: '' };
        let hasFailed = false;

        // 1. VALIDACIÓN: Campos vacíos independientes
        if (!formData.code.trim()) {
            localErrors.code = 'El código de verificación es obligatorio.';
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

        // 2. VALIDACIÓN: Regla de negocio compleja (solo si no está vacío)
        if (formData.newPassword.trim() && !passwordRegex.test(formData.newPassword)) {
            localErrors.newPassword = 'Debe tener entre 6 y 16 caracteres, incluir al menos una mayúscula y un carácter especial.';
            hasFailed = true;
        }

        // 3. VALIDACIÓN: Coincidencia mutua (solo si se escribieron ambas)
        if (formData.newPassword.trim() && formData.confirmPassword.trim() && formData.newPassword !== formData.confirmPassword) {
            localErrors.confirmPassword = 'Las contraseñas no coinciden.';
            hasFailed = true;
        }

        // Si falló alguna validación, renderizamos los errores en pantalla y frenamos
        if (hasFailed) {
            setErrors(localErrors);
            return;
        }

        // 4. VALIDACIÓN DE CONTEXTO: Sesión activa de recuperación (Esta sí queda flotante por ser ajena al formulario)
        if (!emailGuardado) {
            toast.error('Expiró la sesión de recuperación. Por favor, solicita un nuevo código.');
            return;
        }

        try {
            const res = await api.post('/auth/reset-password', {
                email: emailGuardado,
                code: formData.code,
                password: formData.newPassword,
                confirmar_password: formData.confirmPassword
            });

            if (res.data.success === false) {
                // Si la API devuelve un error de lógica de negocio (ej: "Código inválido") lo mapeamos al input del código
                setErrors({
                    ...errors,
                    code: res.data.message || 'Código de verificación incorrecto.'
                });
                return;
            }

            // Único caso de notificación flotante permitida para el Éxito 🎉
            toast.success(res.data.message || '¡Contraseña actualizada correctamente!');
            localStorage.removeItem('reset_email');

            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            console.error('Error capturado en ResetPassword:', err);
            const mensajeError =
                err.response?.data?.detail ||
                err.response?.data?.message ||
                'Error al cambiar la contraseña';

            // Errores de API controlados van a la interfaz fija para evitar alertas flotantes de error
            if (Array.isArray(mensajeError)) {
                setErrors({ ...errors, newPassword: mensajeError[0].msg });
            } else {
                // Si el backend avisa algo genérico sobre la contraseña o código, lo inyectamos abajo
                setErrors({ ...errors, code: mensajeError });
            }
        }
    };

    return (
        <div className="reset-container">
            {/* Contenedor de Toasts (solo se ejecutará ante el éxito) */}
            <Toaster />

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

                {/* Quitamos los required nativos de HTML para que nuestra lógica controle el comportamiento al pulsar el botón */}
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

                    {/* BOTÓN DE ACCIÓN */}
                    <button type="submit" className="reset-button">
                        Actualizar Contraseña
                    </button>

                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
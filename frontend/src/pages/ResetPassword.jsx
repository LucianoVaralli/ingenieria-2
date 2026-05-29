import React, { useState } from 'react';
import api from '../api/api.js';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import '../assets/css/ResetPassword.css';

const ResetPassword = () => {

    // 🌟 Eliminamos 'email' del estado inicial ya que no se digita en esta pantalla
    const [formData, setFormData] = useState({
        code: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [passwordError, setPasswordError] = useState('');
    const [matchError, setMatchError] = useState('');

    const navigate = useNavigate();

    const passwordRegex =
        /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{6,16}$/;

    const handleChange = (e) => {
        const { name, value } = e.target;

        const updatedFormData = {
            ...formData,
            [name]: value
        };

        setFormData(updatedFormData);

        // Validación contraseña
        if (name === 'newPassword') {
            if (value.length > 0 && !passwordRegex.test(value)) {
                setPasswordError(
                    'Debe tener 6-16 caracteres, una mayúscula y un caracter especial.'
                );
            } else {
                setPasswordError('');
            }
        }

        // Validación confirmación
        if (name === 'newPassword' || name === 'confirmPassword') {
            if (
                updatedFormData.confirmPassword.length > 0 &&
                updatedFormData.newPassword !== updatedFormData.confirmPassword
            ) {
                setMatchError('Las contraseñas no coinciden.');
            } else {
                setMatchError('');
            }
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        // 🌟 Recuperamos el email que guardamos en la pantalla anterior
        const emailGuardado = localStorage.getItem('reset_email');

        // Validaciones frontend
        if (passwordError || matchError) {
            toast.error('Por favor, corrige los errores antes de continuar.');
            return;
        }

        // 🌟 Validación ajustada: controlamos que exista el email guardado en vez del input
        if (
            !emailGuardado ||
            !formData.code ||
            !formData.newPassword ||
            !formData.confirmPassword
        ) {
            toast.error('Faltan datos obligatorios o expiró la sesión de recuperación.');
            return;
        }

        try {
            // 🌟 Enviamos 'emailGuardado' recuperado del localStorage directo al backend
            const res = await api.post('/auth/reset-password', {
                email: emailGuardado,
                code: formData.code,
                password: formData.newPassword,
                confirmar_password: formData.confirmPassword
            });

            // Validación manual por si el backend responde con status 200 pero success: false
            if (res.data.success === false) {
                toast.error(
                    res.data.message || 'Error al cambiar la contraseña'
                );
                return;
            }

            toast.success(
                res.data.message || '¡Contraseña actualizada correctamente!'
            );

            // 🌟 Limpiamos el localStorage para no dejar basura en el navegador
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

            toast.error(mensajeError);
        }
    };

    return (
        <div className="reset-container">
            <div className="reset-card">
                <h1 className="reset-title">
                    Restablecer Contraseña
                </h1>

                <form onSubmit={handleResetPassword} className="reset-form">

                    {/* 🌟 El input de EMAIL fue removido por completo de acá */}

                    {/* CÓDIGO */}
                    <input
                        type="text"
                        name="code"
                        placeholder="Código de 6 dígitos"
                        maxLength="6"
                        value={formData.code}
                        onChange={handleChange}
                        required
                        className="reset-input"
                    />

                    {/* NUEVA PASSWORD */}
                    <div>
                        <div className="reset-input-wrapper">
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                name="newPassword"
                                placeholder="Nueva Contraseña"
                                value={formData.newPassword}
                                onChange={handleChange}
                                required
                                className="reset-input"
                            />

                            <button
                                type="button"
                                className="reset-eye-btn"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                                {showNewPassword ? <FiEyeOff size={22} /> : <FiEye size={22} />}
                            </button>
                        </div>

                        {passwordError && (
                            <div className="reset-error">
                                {passwordError}
                            </div>
                        )}
                    </div>

                    {/* CONFIRMAR PASSWORD */}
                    <div>
                        <div className="reset-input-wrapper">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                placeholder="Confirmar Nueva Contraseña"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                className="reset-input"
                            />

                            <button
                                type="button"
                                className="reset-eye-btn"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <FiEyeOff size={22} /> : <FiEye size={22} />}
                            </button>
                        </div>

                        {matchError && (
                            <div className="reset-error">
                                {matchError}
                            </div>
                        )}
                    </div>

                    {/* BOTÓN */}
                    <button type="submit" className="reset-button">
                        Actualizar Contraseña
                    </button>

                </form>
            </div>
        </div>
    );
};

export default ResetPassword;
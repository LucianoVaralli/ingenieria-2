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

    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Expresión regular oficial (6-16 caracteres, mayúscula y carácter especial)
    const passwordRegex =
        /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{6,16}$/;

    // Manejo de inputs limpio y directo
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        const emailGuardado = localStorage.getItem('reset_email');

        // 1. VALIDACIÓN: Campos vacíos
        if (!formData.code.trim() || !formData.newPassword.trim() || !formData.confirmPassword.trim()) {
            toast.error('Todos los campos son obligatorios. Por favor, completalos.');
            return;
        }

        // 2. VALIDACIÓN: Regla de negocio compleja (6-16, Mayúscula, Especial)
        if (!passwordRegex.test(formData.newPassword)) {
            toast.error('La nueva contraseña debe tener entre 6 y 16 caracteres, incluir al menos una mayúscula y un carácter especial.');
            return;
        }

        // 3. VALIDACIÓN: Coincidencia mutua
        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('Las contraseñas no coinciden.');
            return;
        }

        // 4. VALIDACIÓN: Sesión activa de recuperación
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
                toast.error(res.data.message || 'Error al cambiar la contraseña');
                return;
            }

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

            if (Array.isArray(mensajeError)) {
                toast.error(mensajeError[0].msg);
            } else {
                toast.error(mensajeError);
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

                <form onSubmit={handleResetPassword} className="reset-form">

                    {/* CÓDIGO DE VERIFICACIÓN */}
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

                    {/* NUEVA CONTRASEÑA */}
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

                    {/* CONFIRMAR NUEVA CONTRASEÑA */}
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
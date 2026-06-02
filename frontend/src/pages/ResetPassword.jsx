import React, { useState } from 'react';
import api from '../api/api.js';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import '../assets/css/ResetPassword.css';

const ResetPassword = () => {

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

        // Validación en tiempo real (Opcional visual)
        if (name === 'newPassword') {
            if (value.length > 0 && !passwordRegex.test(value)) {
                setPasswordError(
                    'Debe tener 6-16 caracteres, una mayúscula y un caracter especial.'
                );
            } else {
                setPasswordError('');
            }
        }

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

        const emailGuardado = localStorage.getItem('reset_email');

        // 1. VALIDACIÓN: Verificar campos vacíos (quitando espacios en blanco)
        if (!formData.code.trim() || !formData.newPassword.trim() || !formData.confirmPassword.trim()) {
            toast.error('Todos los campos son obligatorios. Por favor, completalos.');
            return;
        }

        // 2. VALIDACIÓN: Que las contraseñas coincidan al presionar el botón
        if (formData.newPassword !== formData.confirmPassword) {
            toast.error('La confirmación de la nueva contraseña no coincide.');
            return;
        }

        // 3. VALIDACIÓN: Regla de negocio compleja al presionar el botón
        if (!passwordRegex.test(formData.newPassword)) {
            toast.error('La nueva contraseña debe tener entre 6 y 16 caracteres, incluir al menos una mayúscula y un carácter especial.');
            return;
        }

        // 4. VALIDACIÓN: Control de sesión activa de recuperación
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
                toast.error(
                    res.data.message || 'Error al cambiar la contraseña'
                );
                return;
            }

            toast.success(
                res.data.message || '¡Contraseña actualizada correctamente!'
            );

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

            // Si el backend te devuelve un array de validaciones de Pydantic:
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
                            <div className="reset-error" style={{ color: '#ff4d4d', textAlign: 'left', fontSize: '14px', marginTop: '5px', fontFamily: 'Lora' }}>
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
                            <div className="reset-error" style={{ color: '#ff4d4d', textAlign: 'left', fontSize: '14px', marginTop: '5px', fontFamily: 'Lora' }}>
                                {matchError}
                            </div>
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
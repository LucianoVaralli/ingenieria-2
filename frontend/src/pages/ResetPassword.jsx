import React, { useState } from 'react';
import api from '../api/api.js';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const ResetPassword = () => {
    const [formData, setFormData] = useState({
        email: '',
        code: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();

    const [passwordError, setPasswordError] = useState('');
    const [matchError, setMatchError] = useState('');

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{6,16}$/;

    const handleChange = (e) => {
        const { name, value } = e.target;
        const updatedFormData = { ...formData, [name]: value };

        setFormData(updatedFormData);

        if (name === 'newPassword') {
            if (value.length > 0 && !passwordRegex.test(value)) {
                setPasswordError('Debe tener 6-16 caracteres, una mayúscula y un especial.');
            } else {
                setPasswordError('');
            }
        }

        if (name === 'newPassword' || name === 'confirmPassword') {
            if (updatedFormData.confirmPassword.length > 0 && updatedFormData.newPassword !== updatedFormData.confirmPassword) {
                setMatchError('Las contraseñas no coinciden.');
            } else {
                setMatchError('');
            }
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (passwordError || matchError) {
            return;
        }

        try {
            const res = await api.post('/auth/reset-password', {
                email: formData.email,
                code: formData.code,
                password: formData.newPassword,
                confirmar_password: formData.confirmPassword
            });

            toast.success(res.data.message || '¡Contraseña actualizada con éxito!', {
                style: { borderRadius: '8px', background: '#222', color: '#fff' },
            });

            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            // Frenamos cualquier propagación de error adicional
            console.error("Error capturado en ResetPassword:", err);

            // Buscamos el mensaje detallado de FastAPI (anteponiendo .detail)
            const mensajeError = err.response?.data?.detail || err.response?.data?.message || "Error al cambiar la contraseña";

            toast.error(mensajeError, {
                style: { borderRadius: '8px', background: '#222', color: '#fff' },
            });

            // Retornamos de forma explícita para congelar la ejecución aquí
            return;
        }
    };

    const inputStyle = (hasError) => ({
        width: '100%',
        padding: '12px 40px 12px 15px',
        boxSizing: 'border-box',
        backgroundColor: '#0a0a0a',
        color: '#fff',
        border: hasError ? '1px solid #ff3333' : '1px solid #333',
        borderRadius: '10px',
        outline: 'none',
        fontSize: '16px'
    });

    const errorTextStyle = {
        color: '#ff3333',
        fontSize: '14px',
        textAlign: 'center',
        marginTop: '5px',
        fontStyle: 'italic'
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto', color: '#fff' }}>
            <h1>Restablecer Contraseña</h1>
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input
                    type="email"
                    name="email"
                    placeholder="Confirmar tu Email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid #333', backgroundColor: '#0a0a0a', color: '#fff' }}
                />
                <input
                    type="text"
                    name="code"
                    placeholder="Código de 6 dígitos"
                    maxLength="6"
                    value={formData.code}
                    onChange={handleChange}
                    required
                    style={{ padding: '12px', borderRadius: '10px', border: '1px solid #333', backgroundColor: '#0a0a0a', color: '#fff' }}
                />

                {/* Contenedor Nueva Contraseña */}
                <div>
                    <div style={{ position: 'relative', width: '100%' }}>
                        <input
                            type={showNewPassword ? "text" : "password"}
                            name="newPassword"
                            placeholder="Nueva Contraseña"
                            value={formData.newPassword}
                            onChange={handleChange}
                            required
                            style={inputStyle(!!passwordError)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            style={{
                                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: '#666'
                            }}
                        >
                            {showNewPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                        </button>
                    </div>
                    {passwordError && <div style={errorTextStyle}>{passwordError}</div>}
                </div>

                {/* Contenedor Confirmar Contraseña */}
                <div>
                    <div style={{ position: 'relative', width: '100%' }}>
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            placeholder="Confirmar Nueva Contraseña"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            style={inputStyle(!!matchError)}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            style={{
                                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: '#666'
                            }}
                        >
                            {showConfirmPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                        </button>
                    </div>
                    {matchError && <div style={errorTextStyle}>{matchError}</div>}
                </div>

                <button type="submit" style={{ padding: '12px', borderRadius: '10px', cursor: 'pointer', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', border: 'none' }}>
                    Actualizar Contraseña
                </button>
            </form>
        </div>
    );
};

export default ResetPassword;
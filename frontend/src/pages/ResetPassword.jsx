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

    // 🌟 Separamos la visibilidad de cada contraseña en estados independientes
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();

        // Validación rápida en el front antes de gastar ancho de banda
        if (formData.newPassword !== formData.confirmPassword) {
            return toast.error("Las contraseñas no coinciden", {
                style: { borderRadius: '8px', background: '#222', color: '#fff' },
            });
        }

        try {
            // Enviamos exactamente los 4 campos que pide tu BaseModel de Pydantic
            const res = await api.post('/auth/reset-password', {
                email: formData.email,
                code: formData.code,
                password: formData.newPassword,
                confirmar_password: formData.confirmPassword
            });

            toast.success(res.data.message || '¡Contraseña actualizada con éxito!', {
                style: { borderRadius: '8px', background: '#222', color: '#fff' },
            });

            setTimeout(() => { navigate('/login'); }, 2000);

        } catch (err) {
            console.error(err);
            const mensajeError = err.response?.data?.message || "Error al cambiar la contraseña";
            toast.error(mensajeError, {
                style: { borderRadius: '8px', background: '#222', color: '#fff' },
            });
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
            <h1>Restablecer Contraseña</h1>
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <input
                    type="email"
                    name="email"
                    placeholder="Confirmar tu Email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                />
                <input
                    type="text"
                    name="code"
                    placeholder="Código de 6 dígitos"
                    maxLength="6"
                    value={formData.code}
                    onChange={handleChange}
                    required
                />

                {/* Input Nueva Contraseña */}
                <div style={{ position: 'relative', width: '100%' }}>
                    <input
                        type={showNewPassword ? "text" : "password"} // 🌟 Estado independiente 1
                        name="newPassword"
                        placeholder="Nueva Contraseña"
                        value={formData.newPassword}
                        onChange={handleChange}
                        required
                        style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
                    />
                    <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)} // 🌟 Alterna solo la primera
                        style={{
                            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: '#666'
                        }}
                    >
                        {showNewPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                    </button>
                </div>

                {/* Input Confirmar Contraseña */}
                <div style={{ position: 'relative', width: '100%' }}>
                    <input
                        type={showConfirmPassword ? "text" : "password"} // 🌟 Estado independiente 2
                        name="confirmPassword"
                        placeholder="Confirmar Nueva Contraseña"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                        style={{ width: '100%', paddingRight: '40px', boxSizing: 'border-box' }}
                    />
                    <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)} // 🌟 Alterna solo la segunda
                        style={{
                            position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: '#666'
                        }}
                    >
                        {showConfirmPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                    </button>
                </div>

                <button type="submit">
                    Actualizar Contraseña
                </button>
            </form>
        </div>
    );
};

export default ResetPassword;
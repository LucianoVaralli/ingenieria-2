import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api.js';
import '../assets/css/Registro.css';
import { Eye, EyeOff } from 'lucide-react';

const Registro = () => {
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        apellido: '',
        dni: '',
        email: '',
        telefono: '',
        password: '',
        confirmar_password: ''
    });
    const [file, setFile] = useState(null);
    const navigate = useNavigate();
    const [successMessage, setSuccessMessage] = useState(''); // Mensaje de éxito integrado en el HTML

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        
        if (selectedFile) {
            const extension = selectedFile.name.split('.').pop().toLowerCase();
            
            if (extension !== 'pdf') {
                setErrors(prev => ({ 
                    ...prev, 
                    apto_fisico: "Por favor, seleccioná solo archivos PDF." 
                }));
                e.target.value = ''; 
                setFile(null);
            } else {
                setErrors(prev => ({ 
                    ...prev, 
                    apto_fisico: null 
                }));
                setFile(selectedFile);
            }
        }
    };

    const validate = () => {
        let tempErrors = {};

        const dniRegex = /^\d{7,8}$/;
        if (!dniRegex.test(formData.dni)) {
            tempErrors.dni = "El DNI debe tener entre 7 y 8 números.";
        }

        if (!/^\d{10}$/.test(formData.telefono)) {
            tempErrors.telefono = "El teléfono debe tener 10 dígitos (ej: 2211234567).";
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(formData.email)) {
            tempErrors.email = "Ingresá un correo válido con extensión (ej: .com o .ar).";
        }

        const passRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{6,16})/;
        if (!passRegex.test(formData.password)) {
            tempErrors.password = "Debe tener 6-16 caracteres, una mayúscula y un especial.";
        }

        if (formData.password !== formData.confirmar_password) {
            tempErrors.confirmar_password = "Las contraseñas no coinciden.";
        }

        if (!file) {
            tempErrors.apto_fisico = "Debés subir un apto físico en PDF.";
        }    

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleRegistro = async (e) => {
        e.preventDefault();
        setErrors({});
        setSuccessMessage('');

        if (!validate()) return; 

        const data = new FormData();
        data.append('nombre', formData.nombre);
        data.append('apellido', formData.apellido);
        data.append('dni', formData.dni);
        data.append('email', formData.email);
        data.append('telefono', formData.telefono);
        data.append('password', formData.password);
        data.append('confirmar_password', formData.confirmar_password);

        if (file) {
            data.append('apto_fisico', file);
        }

        try {
            await api.post('/socios/registrar', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSuccessMessage("¡Registro exitoso! Redirigiendo...");

            setTimeout(() => {
                navigate('/login');
            }, 1500);

        } catch (err) {
            const detail = err.response?.data?.detail;
            
            if (err.response && err.response.status === 400) {
                if (detail?.includes("DNI")) {
                    setErrors(prev => ({ ...prev, dni: detail }));
                } 
                else if (detail?.includes("correo")) {
                    setErrors(prev => ({ ...prev, email: detail }));
                } 
                else if (detail?.includes("contraseñas")) {
                    setErrors(prev => ({ ...prev, confirmar_password: detail }));
                } 
                else if (detail?.includes("PDF") || detail?.includes("archivo") || detail?.includes("adjuntar")) {
                    setErrors(prev => ({ ...prev, apto_fisico: detail }));
                } 
                else {
                    // Error general del backend pero controlado en el HTML
                    setErrors(prev => ({ ...prev, general: detail || "Error al registrar usuario" }));
                }
            } else {
                // Error inesperado controlado en el HTML
                setErrors(prev => ({ ...prev, general: "Ocurrió un error inesperado. Intentalo más tarde." }));
            }
        }
    };

    return (
        <div className="registro-container">
            {/* Panel izquierdo decorativo */}
            <div className="registro-left">
                <div className="registro-left-bg" />
                <div className="registro-left-grid" />
                <div className="registro-deco-circle" />
                <div className="registro-left-content">
                    <h2 className="registro-tagline">
                        UNITE A<br />LA <span>COMUNIDAD</span><br />SPORTIFY
                    </h2>
                    <p className="registro-sub">Creá tu cuenta y empezá hoy.</p>
                    <div className="registro-stats">
                        <div className="registro-stat">
                            <span className="registro-stat-num">+2K</span>
                            <span className="registro-stat-label">Miembros</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Panel derecho: formulario */}
            <div className="registro-box">
                <div className="registro-header">
                    <h2 className="registro-titulo">Crear tu cuenta</h2>
                    <p className="registro-subtitle">Completá los datos para registrarte</p>
                </div>
                
                <form onSubmit={handleRegistro} className="registro-form">
                    {/* nombre y apellido */}
                    <div className="registro-row">
                        <div className="registro-field">
                            <label className="registro-label">Nombre</label>
                            <input name="nombre" className="registro-input" placeholder="Ej: Luciano" onChange={handleChange} required />
                        </div>
                        <div className="registro-field">
                            <label className="registro-label">Apellido</label>
                            <input name="apellido" className="registro-input" placeholder="Ej: Pérez" onChange={handleChange} required />
                        </div>
                    </div>
                    
                    {/* dni y telefono */}
                    <div className="registro-row">
                        <div className="registro-field">
                            <label className="registro-label">DNI</label>
                            <input
                                name="dni"
                                type="text"
                                inputMode="numeric"
                                className={`registro-input ${errors.dni ? 'error' : ''}`}
                                placeholder="Ej: 12345678"
                                onChange={handleChange}
                                maxLength="8"
                                required
                            />
                            {errors.dni && <span className="error-message">{errors.dni}</span>}
                        </div>
                        <div className="registro-field">
                            <label className="registro-label">Teléfono (Argentina)</label>
                            <input
                                name="telefono"
                                className={`registro-input ${errors.telefono ? 'error' : ''}`}
                                placeholder="Ej: 2215556677"
                                onChange={handleChange}
                                required
                            />
                            {errors.telefono && <span className="error-message">{errors.telefono}</span>}
                        </div>
                    </div>
                    
                    {/* email */}
                    <div className="registro-field">
                        <label className="registro-label">Correo Electrónico</label>
                        <input
                            name="email"
                            type="email"
                            className={`registro-input ${errors.email ? 'error' : ''}`}
                            placeholder="usuario@email.com"
                            onChange={handleChange}
                            required
                        />
                        {errors.email && <span className="error-message">{errors.email}</span>}
                    </div>
                    
                    {/* contraseña */}
                    <div className="registro-row">
                        <div className="registro-field">
                            <label className="registro-label">Contraseña</label>
                            <div className="password-wrapper">
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    className={`registro-input ${errors.password ? 'error' : ''}`}
                                    placeholder="Mín. 6 car., 1 mayúscula y 1 especial"
                                    onChange={handleChange}
                                    required
                                />
                                <button 
                                    type="button" 
                                    className="toggle-password" 
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                                </button>
                            </div>
                            {errors.password && <span className="error-message">{errors.password}</span>}
                        </div>
                        
                        <div className="registro-field">
                            <label className="registro-label">Confirmar Contraseña</label>
                            <div className="password-wrapper">
                                <input
                                    name="confirmar_password"
                                    type={showConfirmPassword ? "text" : "password"}
                                    className={`registro-input ${errors.confirmar_password ? 'error' : ''}`}
                                    placeholder="Repetí tu contraseña"
                                    onChange={handleChange}
                                    required
                                />
                                <button 
                                    type="button" 
                                    className="toggle-password" 
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                                </button>
                            </div>
                            {errors.confirmar_password && <span className="error-message">{errors.confirmar_password}</span>}
                        </div>
                    </div>
                    
                    {/* apto fisico */}
                    <div className="registro-field">
                        <label className={`registro-file-label ${file ? 'registro-file-label--ok' : ''}`}>
                            <span className="registro-file-icon">{file ? '✓' : '📎'}</span>
                            <span className="registro-file-text">
                                {file ? file.name : 'Seleccionar archivo PDF'}
                            </span>
                            <input 
                                type="file" 
                                accept=".pdf" 
                                className="registro-file-input" 
                                onChange={handleFileChange}
                            />
                        </label>
                        {errors.apto_fisico && <span className="error-message">{errors.apto_fisico}</span>}
                    </div>

                    {/* SECCIÓN DE ERRORES GENERALES O ÉXITO (Reemplaza a los Toasts flotantes) */}
                    {errors.general && <div className="error-message-general" style={{ color: 'red', marginBottom: '15px', fontWeight: 'bold', textAlign: 'center' }}>{errors.general}</div>}
                    {successMessage && <div className="success-message-inline" style={{ color: 'green', marginBottom: '15px', fontWeight: 'bold', textAlign: 'center' }}>{successMessage}</div>}

                    <button type="submit" className="boton-registrar">
                        REGISTRARME
                    </button>
                </form>

                <p className="login-link-container">
                    ¿Ya tenés cuenta? <Link to="/login" className="login-link">Iniciá sesión acá</Link>
                </p>
            </div>
        </div>
    );
};

export default Registro;
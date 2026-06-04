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
    const [successMessage, setSuccessMessage] = useState('');

    const password = formData.password;
    const reqs = {
        longitud: password.length >= 6 && password.length <= 16,
        mayuscula: /[A-Z]/.test(password),
        especial: /[!@#$%^&*]/.test(password)
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // Opcional: limpiar el error del campo cuando el usuario empieza a escribir de nuevo
        if (errors[e.target.name]) {
            setErrors(prev => ({ ...prev, [e.target.name]: null }));
        }
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

        // Validar campos obligatorios vacíos primero
        if (!formData.nombre.trim()) tempErrors.nombre = "El nombre es obligatorio.";
        if (!formData.apellido.trim()) tempErrors.apellido = "El apellido es obligatorio.";

        // Validación de DNI
        const dniRegex = /^\d{7,8}$/;
        if (!formData.dni.trim()) {
            tempErrors.dni = "El DNI es obligatorio.";
        } else if (!dniRegex.test(formData.dni)) {
            tempErrors.dni = "El DNI debe tener entre 7 y 8 números.";
        }

        // Validación de Teléfono
        if (!formData.telefono.trim()) {
            tempErrors.telefono = "El teléfono es obligatorio.";
        } else if (!/^\d{10}$/.test(formData.telefono)) {
            tempErrors.telefono = "El teléfono debe tener 10 dígitos (ej: 2211234567).";
        }

        // Validación de Email
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!formData.email.trim()) {
            tempErrors.email = "El correo electrónico es obligatorio.";
        } else if (!emailRegex.test(formData.email)) {
            tempErrors.email = "Ingresá un correo válido con extensión (ej: .com o .ar).";
        }

        // Validación de Contraseña
        if (!formData.password) {
            tempErrors.password = "La contraseña es obligatoria.";
        } else if (!reqs.longitud || !reqs.mayuscula || !reqs.especial) {
            tempErrors.password = "Debés cumplir con todos los requisitos de seguridad.";
        }

        // Confirmar Contraseña
        if (!formData.confirmar_password) {
            tempErrors.confirmar_password = "Debés confirmar la contraseña.";
        } else if (formData.password !== formData.confirmar_password) {
            tempErrors.confirmar_password = "Las contraseñas no coinciden.";
        }

        // Archivo
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

        // if (!validate()) return; // Valida el frente primero (si hay errores locales, frena acá)

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

            if (err.response && [400, 409, 422].includes(err.response.status)) {

                // NUEVO: Si 'detail' es un objeto, cargamos todos los errores de una sola vez
                if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
                    setErrors(prev => ({
                        ...prev,
                        ...detail // Esto es magia pura: mapea automáticamente 'dni' y 'email' a sus inputs
                    }));
                } 
                // Por las dudas, dejamos el soporte si el backend llega a mandar un string suelto
                else if (detail && typeof detail === 'string') {
                    if (detail.includes("DNI")) {
                        setErrors(prev => ({ ...prev, dni: detail }));
                    } 
                    else if (detail.includes("correo") || detail.includes("email")) {
                        setErrors(prev => ({ ...prev, email: detail }));
                    } 
                    else if (detail.includes("contraseñas")) {
                        setErrors(prev => ({ ...prev, confirmar_password: detail }));
                    } 
                    else if (detail.includes("PDF") || detail.includes("archivo") || detail.includes("adjuntar")) {
                        setErrors(prev => ({ ...prev, apto_fisico: detail }));
                    } 
                    else {
                        setErrors(prev => ({ ...prev, general: detail }));
                    }
                } else {
                    setErrors(prev => ({ ...prev, general: "Error al registrar usuario." }));
                }
            } else {
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
                
                {/* AGREGADO: noValidate para evitar los carteles uno por uno del navegador */}
                <form onSubmit={handleRegistro} className="registro-form" noValidate>
                    
                    {/* nombre y apellido */}
                    <div className="registro-row">
                        <div className="registro-field">
                            <label className="registro-label">Nombre</label>
                            <input 
                                name="nombre" 
                                className={`registro-input ${errors.nombre ? 'error' : ''}`} 
                                placeholder="Ej: Luciano" 
                                onChange={handleChange} 
                            />
                            {errors.nombre && <span className="error-message">{errors.nombre}</span>}
                        </div>
                        <div className="registro-field">
                            <label className="registro-label">Apellido</label>
                            <input 
                                name="apellido" 
                                className={`registro-input ${errors.apellido ? 'error' : ''}`} 
                                placeholder="Ej: Pérez" 
                                onChange={handleChange} 
                            />
                            {errors.apellido && <span className="error-message">{errors.apellido}</span>}
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
                        />
                        {errors.email && <span className="error-message">{errors.email}</span>}
                    </div>
                    
                    {/* contraseña */}
                    <div className="registro-field">
                        <label className="registro-label">Contraseña</label>
                        <div className="password-wrapper">
                            <input
                                name="password"
                                type={showPassword ? "text" : "password"}
                                className={`registro-input ${errors.password ? 'error' : ''}`}
                                placeholder="Ingresá tu contraseña"
                                onChange={handleChange}
                            />
                            <button 
                                type="button" 
                                className="toggle-password" 
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                            </button>
                        </div>
                        
                        {/* LISTA DINÁMICA DE REQUISITOS (Aparece solo si hay texto escrito) */}
                        {formData.password && (
                            <div className="password-requirements-list" style={{ marginTop: '8px', fontSize: '13px' }}>
                                <div style={{ color: reqs.longitud ? '#2e7d32' : '#d32f2f', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                                    <span>{reqs.longitud ? '✓' : '○'}</span> De 6 a 16 caracteres.
                                </div>
                                <div style={{ color: reqs.mayuscula ? '#2e7d32' : '#d32f2f', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                                    <span>{reqs.mayuscula ? '✓' : '○'}</span> Al menos una letra mayúscula.
                                </div>
                                <div style={{ color: reqs.especial ? '#2e7d32' : '#d32f2f', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <span>{reqs.especial ? '✓' : '○'}</span> Un carácter especial (!@#$%^&*).
                                </div>
                            </div>
                        )}
                        
                        {errors.password && <span className="error-message">{errors.password}</span>}
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

                    {/* SECCIÓN DE ERRORES GENERALES O ÉXITO */}
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

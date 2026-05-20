import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/api.js';
import '../assets/css/Registro.css';

const Registro = () => {

const [errors, setErrors] = useState({});

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

const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
};

const handleFileChange = (e) => {
    setFile(e.target.files[0]);
};

const validate = () => {
    let tempErrors = {};

    //DNI lógico (entre 7 y 8 dígitos)
    const dniRegex = /^\d{7,8}$/;
    if (!dniRegex.test(formData.dni)) {
        tempErrors.dni = "El DNI debe tener entre 7 y 8 números.";
    }

    // Regla: Teléfono de Argentina (10 dígitos)
    if (!/^\d{10}$/.test(formData.telefono)) {
    tempErrors.telefono = "El teléfono debe tener 10 dígitos (ej: 2211234567).";
    }

    // Validación de Email con extensión obligatoria (.com, .ar, etc.)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(formData.email)) {
        tempErrors.email = "Ingresá un correo válido con extensión (ej: .com o .ar).";
    }

    // Regla: Contraseña (6-16 caracteres, mayúscula, carácter especial)
    const passRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])(?=.{6,16})/;
    if (!passRegex.test(formData.password)) {
    tempErrors.password = "Debe tener 6-16 caracteres, una mayúscula y un especial.";
    }

    // Regla: Coincidencia
    if (formData.password !== formData.confirmar_password) {
    tempErrors.confirmar_password = "Las contraseñas no coinciden.";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0; // Retorna true si no hay errores
};

const handleRegistro = async (e) => {
e.preventDefault();

    // 1. Limpiamos errores previos antes de empezar
setErrors({});

  // 2. Ejecutamos las validaciones 
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
    data.append('apto_fisico', file); // Coincide con tu backend
}

try {
    await api.post('/socios/registrar', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    alert("¡Registro exitoso!");
    navigate('/login'); 
} catch (err) {
    // Si el backend devuelve 400 (DNI o Email ya registrados)
    if (err.response && err.response.status === 400) {
        const detail = err.response.data.detail;
    
        // Mapeamos el error al campo que corresponde
    if (detail.includes("DNI")) {
        setErrors(prev => ({ ...prev, dni: detail }));
    } else if (detail.includes("correo")) {
        setErrors(prev => ({ ...prev, email: detail }));
    }
    } else {
      // Error genérico por si se cae el servidor o hay problemas de red
        alert("Ocurrió un error inesperado. Intentalo más tarde.");
    }
}

};

return (
    <div className="registro-container">
        <h2 style={{ textAlign: 'center' }}>Crear tu cuenta en Sportify</h2>
    
        <form onSubmit={handleRegistro}>
        
        {/* Campo Nombre */}
        <label className="registro-label">Nombre:</label>
        <input 
            name="nombre" 
                className="registro-input"
                placeholder="Ej: Luciano" 
                onChange={handleChange} 
                required
        />

        {/* Campo Apellido */}
        <label className="registro-label">Apellido:</label>
        <input 
            name="apellido" 
                className="registro-input"
                placeholder="Ej: Pérez" 
                onChange={handleChange} 
                required
        />

        {/* Campo DNI con Error del Backend */}
        <label className="registro-label">DNI:</label>
        <input 
            name="dni" 
            type="text"
            inputMode="numeric" // Esto hace que en celulares se abra el teclado numérico
            className={`registro-input ${errors.dni ? 'error' : ''}`}
            placeholder="Ej: 12345678 (sin puntos)" 
            onChange={handleChange} 
            maxLength="8" // No deja escribir más de 8
            required
        />
        {errors.dni && <span className="error-message">{errors.dni}</span>}

        {/* Campo Email con Error del Backend */}
        <label className="registro-label">Correo Electrónico:</label>
        <input 
            name="email" 
            type="email"
            className={`registro-input ${errors.email ? 'error' : ''}`}
            placeholder="usuario@email.com" 
            onChange={handleChange} 
            required
        />
        {errors.email && <span className="error-message">{errors.email}</span>}

        {/* Campo Teléfono con Validación de 10 dígitos */}
        <label className="registro-label">Teléfono (Argentina):</label>
        <input 
            name="telefono" 
                className={`registro-input ${errors.telefono ? 'error' : ''}`}
                placeholder="Cod. Area + Numero (ej: 2215556677)" 
                onChange={handleChange} 
                required
        />
        {errors.telefono && <span className="error-message">{errors.telefono}</span>}

        {/* Campo Password con Validación de Complejidad */}
        <label className="registro-label">Contraseña:</label>
        <input 
            name="password" 
                type="password"
                className={`registro-input ${errors.password ? 'error' : ''}`}
                placeholder="Mínimo 6 caracteres, 1 mayúscula y 1 especial" 
                onChange={handleChange} 
                required
        />
        {errors.password && <span className="error-message">{errors.password}</span>}

        {/* Confirmar Password */}
        <label className="registro-label">Confirmar Contraseña:</label>
        <input 
            name="confirmar_password" 
                type="password"
                className={`registro-input ${errors.confirmar_password ? 'error' : ''}`}
                placeholder="Repetí tu contraseña" 
                onChange={handleChange} 
                required
        />
        {errors.confirmar_password && <span className="error-message">{errors.confirmar_password}</span>}

        {/* Apto Físico */}
        <label className="registro-label">Apto Físico (PDF):</label>
        <input 
            type="file" 
                accept=".pdf" 
                className="registro-input" 
                onChange={handleFileChange} 
                required
        />

        <button type="submit" className="boton-registrar">
            REGISTRARME
        </button>
    </form>

    <p className="login-link-container">
            ¿Ya tenés cuenta? <Link to="/login" className="login-link">Iniciá sesión acá</Link>
        </p>
    </div>
);
};

export default Registro;
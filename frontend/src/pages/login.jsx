import React, { useState } from 'react';
import api from '../api/api.js'; 
import '../assets/css/Login.css';           
import logoSportify from './logo.png';
import { useNavigate } from 'react-router-dom'; 
import { Link } from 'react-router-dom';

const Login = ({ setToken }) => { 
    const navigate = useNavigate();
    
    // ¡ESTO ERA LO QUE FALTABA! Declarar los estados de los inputs
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const data = new URLSearchParams();
            data.append('username', email);
            data.append('password', password);

            const res = await api.post('/auth/login', data);
            
            localStorage.setItem('token', res.data.access_token);
            setToken(res.data.access_token); // Ahora funciona perfecto sin trabarse

            navigate('/home'); 
            
        } catch (err) {
            console.error(err);
            alert("Error en las credenciales");
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <div className="login-header">
                    <img src={logoSportify} alt="Sportify Logo" className="login-logo" />
                    <h1 className="login-titulo">Sportify</h1>
                </div>

                <form onSubmit={handleLogin} className="login-form">
                    <label className="login-label">Correo Electrónico:</label>
                    <input 
                        type="email" 
                        className="login-input"
                        placeholder="usuario@email.com" 
                        onChange={(e) => setEmail(e.target.value)} 
                        required
                    />

                    <label className="login-label">Contraseña:</label>
                    <input 
                        type="password" 
                        className="login-input"
                        placeholder="Tu contraseña" 
                        onChange={(e) => setPassword(e.target.value)} 
                        required
                    />

                    <button type="submit" className="boton-login">
                        INICIAR SESIÓN
                    </button>
                </form>

                <p className="registro-link-container">
                    ¿Sos nuevo? <Link to="/registro" className="registro-link">Registrate acá</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
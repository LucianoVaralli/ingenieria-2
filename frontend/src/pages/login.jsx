import React, { useState } from 'react';
import api from '../api/api.js'; // Importás la configuración de axios que centralizamos
import '../assets/css/Login.css';           // Importás el diseño
import { useNavigate } from 'react-router-dom'; 
import { Link } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate(); 

const handleLogin = async (e) => {
    e.preventDefault();
    try {
        const data = new URLSearchParams();
        data.append('username', email);
        data.append('password', password);

        const res = await api.post('/auth/login', data);
        localStorage.setItem('token', res.data.access_token);
    
        // manda al inicio
        navigate('/home'); 
    
    } catch (err) {
        alert("Error en las credenciales");
    }
};

//html
return (
<div className="login-container">
    <form onSubmit={handleLogin} className="login-form">
    <h1>Sportify</h1>
    <input 
        type="email" 
        placeholder="Email" 
        onChange={(e) => setEmail(e.target.value)} 
    />
    <input 
        type="password" 
        placeholder="Contraseña" 
        onChange={(e) => setPassword(e.target.value)} 
    />
    <button type="submit">Entrar</button>
    </form>
    <p>¿Sos nuevo? <Link to="/registro">Registrate acá</Link></p>
</div>
);
};

export default Login;
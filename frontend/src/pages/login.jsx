import React, { useState } from 'react';
import api from '../../api/api'; // Importás la configuración de axios que centralizamos
import './Login.css';           // Importás el diseño
import api from '../../api/api'; // Importás tu nueva configuración

const Login = () => {
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');

const handleLogin = async (e) => {
    e.preventDefault();
    try {
    const data = new URLSearchParams();
    data.append('username', email);
    data.append('password', password);

    // Ya no ponés toda la URL, solo el endpoint
    const res = await api.post('/auth/login', data);
    
    localStorage.setItem('token', res.data.access_token);
    alert("¡Entraste!");
    } catch (err) {
        console.error(err);
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
</div>
);
};

export default Login;
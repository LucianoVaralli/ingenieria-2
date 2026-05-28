import React, { useState } from 'react';
import api from '../api/api.js'; 
import '../assets/css/Login.css';           
import logoSportify from '../assets/logo.png';
import { useNavigate } from 'react-router-dom'; 
import { Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { Eye, EyeOff } from 'lucide-react';


const Login = ({ setToken }) => { 
    const navigate = useNavigate();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();

        setError(''); // limpia errores anteriores

        try {
            const data = new URLSearchParams();
            data.append('username', email);
            data.append('password', password);

            const res = await api.post('/auth/login', data);
            
            localStorage.setItem('token', res.data.access_token);
            localStorage.setItem("rol", res.data.rol);
            setToken(res.data.access_token); 

            const tokenRecibido = res.data.access_token;
            const decoded = jwtDecode(tokenRecibido);
            
            if (decoded.rol === 'admin') {
                navigate('/admin'); // Si es admin, al panel de control
            } else {
                navigate('/home');  // Si es socio/profesor, al home común
            }
            
        } catch (err) {
            console.error(err);

            setError('Correo o contraseña incorrectos');
        }
    };

    return (
        <div className="login-container">

            {/* Panel izquierdo decorativo */}
            <div className="login-left">
                <div className="login-left-bg" />
                <div className="login-left-grid" />
                <div className="login-deco-circle" />

                <div className="login-left-content">
                    <h2 className="login-tagline">
                        ENTRENÁ<br />EN <span>SERIO</span>,<br />ENTRENÁ<br />EN SPORTIFY
                    </h2>
                    <p className="login-sub">Tu próximo nivel empieza acá.</p>
                    <div className="login-stats">
                        <div className="login-stat">
                            <span className="login-stat-num">+2K</span>
                            <span className="login-stat-label">Miembros</span>
                        </div>
                        {/*<div className="login-stat">
                            <span className="login-stat-num">30+</span>
                            <span className="login-stat-label">Clases</span>
                        </div>
                        <div className="login-stat">
                            <span className="login-stat-num">5★</span>
                            <span className="login-stat-label">Rating</span>
                        </div> */}
                    </div>
                </div>
            </div>

            {/* Panel derecho: formulario */}
            <div className="login-box">
                <div className="login-header">
                    <img src={logoSportify} alt="Sportify Logo" className="login-logo" />
                    <h1 className="login-titulo">Sportify</h1>
                    <p className="login-subtitle">Bienvenido de vuelta</p>
                </div>

                <form onSubmit={handleLogin} className="login-form">
                    <label className="login-label">Correo Electrónico</label>
                    <input 
                        type="email" 
                        className="login-input"
                        placeholder="usuario@email.com" 
                        onChange={(e) => setEmail(e.target.value)} 
                        required
                    />

                    <label className="login-label">Contraseña</label>
                    <div className="password-wrapper">
                        <input 
                            type={showPassword ? "text" : "password"}
                            className="login-input"
                            placeholder="••••••••" 
                            onChange={(e) => setPassword(e.target.value)} 
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

                    <button type="submit" className="   boton-login">
                        INICIAR SESIÓN
                    </button>
                    
                    {error && (
                        <p className="login-error">
                            {error}
                        </p>
                    )}                    
                </form>

                <p className="registro-link-container">
                    ¿Sos nuevo? <Link to="/registro" className="registro-link">Registrate acá</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;

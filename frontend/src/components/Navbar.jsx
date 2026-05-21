import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../assets/css/Navbar.css'; 

const Navbar = ({ setToken }) => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token'); 

    const handleLogout = () => {
        localStorage.removeItem('token');
        if (setToken) setToken(null); 
        navigate('/login');
    };

    const scrollToSection = (idSeccion) => {
        const elemento = document.getElementById(idSeccion);
        if (elemento) {
            elemento.scrollIntoView({ behavior: 'smooth' });
        } else {
            // Si por alguna razón estás en otra ruta (/perfil o /login), primero va al inicio
            navigate('/');
            setTimeout(() => {
                const el = document.getElementById(idSeccion);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    };

    return (
        <nav className="navbar-container">
            <div className="navbar-logo">
                <Link to={token ? "/home" : "/"} className="navbar-brand">
                    <span className="navbar-brand-icon">🏋️</span>
                    <span className="navbar-brand-text">SPORTIFY</span>
                </Link>
            </div>
            
            <div className="navbar-menu">
                <span onClick={() => scrollToSection('seccion-clases')} className="navbar-link" style={{ cursor: 'pointer' }}>
                    Clases
                </span>
                <span onClick={() => scrollToSection('seccion-gimnasio')} className="navbar-link" style={{ cursor: 'pointer' }}>
                    El Gimnasio
                </span>
                
                {token ? (
                    <div className="navbar-auth">
                        <Link to="/perfil" className="navbar-link">Mi Perfil</Link>
                        <button onClick={handleLogout} className="navbar-link-highlight">
                            Cerrar Sesión
                        </button>
                    </div>
                ) : (
                    <div className="navbar-auth">
                        <Link to="/login" className="navbar-link">Iniciar Sesión</Link>
                        <Link to="/registro" className="navbar-btn">Registrarse</Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
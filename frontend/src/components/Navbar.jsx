import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../assets/css/Navbar.css'; 

const Navbar = ({ setToken }) => {
    const navigate = useNavigate();
    
    // Leemos el token directamente para que no falle al refrescar
    const token = localStorage.getItem('token'); 

    const handleLogout = () => {
        localStorage.removeItem('token');
        if (setToken) setToken(null); 
        navigate('/login');
    };

    // Función interna para scrolear suave en la Landing
    const scrollToSection = (idSeccion) => {
        navigate('/'); // Nos aseguramos de estar en la raíz
        setTimeout(() => {
            const elemento = document.getElementById(idSeccion);
            if (elemento) {
                elemento.scrollIntoView({ behavior: 'smooth' });
            }
        }, 80); // Mini delay para que React monte la Landing antes de mover el scroll
    };

    return (
        <nav className="navbar-container">
            <div className="navbar-logo">
                {/* Al clickear el logo, te lleva arriba de todo en la Landing */}
                <span onClick={() => scrollToSection('landing-top')} className="navbar-brand" style={{ cursor: 'pointer' }}>
                    SPORTIFY 🏋️‍♂️
                </span>
            </div>
            
            <div className="navbar-menu">
                {/* 🌟 Ahora estos botones llaman a la función de scroll suave */}
                <span onClick={() => scrollToSection('seccion-horarios')} className="navbar-link" style={{ cursor: 'pointer' }}>
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
                        <Link to="/registro" className="navbar-link">Registrarse</Link>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;


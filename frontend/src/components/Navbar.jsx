
import React, { useState, useEffect } from 'react'; // El cambio está aquí
import { Link, useNavigate } from 'react-router-dom';
import '../assets/css/Navbar.css'; 
import logo from '../assets/logo.png';
import api from '../api/api';

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
    
    const rol = localStorage.getItem("rol"); //recupero el rol del localStorage

    const esAdmin = rol === "Admin"; //verifico si el rol es ADMIN

    const [scrolled, setScrolled] = useState(false);
    const [cantidadNoLeidas, setCantidadNoLeidas] = useState(0);


    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {

        if (!token) return;

        if (rol === "profesor") return;

        api.get("/notificaciones/no-leidas")
            .then(res => {
                setCantidadNoLeidas(res.data.cantidad);
            })
            .catch(err => {
                console.error("Error obteniendo notificaciones", err);
            });

    }, [token, rol]);

    return (
        <nav className={`navbar-container ${scrolled ? 'navbar-scrolled' : ''}`}>
            <div className="navbar-logo">
                <Link to={token ? "/home" : "/"} className="navbar-brand">
                    <img src={logo} alt="Sportify" className="navbar-logo-img" /> {/** aca se cambia el logo de la pagina principal*/}
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
                {esAdmin && ( //lo muestra solo si el usuario es admin
                    <Link to="/admin" className="navbar-link">
                        Panel Admin
                    </Link>
                )}
                {token ? (
                    <div className="navbar-auth">
                        {rol !== "profesor" && (
                            <Link
                                to="/notificaciones"
                                className="navbar-link"
                            >
                                🔔 {cantidadNoLeidas > 0 && `(${cantidadNoLeidas})`}
                            </Link>
                        )}
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
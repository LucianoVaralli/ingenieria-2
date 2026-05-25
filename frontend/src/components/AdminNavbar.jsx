import { Link, useNavigate } from "react-router-dom";
import "../assets/css/AdminNavbar.css";
import logoSportify from "../assets/logo.png";

function AdminNavbar({ setToken }) {

    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("token");

        if (setToken) {
            setToken(null);
        }

        navigate("/login");
    };

    return (
        <nav className="admin-navbar">

            <div className="admin-navbar-logo">
                <img
                    src={logoSportify}
                    alt="Sportify Logo"
                    className="admin-navbar-logo-img"
                />

                <span>SPORTIFY ADMIN</span>
            </div>

            <div className="admin-navbar-links">

                <Link to="/admin" className="admin-link">
                    Home
                </Link>

                <Link to="/admin/crear-clase" className="admin-link">
                    Crear Clase
                </Link>
                
                <Link to="/admin/eliminar-clase" className="admin-link">
                    Eliminar Clase
                </Link>

                <Link to="/admin/editar-capacidad" className="admin-link">
                    Editar Capacidad
                </Link>

                <button
                    onClick={handleLogout}
                    className="admin-logout-btn"
                >
                    Cerrar Sesión
                </button>

            </div>

        </nav>
    );
}

export default AdminNavbar;
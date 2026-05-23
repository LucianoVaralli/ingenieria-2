import { Link, useNavigate } from "react-router-dom";
import "../assets/css/AdminNavbar.css";

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
                SPORTIFY ADMIN
            </div>

            <div className="admin-navbar-links">

                <Link to="/admin" className="admin-link">
                    Dashboard
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

                <Link to="/admin/ver-clases" className="admin-link">
                    Ver Clases
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
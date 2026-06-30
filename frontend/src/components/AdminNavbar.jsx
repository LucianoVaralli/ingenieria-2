import { Link, useNavigate, useLocation } from "react-router-dom";
import "../assets/css/AdminNavbar.css";
import logoSportify from "../assets/logo.png";

const NAV_ITEMS = [
    { to: "/admin",                 label: "Dashboard",       icon: "⬛" },
    { to: "/admin/crear-clase",     label: "Crear Clase",     icon: "＋" },
    { to: "/admin/eliminar-clase",  label: "Ver Clases",          icon: "☰" },
    { to: "/admin/editar-capacidad",label: "Capacidad",       icon: "◎" },
    { to: "/admin/preguntas-frecuentes", label: "Preguntas Frecuentes", icon: "❓" },
    { to: "/admin/gestion-profesores", label: "Gestión de Profesores", icon: "👨‍🏫" },
];

function AdminNavbar({ setToken, abierto, setAbierto }) {
    const navigate  = useNavigate();
    const location  = useLocation();

    const handleLogout = () => {
        localStorage.removeItem("token");
        if (setToken) setToken(null);
        navigate("/login");
    };

    return (
        <aside className={`admin-sidebar ${
        abierto ? "abierto" : "cerrado"
    }`} >
            <button
                className="admin-sidebar-toggle"
                onClick={() => setAbierto(!abierto)}
            >
                ☰
            </button>
            {/* Logo */}
            <div className="admin-sidebar-brand">
                <img src={logoSportify} alt="Sportify" className="admin-sidebar-logo" />
                    {abierto && (
                        <div>
                            <span className="admin-sidebar-name">SPORTIFY</span>
                            <span className="admin-sidebar-tag">Admin</span>
                        </div>
                    )}
            </div>

            {/* Separador */}
            <div className="admin-sidebar-sep" />

            {/* Navegación */}
            <nav className="admin-sidebar-nav">
                {abierto && (
                    <span className="admin-sidebar-section">
                        Gestión
                    </span>
                )}
                {NAV_ITEMS.map(item => (
                    <Link
                        key={item.to}
                        to={item.to}
                        className={`admin-sidebar-link ${location.pathname === item.to ? 'admin-sidebar-link--active' : ''}`}
                    >
                        <span className="admin-sidebar-link-icon">{item.icon}</span>

                        {abierto && (
                            <span>{item.label}</span>
                        )}
                    </Link>
                ))}
            </nav>

            {/* Footer del sidebar */}
            <div className="admin-sidebar-footer">
                <button onClick={handleLogout} className="admin-sidebar-logout">
                    {abierto ? "↩ Cerrar Sesión" : "↩"}
                </button>
            </div>

        </aside>
    );
}

export default AdminNavbar;
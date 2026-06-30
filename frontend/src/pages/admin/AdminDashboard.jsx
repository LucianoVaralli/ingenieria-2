import { Link } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import "../../assets/css/Admin.css";

const OPCIONES = [
    {
        to:    "/admin/crear-clase",
        icon:  "＋",
        titulo: "Crear Clase",
        desc:  "Agregá una nueva actividad con horario, profesor y cupos.",
    },
    {
        to:    "/admin/eliminar-clase",
        icon:  "☰",
        titulo: "Ver Clases",
        desc:  "Listado completo de clases activas con opción de eliminar.",
    },
    {
        to:    "/admin/editar-capacidad",
        icon:  "◎",
        titulo: "Capacidad",
        desc:  "Actualizá el aforo máximo del gimnasio.",
    },
    {
        to: "/admin/preguntas-frecuentes",
        icon: "❓",
        titulo: "Preguntas Frecuentes",
        desc: "Administrá las preguntas y respuestas visibles para los usuarios."
    },
    {
        to: "/admin/gestion-profesores",
        icon: "👤",
        titulo: "Gestión de Profesores",
        desc: "Administrá la información y disponibilidad de los profesores."
    },
    {
        to: "/admin/estadisticas",
        icon: "📊",
        titulo: "Estadísticas",
        desc: "Aqui poner una descripcion"
    }
];

function AdminDashboard() {
    return (
        <AdminLayout>
            <div className="admin-page">

                <div className="admin-section-label">Panel de control</div>
                <h1 className="admin-section-title">Dashboard</h1>

                <div className="admin-opciones">
                    {OPCIONES.map(op => (
                        <Link to={op.to} className="admin-card" key={op.to}>
                            <span className="admin-card-icon">{op.icon}</span>
                            <h3>{op.titulo}</h3>
                            <p>{op.desc}</p>
                        </Link>
                    ))}
                </div>

            </div>
        </AdminLayout>
    );
}

export default AdminDashboard;

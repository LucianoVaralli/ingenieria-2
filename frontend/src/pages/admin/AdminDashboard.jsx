import AdminNavbar from "../../components/AdminNavbar";
import CrearClase from "./CrearClase";
import ListaClasesAdmin from "./ListaClasesAdmin";
import EditarCapacidad from "./EditarCapacidad";

function AdminDashboard() {

    return (
        <div style={{
            minHeight: "100vh",
            backgroundColor: "#121212",
            color: "white"
        }}>

            <AdminNavbar />

            <div style={{
                padding: "40px"
            }}>

                <h1 style={{
                    color: "#5DBB46"
                }}>
                    Panel de Administración
                </h1>

                <p>
                    Bienvenido administrador.
                </p>

                <p>
                    Desde acá vas a poder gestionar:
                </p>

                <div className="admin-opciones">

                    <div className="admin-card">
                        <h3>Crear Clase</h3>
                        <p>
                            Gestión de actividades y cupos
                        </p>
                    </div>

                    <div className="admin-card">
                        <h3>Eliminar Clase</h3>
                        <p>
                            Control de clases programadas
                        </p>
                    </div>

                    <div className="admin-card">
                        <h3>Capacidad</h3>
                        <p>
                            Control del espacio disponible
                        </p>
                    </div>

                    <div className="admin-card">
                        <h3>Clases</h3>
                        <p>
                            Ver las clases con su información detallada
                        </p>
                    </div>

                </div>

            </div>

        </div>
    );
}

export default AdminDashboard;
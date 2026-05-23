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

                <ul>
                    <li>Clases</li>
                    <li>Horarios</li>
                    <li>Capacidad del gimnasio</li>
                    <li>Reservas</li>
                </ul>

            </div>

        </div>
    );
}

export default AdminDashboard;
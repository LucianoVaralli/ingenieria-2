import React, { useEffect, useState } from "react";
import api from "../../api/api";
import "../../assets/css/Admin.css";
import AdminLayout from "../../layouts/AdminLayout";

function ListaClasesAdmin() {

    const [clases, setClases] = useState([]);
    const [errorBackend, setErrorBackend] = useState("");
    const [mensajeExito, setMensajeExito] = useState("");
    const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
    const [claseAEliminar, setClaseAEliminar] = useState(null);

    useEffect(() => {
        cargarClases();
    }, []);

    const cargarClases = async () => {
        try {
            const res = await api.get("/clases/");
            setClases(res.data);
        } catch (error) {
            console.error("Error cargando clases", error);
        }
    };

    /**
     * La función que se encarga de eliminar la clase, recibe el id de la clase a eliminar
     */
    const eliminarClase = async () => {

        setErrorBackend("");
        setMensajeExito("");

        try {

            await api.delete(`/clases/${claseAEliminar}`);

            setClases(
                clases.filter(c => c.id !== claseAEliminar)
            );

            setMensajeExito("Eliminación completada");

            setTimeout(() => {
                setMensajeExito("");
            }, 3000);

            setMostrarConfirmacion(false);
            setClaseAEliminar(null);

        } catch (error) {

            console.error(error);

            setErrorBackend(
                error.response?.data?.detail ||
                "Error eliminando clase"
            );
        }
    };

    return (
        <AdminLayout>
            <div className="admin-page">
                <div className="lista-clases-admin">

                    <h2>Clases existentes</h2>

                        {mensajeExito && (
                            <p className="mensaje-exito">
                                {mensajeExito}
                            </p>
                        )}

                        {errorBackend && (
                            <p className="input-error">
                                {errorBackend}
                            </p>
                        )}                    

                    {clases.length === 0 ? (
                        <p>No hay clases cargadas.</p>
                    ) : (
                        clases.map(clase => (

                            <div
                                key={clase.id}
                                className="clase-admin-card"
                            >

                                <div>
                                    <h3>
                                        {clase.actividad.charAt(0).toUpperCase() +
                                        clase.actividad.slice(1)}
                                    </h3>

                                    <p>
                                        {clase.dia.charAt(0).toUpperCase() +
                                        clase.dia.slice(1)}
                                        {" — "}
                                        {clase.horario?.slice(0,5)}
                                    </p>

                                    <p>
                                        Profesor: {clase.profesor_nombre}
                                    </p>

                                    <p>
                                        Cupo: {clase.cupo}
                                    </p>
                                </div>

                                <button
                                    className="btn-eliminar"
                                    onClick={() => {
                                        setClaseAEliminar(clase.id);
                                        setMostrarConfirmacion(true);
                                    }}
                                >
                                    Eliminar clase
                                </button>

                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* MODAL */}
            {mostrarConfirmacion && (
                <div className="modal-overlay">

                    <div className="modal-confirmacion">

                        <h3>
                            ¿Seguro que desea eliminar esta clase?
                        </h3>

                        <div className="modal-botones">

                            <button
                                className="btn-cancelar"
                                onClick={() => {
                                    setMostrarConfirmacion(false);
                                    setClaseAEliminar(null);
                                }}
                            >
                                Cancelar
                            </button>

                            <button
                                className="btn-eliminar"
                                onClick={eliminarClase}
                            >
                                Eliminar
                            </button>

                        </div>

                    </div>

                </div>
            )}
            
        </AdminLayout>
    );
}

export default ListaClasesAdmin;
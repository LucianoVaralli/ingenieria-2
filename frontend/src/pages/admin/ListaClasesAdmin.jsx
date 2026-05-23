import React, { useEffect, useState } from "react";
import api from "../../api/api";
import "../../assets/css/Admin.css";
import AdminLayout from "../../layouts/AdminLayout";

function ListaClasesAdmin() {

    const [clases, setClases] = useState([]);
    const [errorBackend, setErrorBackend] = useState("");
    const [mensajeExito, setMensajeExito] = useState("");

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
    const eliminarClase = async (id) => {

        setErrorBackend("");
        setMensajeExito("");

        const confirmar = window.confirm(
            "¿Seguro que desea eliminar esta clase?"
        );

        if (!confirmar) return;

        try {

            await api.delete(`/clases/${id}`);

            setClases(clases.filter(c => c.id !== id));

            setMensajeExito("Eliminacion Completada");

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
                                    <h3>{clase.actividad}</h3>

                                    <p>
                                        {clase.dia} — {clase.horario?.slice(0,5)}
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
                                    onClick={() => eliminarClase(clase.id)}
                                >
                                    Eliminar clase
                                </button>

                            </div>
                        ))
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

export default ListaClasesAdmin;
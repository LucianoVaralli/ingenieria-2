import React, { useEffect, useState } from "react";
import api from "../../api/api";
import "../../assets/css/ListaClasesAdmin.css";
import AdminLayout from "../../layouts/AdminLayout";

function ListaClasesAdmin() {
    const [clases,               setClases]               = useState([]);
    const [errorBackend,         setErrorBackend]         = useState("");
    const [mensajeExito,         setMensajeExito]         = useState("");
    const [mostrarConfirmacion,  setMostrarConfirmacion]  = useState(false);
    const [claseAEliminar,       setClaseAEliminar]       = useState(null);

    useEffect(() => { cargarClases(); }, []);

    const cargarClases = async () => {
        try {
            const res = await api.get("/clases/");
            setClases(res.data);
        } catch (error) {
            console.error("Error cargando clases", error);
        }
    };

    const eliminarClase = async () => {
        setErrorBackend("");
        setMensajeExito("");
        try {

            await api.put(`/clases/eliminar/${claseAEliminar}`, {
                motivo: "Clase eliminada por administrador"
            });

            await cargarClases();

            setMensajeExito("Eliminación completada");

            setTimeout(() => {
                setMensajeExito("");
            }, 3000);

            setMostrarConfirmacion(false);
            setClaseAEliminar(null);
        } catch (error) {
            setErrorBackend(error.response?.data?.detail || "Error eliminando clase");
        }
    };

    return (
        <AdminLayout>
            <div className="lista-page">

                <div className="lista-header">
                    <div className="lista-label">Gestión</div>
                    <h1 className="lista-titulo">Clases existentes</h1>
                </div>

                {mensajeExito && <p className="lista-mensaje-exito">{mensajeExito}</p>}
                {errorBackend && <p className="lista-error-backend">{errorBackend}</p>}

                {clases.length === 0 ? (
                    <div className="lista-vacia">
                        <span className="lista-vacia-icon">📭</span>
                        <p>No hay clases cargadas todavía.</p>
                    </div>
                ) : (
                    clases.map(clase => (
                        <div key={clase.id} className="clase-admin-card">
                            <div className="clase-admin-card-info">
                                <h3>{clase.actividad}</h3>
                                <p>{clase.dia.charAt(0).toUpperCase() + clase.dia.slice(1)} — {clase.horario?.slice(0, 5)}</p>
                                <p>Prof. {clase.profesor_nombre}</p>
                                <span className="clase-admin-card-badge">Cupo: {clase.cupo}</span>
                            </div>
                            <button
                                className="btn-eliminar"
                                onClick={() => { setClaseAEliminar(clase.id); setMostrarConfirmacion(true); }}
                            >
                                Eliminar
                            </button>
                        </div>
                    ))
                )}
            </div>

            {mostrarConfirmacion && (
                <div className="modal-overlay">
                    <div className="modal-confirmacion">
                        <h3>¿Seguro que querés eliminar esta clase?</h3>
                        <div className="modal-botones">
                            <button className="btn-cancelar" onClick={() => { setMostrarConfirmacion(false); setClaseAEliminar(null); }}>
                                Cancelar
                            </button>
                            <button className="btn-eliminar" onClick={eliminarClase}>
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

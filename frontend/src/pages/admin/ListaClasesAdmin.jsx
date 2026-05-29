import React, { useEffect, useState } from "react";
import api from "../../api/api";
import "../../assets/css/ListaClasesAdmin.css";
import AdminLayout from "../../layouts/AdminLayout";

function ListaClasesAdmin() {
    const [clases, setClases] = useState([]);
    const [errorBackend, setErrorBackend] = useState("");
    const [mensajeExito, setMensajeExito] = useState("");
    const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
    const [claseAEliminar, setClaseAEliminar] = useState(null);

    // Array de días en orden para armar las columnas
    const diasSemana = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

    // Helper para normalizar el texto (evita problemas de mayúsculas/minúsculas o acentos de la Base de Datos)
    const normalizarTexto = (txt) => {
        return txt ? txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
    };

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
            const res = await api.put(`/clases/eliminar/${claseAEliminar}`, {
                motivo: "Clase eliminada por administrador"
            });


            if (res.data.alertas?.length) {
                alert(res.data.alertas.join("\n"));
            }

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
                    /* Contenedor principal de las columnas */
                    <div className="columnas-semana-container">
                        {diasSemana.map((dia) => {
                            // Filtramos las clases que corresponden a este día y las ordenamos por horario
                            const clasesDelDia = clases
                                .filter(clase => normalizarTexto(clase.dia) === normalizarTexto(dia))
                                .sort((a, b) => (a.horario || "").localeCompare(b.horario || ""));

                            return (
                                <div key={dia} className="columna-dia">
                                    <div className="columna-dia-header">
                                        <h3>{dia}</h3>
                                        <span className="columna-contador">{clasesDelDia.length}</span>
                                    </div>
                                    
                                    <div className="columna-dia-contenido">
                                        {clasesDelDia.length === 0 ? (
                                            <p className="clase-vacia-txt">Sin clases</p>
                                        ) : (
                                            clasesDelDia.map((clase) => (
                                                <div key={clase.id} className="clase-admin-card-mini">
                                                    <div className="clase-mini-info">
                                                        <h4>{clase.actividad}</h4>
                                                        <span className="clase-mini-horario">
                                                            {clase.horario?.slice(0, 5)} hs
                                                        </span>
                                                        <p className="clase-mini-prof">Prof. {clase.profesor_nombre}</p>

                                                        <span className="clase-mini-badge">Cupo: {clase.cupo}</span>
                                                    </div>
                                                    <button
                                                        className="btn-eliminar-mini"
                                                        onClick={() => { setClaseAEliminar(clase.id); setMostrarConfirmacion(true); }}
                                                    >
                                                        Eliminar
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
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
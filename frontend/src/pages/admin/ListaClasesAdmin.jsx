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
    const [infoEliminacion, setInfoEliminacion] = useState(null);
    const [errorEliminar, setErrorEliminar] = useState("");

    const [mostrarModalCancelarDia, setMostrarModalCancelarDia] = useState(false);
    const [claseCancelarDia, setClaseCancelarDia] = useState(null);

    const [fechaCancelar, setFechaCancelar] = useState("");
    const [motivoCancelar, setMotivoCancelar] = useState("");
    const [errorCancelarDia, setErrorCancelarDia] = useState("");

    const diasSemana = [
        "lunes", "martes", "miercoles",
        "jueves", "viernes", "sabado", "domingo"
    ];
    
    const [fechasDisponibles, setFechasDisponibles] = useState([]);

    const normalizarTexto = (txt) =>
        txt
            ? txt.toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
            : "";

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

    const generarFechasPorDiaSemana = (diaSemana) => {
        const diasMap = {
            "lunes": 1,
            "martes": 2,
            "miercoles": 3,
            "jueves": 4,
            "viernes": 5,
            "sabado": 6,
            "domingo": 0
        };

        const targetDay = diasMap[diaSemana];
        const hoy = new Date();

        const year = hoy.getFullYear();
        const month = hoy.getMonth();

        const fechas = [];

        const ultimoDia = new Date(year, month + 1, 0).getDate();

        for (let d = 1; d <= ultimoDia; d++) {
            const fecha = new Date(year, month, d);

            if (fecha.getDay() === targetDay && fecha >= hoy) {
                fechas.push(fecha.toISOString().split("T")[0]);
            }
        }

        return fechas;
    };

    const abrirConfirmacionEliminar = async (claseId) => {
        try {
            const res = await api.get(
                `/clases/eliminar/${claseId}/info`
            );

            setInfoEliminacion(res.data);
            setClaseAEliminar(claseId);
            setMostrarConfirmacion(true);

        } catch (error) {
            setErrorEliminar(
                error.response?.data?.detail ||
                "Error obteniendo información"
            );
        }
    };

    const eliminarClase = async () => {
        setErrorBackend("");
        setMensajeExito("");

        try {
            const res = await api.put(
                `/clases/eliminar/${claseAEliminar}`,
                {
                    motivo: "Clase eliminada por administrador"
                }
            );

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
            setInfoEliminacion(null);

        } catch (error) {
            setErrorBackend(
                error.response?.data?.detail ||
                "Error eliminando clase"
            );
        }
    };

    const abrirModalCancelacion = (clase) => {
        setClaseCancelarDia(clase);
        const fechas = generarFechasPorDiaSemana(clase.dia);
        setFechasDisponibles(fechas);

        setFechaCancelar("");
        setMotivoCancelar("");
        setErrorCancelarDia("");
        setMostrarModalCancelarDia(true);
    };

    const cancelarDiaClase = async () => {
        setErrorCancelarDia("");
        if (!fechaCancelar) {
            setErrorCancelarDia(
                "Debe seleccionar una fecha"
            );
            return;
        }

        if (motivoCancelar.trim().length < 5) {
            setErrorCancelarDia(
                "El motivo debe tener al menos 5 caracteres"
            );
            return;
        }

        try {
            await api.put(
                `/clases/cancelar-dia/${claseCancelarDia.id}`,
                {
                    fecha_clase: fechaCancelar,
                    motivo: motivoCancelar
                }
            );
            await cargarClases();

            setMostrarModalCancelarDia(false);
            setMensajeExito("Clase cancelada correctamente");

            setTimeout(() => {
                setMensajeExito("");
            }, 3000);

        } catch (error) {
            setErrorCancelarDia(
                error.response?.data?.detail ||
                "Error cancelando clase"
            );
        }
    };

    const capitalize = (texto) =>
    texto.charAt(0).toUpperCase() + texto.slice(1);

    const formatearFecha = (fecha) => {
        const [anio, mes, dia] = fecha.split("-");
        return `${dia}/${mes}/${anio}`;
    };

    return (
        <AdminLayout>
            <div className="lista-page">

                <div className="lista-header">
                    <div className="lista-label">Gestión</div>
                    <h1 className="lista-titulo">Clases existentes</h1>
                </div>

                {mensajeExito && (
                    <p className="lista-mensaje-exito">
                        {mensajeExito}
                    </p>
                )}

                {errorBackend && (
                    <p className="lista-error-backend">
                        {errorBackend}
                    </p>
                )}

                {errorEliminar && (
                    <p className="lista-error-backend">
                        {errorEliminar}
                    </p>
                )}

                {clases.length === 0 ? (
                    <div className="lista-vacia">
                        <span className="lista-vacia-icon">📭</span>
                        <p>No hay clases cargadas todavía.</p>
                    </div>
                ) : (
                    <div className="columnas-semana-container">

                        {diasSemana.map((dia) => {
                            const clasesDelDia = clases
                                .filter(
                                    (c) =>
                                        normalizarTexto(c.dia) ===
                                        normalizarTexto(dia)
                                )
                                .sort((a, b) =>
                                    (a.horario || "").localeCompare(
                                        b.horario || ""
                                    )
                                );

                            return (
                                <div
                                    key={dia}
                                    className="columna-dia"
                                >
                                    <div className="columna-dia-header">
                                        <h3>{dia}</h3>
                                        <span className="columna-contador">
                                            {clasesDelDia.length}
                                        </span>
                                    </div>

                                    <div className="columna-dia-contenido">

                                        {clasesDelDia.length === 0 ? (
                                            <p className="clase-vacia-txt">
                                                Sin clases
                                            </p>
                                        ) : (
                                            clasesDelDia.map((clase) => (
                                                <div
                                                    key={clase.id}
                                                    className="clase-admin-card-mini"
                                                >
                                                    <div className="clase-mini-info">
                                                        <h4>
                                                            {clase.actividad
                                                                .charAt(0)
                                                                .toUpperCase() +
                                                                clase.actividad.slice(1)}
                                                        </h4>

                                                        <span className="clase-mini-horario">
                                                            {clase.horario?.slice(0, 5)} hs
                                                        </span>

                                                        <p className="clase-mini-prof">
                                                            Prof. {clase.profesor_nombre}
                                                        </p>

                                                        <span className="clase-mini-badge">
                                                            Cupo: {clase.cupo}
                                                        </span>

                                                        <p className="clase-mini-alumnos">
                                                            👥 {clase.alumnos_inscriptos || 0} alumnos
                                                        </p>
                                                    </div>

                                                    <div className="acciones-clase">
                                                        <button
                                                            className="btn-cancelar-dia"
                                                            onClick={() =>
                                                                abrirModalCancelacion(clase)
                                                            }
                                                        >
                                                            Cancelar día
                                                        </button>

                                                        <button
                                                            className="btn-eliminar-mini"
                                                            onClick={() =>
                                                                abrirConfirmacionEliminar(
                                                                    clase.id
                                                                )
                                                            }
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </div>
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

            {/* MODAL ELIMINAR */}
            {mostrarConfirmacion && (
                <div className="modal-overlay">
                    <div className="modal-confirmacion">

                        <h3>
                            ¿Seguro que querés eliminar esta clase?
                        </h3>

                        {infoEliminacion?.alumnos_afectados > 0 && (
                            <p className="modal-advertencia">
                                Esta clase tiene{" "}
                                <strong>
                                    {infoEliminacion.alumnos_afectados} alumnos
                                </strong>{" "}
                                y{" "}
                                <strong>
                                    {infoEliminacion.reservas_afectadas} reservas
                                </strong>
                            </p>
                        )}

                        <div className="modal-botones">
                            <button
                                className="btn-cancelar"
                                onClick={() => {
                                    setMostrarConfirmacion(false);
                                    setClaseAEliminar(null);
                                    setInfoEliminacion(null);
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

            {/* MODAL CANCELAR DIA */}
            {mostrarModalCancelarDia && (
                <div className="modal-overlay">
                    <div className="modal-confirmacion">

                        <p className="actividad-cancelacion">
                            {claseCancelarDia?.actividad.charAt(0).toUpperCase() +
                                claseCancelarDia?.actividad.slice(1)}
                        </p>

                        <p className="info-cancelacion">
                            {capitalize(claseCancelarDia?.dia)} - {claseCancelarDia?.horario?.slice(0, 5)} hs
                        </p>

                        <label>Fecha</label>
                        <select
                            value={fechaCancelar}
                            onChange={(e) => {
                                setFechaCancelar(e.target.value);
                                setErrorCancelarDia("");
                            }}
                        >
                            <option value="">Seleccionar fecha</option>
                            {fechasDisponibles.map((fecha) => (
                                <option key={fecha} value={fecha}>
                                    {formatearFecha(fecha)} ({capitalize(claseCancelarDia?.dia)})
                                </option>
                            ))}
                        </select>

                        <label>Motivo</label>
                        <textarea
                            value={motivoCancelar}
                            onChange={(e) =>{
                                setMotivoCancelar(e.target.value);
                                setErrorCancelarDia("");
                            }}
                        />

                        {errorCancelarDia && (
                            <p className="error-modal-cancelacion">
                                {errorCancelarDia}
                            </p>
                        )}

                        <div className="modal-botones">
                            <button
                                className="btn-cancelar"
                                onClick={() =>
                                    setMostrarModalCancelarDia(false)
                                }
                            >
                                Volver
                            </button>

                            <button
                                className="btn-eliminar"
                                onClick={cancelarDiaClase}
                            >
                                Confirmar cancelación
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </AdminLayout>
    );
}

export default ListaClasesAdmin;
import React, { useEffect, useState } from "react";
import api from "../../api/api";
import "../../assets/css/ListaClasesAdmin.css";
import AdminLayout from "../../layouts/AdminLayout";
import QRProfesor from "../profesor/QRProfesor";
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
    const [errorCancelarDia, setErrorCancelarDia] = useState({
        fecha:"",
        motivo: "",
        general:""
    });

    const diasSemana = [
        "lunes", "martes", "miercoles",
        "jueves", "viernes", "sabado", "domingo"
    ];
    
    const [fechasDisponibles, setFechasDisponibles] = useState([]);

    const [mostrarModalCambioProfesor, setMostrarModalCambioProfesor] = useState(false);
    const [claseCambioProfesor, setClaseCambioProfesor] = useState(null);

    const [modoCambioProfesor, setModoCambioProfesor] = useState(""); 
    // "temporal" | "permanente"

    const [profesores, setProfesores] = useState([]);
    const [profesorSeleccionado, setProfesorSeleccionado] = useState("");
    const [fechaCambio, setFechaCambio] = useState("");
    const [motivoCambio, setMotivoCambio] = useState("");

    const [fechasCambio, setFechasCambio] = useState([]);

    const [erroresCambioProfesor, setErroresCambioProfesor] = useState({
        profesor: "",
        fecha: "",
        motivo: "",
        general:""
    });

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

    useEffect(() => {
        const cargarProfes = async () => {
            try {
                const res = await api.get("/socios/profesores");
                setProfesores(res.data);
            } catch (err) {
                console.error(err);
            }
        };

        cargarProfes();
    }, []);

    const abrirCambioProfesor = (clase) => {
        setClaseCambioProfesor(clase);
        setMostrarModalCambioProfesor(true);

        setModoCambioProfesor("");
        setProfesorSeleccionado("");
        setFechaCambio("");
        setMotivoCambio("");
        setErroresCambioProfesor({
            profesor: "",
            fecha: "",
            motivo: ""
        });
    };

    const seleccionarModoCambio = (modo) => {
        setModoCambioProfesor(modo);

        setErroresCambioProfesor({
            profesor: "",
            fecha: "",
            motivo: ""
        });
        setProfesorSeleccionado("");
        setFechaCambio("");
        setMotivoCambio("");

        if (modo === "temporal") {
            const fechas = generarFechasPorDiaSemana(claseCambioProfesor.dia);
            setFechasCambio(fechas);
        }
    };

    const confirmarCambioTemporal = async () => {
        const nuevosErrores = {
            profesor: "",
            fecha: "",
            motivo: ""
        };

        let hayError = false;

        if (!profesorSeleccionado) {
            nuevosErrores.profesor = "Debe seleccionar un profesor";
            hayError = true;
        }

        if (!fechaCambio) {
            nuevosErrores.fecha = "Debe seleccionar una fecha";
            hayError = true;
        }

        if (motivoCambio.trim().length < 5) {
            nuevosErrores.motivo = "El motivo debe tener al menos 5 caracteres";
            hayError = true;
        }

        setErroresCambioProfesor(nuevosErrores);

        if (hayError) return;

        try {
            await api.put(
                `/clases/cambiar-profesor-temporal/${claseCambioProfesor.id}`,
                {
                    profesor_id: profesorSeleccionado,
                    fecha: fechaCambio,
                    motivo: motivoCambio
                }
            );

            await cargarClases();
            setMostrarModalCambioProfesor(false);
            setMensajeExito("Cambio temporal de profesor exitoso.");

            setTimeout(() => {
                setMensajeExito("");
            }, 3000);

        } catch (err) {
            setErroresCambioProfesor(prev => ({
                ...prev,
                general: err.response?.data?.detail || "Error"
            }));
        }
    };

    const confirmarCambioPermanente = async () => {
        const nuevosErrores = {
            profesor: "",
            fecha: "",
            motivo: ""
        };

        let hayError = false;

        if (!profesorSeleccionado) {
            nuevosErrores.profesor = "Debe seleccionar un profesor";
            hayError = true;
        }

        if (motivoCambio.trim().length < 5) {
            nuevosErrores.motivo = "El motivo debe tener al menos 5 caracteres";
            hayError = true;
        }
        
        setErroresCambioProfesor(nuevosErrores);

        if (hayError) return;

        try {
            await api.put(
                `/clases/cambiar-profesor-permanente/${claseCambioProfesor.id}`,
                {
                    profesor_id: profesorSeleccionado,
                    motivo: motivoCambio
                }
            );

            await cargarClases();
            setMostrarModalCambioProfesor(false);
            setMensajeExito("Cambio permanente de profesor exitoso.");

            setTimeout(() => {
                setMensajeExito("");
            }, 3000);

        } catch (err) {
            setErroresCambioProfesor(prev => ({
                ...prev,
                general: err.response?.data?.detail || "Error"
            }));
        }
    };

    const resetModalCambioProfesor = () => {
        setModoCambioProfesor(null);
        setProfesorSeleccionado("");
        setFechaCambio("");
        setMotivoCambio("");
        setErroresCambioProfesor({
            profesor: "",
            fecha: "",
            motivo: ""
        });
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
        setErrorCancelarDia({
            fecha: "",
            motivo: ""
        });
        setMostrarModalCancelarDia(true);
    };

    const cancelarDiaClase = async () => {
        const nuevosErrores = {
            fecha: "",
            motivo: ""
        };

        let hayError = false;

        if (!fechaCancelar) {
            nuevosErrores.fecha = "Debe seleccionar una fecha";
            hayError=true;
        }

        if (motivoCancelar.trim().length < 5) {
            nuevosErrores.motivo="El motivo debe tener al menos 5 caracteres";
            hayError=true;
        }
        setErrorCancelarDia(nuevosErrores);
        
        if (hayError) return;

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
            setErrorCancelarDia(prev => ({
                ...prev,
                general: error.response?.data?.detail ||
                "Error cancelando clase"
            }));
        }
    };

    const capitalize = (texto) =>
        texto
            ? texto.charAt(0).toUpperCase() + texto.slice(1)
            : "";

    const formatearFecha = (fecha) => {
        const [anio, mes, dia] = fecha.split("-");
        return `${dia}/${mes}/${anio}`;
    };

    return (
        <AdminLayout>
            <div className="lista-page">
                <div className="lista-label">
                    Gestión
                </div>

                <h1 className="lista-titulo">
                    Clases existentes
                </h1>

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
                                        <h3>{capitalize(dia)}</h3>
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

                                                        <button
                                                            className="btn-cambiar-profesor"
                                                            onClick={() => abrirCambioProfesor(clase)}
                                                        >
                                                            Cambiar profesor
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

                        <div className="cancelar-dia-field">
                            <label className="cancelar-dia-field-label">Fecha</label>

                            <select
                                value={fechaCancelar}
                                onChange={(e) => {
                                    setFechaCancelar(e.target.value);
                                    setErrorCancelarDia(prev => ({
                                        ...prev,
                                        fecha: ""
                                    }));
                                }}
                                className={`cancelar-dia-select ${errorCancelarDia ? "error" : ""}`}
                            >
                                <option value="">Seleccionar fecha</option>
                                {fechasDisponibles.map((fecha) => (
                                    <option key={fecha} value={fecha}>
                                        {formatearFecha(fecha)} ({capitalize(claseCancelarDia?.dia)})
                                    </option>
                                ))}
                            </select>

                            {errorCancelarDia.fecha && (
                                <p className="cancelar-dia-error-field">
                                    {errorCancelarDia.fecha}
                                </p>
                            )}
                        </div>

                        <div className="cancelar-dia-field">
                            <label className="cancelar-dia-field-label">Motivo</label>

                            <textarea
                                value={motivoCancelar}
                                onChange={(e) => {
                                    setMotivoCancelar(e.target.value);
                                    setErrorCancelarDia(prev => ({
                                        ...prev,
                                        motivo: ""
                                    }));
                                }}
                                className={`cancelar-dia-textarea ${errorCancelarDia ? "error" : ""}`}
                            />

                            {errorCancelarDia.motivo && (
                                <p className="cancelar-dia-error-field">
                                    {errorCancelarDia.motivo}
                                </p>
                            )}
                        </div>
                        {errorCancelarDia.general && (
                            <p className="cancelar-dia-error-field">
                                {errorCancelarDia.general}
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

           {/** MODAL CAMBIAR PROFESOR */}
            {mostrarModalCambioProfesor && (
                <div className="modal-overlay">
                    <div className="modal-confirmacion">

                        <h3>Cambiar profesor</h3>
                        <p>
                            {capitalize(claseCambioProfesor?.actividad)}
                        </p>

                        <p>
                            {capitalize(claseCambioProfesor?.dia)} - {claseCambioProfesor?.horario?.slice(0, 5)} hs
                        </p>

                        {!modoCambioProfesor && (
                            <div className="modal-botones">
                                <button className="btn-cambio-t" 
                                        onClick={() => seleccionarModoCambio("temporal")}>
                                    Cambio temporal
                                </button>

                                <button className="btn-cambio-p" onClick={() => seleccionarModoCambio("permanente")}>
                                    Cambio permanente
                                </button>

                                <button className="btn-cancelar" onClick={() => {resetModalCambioProfesor();
                                    setMostrarModalCambioProfesor(false)}}>
                                    Cancelar
                                </button>
                            </div>
                        )}

                        {/* TEMPORAL */}
                        {modoCambioProfesor === "temporal" && (
                            <>
                                <div className="cancelar-dia-field">
                                    <label className="cancelar-dia-field-label">Fecha</label>

                                    <select
                                        value={fechaCambio}
                                        onChange={(e) => setFechaCambio(e.target.value)}
                                        className={`cancelar-dia-select ${erroresCambioProfesor ? "error" : ""}`}
                                    >
                                        <option value="">Seleccionar fecha</option>
                                        {fechasCambio.map(f => (
                                            <option key={f} value={f}>
                                                {formatearFecha(f)} ({capitalize(claseCambioProfesor?.dia)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {erroresCambioProfesor.fecha && (
                                    <p className="cancelar-dia-error-field">
                                        {erroresCambioProfesor.fecha}
                                    </p>
                                )}

                                <div className="cancelar-dia-field">
                                    <label className="cancelar-dia-field-label">Profesor</label>

                                    <select
                                        value={profesorSeleccionado}
                                        onChange={(e) => setProfesorSeleccionado(e.target.value)}
                                        className={`cancelar-dia-select ${erroresCambioProfesor ? "error" : ""}`}
                                    >
                                        <option value="">Seleccionar profesor</option>
                                        {profesores.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.email} ({p.nombre} {p.apellido})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {erroresCambioProfesor.profesor && (
                                    <p className="cancelar-dia-error-field">
                                        {erroresCambioProfesor.profesor}
                                    </p>
                                )}

                                <div className="cancelar-dia-field">
                                    <label className="cancelar-dia-field-label">Motivo</label>

                                    <textarea
                                        value={motivoCambio}
                                        onChange={(e) => setMotivoCambio(e.target.value)}
                                        className={`cancelar-dia-textarea ${erroresCambioProfesor ? "error" : ""}`}
                                    />
                                </div>

                                {erroresCambioProfesor.motivo && (
                                    <p className="cancelar-dia-error-field">
                                        {erroresCambioProfesor.motivo}
                                    </p>
                                )}
                                {erroresCambioProfesor.general && (
                                    <p className="cancelar-dia-error-field">
                                        {erroresCambioProfesor.general}
                                    </p>
                                )}
                                <div className="modal-botones">
                                    <button className="btn-cancelar" onClick={() => {resetModalCambioProfesor();
                                        setModoCambioProfesor(null)}}>
                                        Cancelar
                                    </button>
                                    
                                    <button className="btn-confirmar" onClick={confirmarCambioTemporal}>
                                        Confirmar
                                    </button>
                                </div>
                            </>
                        )}

                        {/* PERMANENTE */}
                        {modoCambioProfesor === "permanente" && (
                            <>
                                <div className="cancelar-dia-field">
                                    <label className="cancelar-dia-field-label">Profesor</label>

                                    <select
                                        value={profesorSeleccionado}
                                        onChange={(e) => setProfesorSeleccionado(e.target.value)}
                                        className={`cancelar-dia-select ${erroresCambioProfesor ? "error" : ""}`}
                                    >
                                        <option value="">Seleccionar profesor</option>
                                        {profesores.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.email} ({p.nombre} {p.apellido})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {erroresCambioProfesor.profesor && (
                                    <p className="cancelar-dia-error-field">
                                        {erroresCambioProfesor.profesor}
                                    </p>
                                )}

                                <div className="cancelar-dia-field">
                                    <label className="cancelar-dia-field-label">Motivo</label>

                                    <textarea
                                        value={motivoCambio}
                                        onChange={(e) => setMotivoCambio(e.target.value)}
                                        className={`cancelar-dia-textarea ${erroresCambioProfesor ? "error" : ""}`}
                                    />
                                </div>

                                {erroresCambioProfesor.motivo && (
                                    <p className="cancelar-dia-error-field">
                                        {erroresCambioProfesor.motivo}
                                    </p>
                                )}
                                {erroresCambioProfesor.general && (
                                    <p className="cancelar-dia-error-field">
                                        {erroresCambioProfesor.general}
                                    </p>
                                )}
                                <div className="modal-botones">
                                    <button className="btn-cancelar" onClick={() => {resetModalCambioProfesor(); setModoCambioProfesor(null)}}>
                                        Cancelar
                                    </button>
                                    
                                    <button className="btn-confirmar" onClick={confirmarCambioPermanente}>
                                        Confirmar
                                    </button>

                                    
                                </div>
                            </>
                        )}

                    </div>
                </div>
            )}

        </AdminLayout>
    );
}

export default ListaClasesAdmin;
import React, { useEffect, useState, useMemo, useRef } from "react";
import api from "../../api/api";
import "../../assets/css/ListaClasesAdmin.css";
import AdminLayout from "../../layouts/AdminLayout";
import QRProfesor from "../profesor/QRProfesor";
import toast from "react-hot-toast";

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

    const [mostrarConfirmacionCancelacion, setMostrarConfirmacionCancelacion] = useState(false);
    const [infoCancelacion, setInfoCancelacion] = useState(null);
    //Filtros

    const DISCIPLINAS  = ['Yoga', 'Pilates', 'Funcional'];
    const RANGOS_HORA  = [
        { label: 'Mañana',  desde: 0,  hasta: 12 },
        { label: 'Tarde',   desde: 12, hasta: 18 },
        { label: 'Noche',   desde: 18, hasta: 24 },
    ];
    const [filtroProfesor, setFiltroProfesor] = useState('');
    const [filtroHorario, setFiltroHorario] = useState([]);
    const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
    const [filtroDisc, setFiltroDisc] = useState([]);

    // ── NUEVO: refs y estado para la barra de scroll de arriba ──
    const contenedorRef = useRef(null);
    const scrollTopRef = useRef(null);
    const sincronizandoRef = useRef(false);
    const [anchoScroll, setAnchoScroll] = useState(0);

    const sincronizarDesdeArriba = () => {
        if (sincronizandoRef.current) return;
        if (contenedorRef.current && scrollTopRef.current) {
            sincronizandoRef.current = true;
            contenedorRef.current.scrollLeft = scrollTopRef.current.scrollLeft;
            sincronizandoRef.current = false;
        }
    };

    const sincronizarDesdeAbajo = () => {
        if (sincronizandoRef.current) return;
        if (contenedorRef.current && scrollTopRef.current) {
            sincronizandoRef.current = true;
            scrollTopRef.current.scrollLeft = contenedorRef.current.scrollLeft;
            sincronizandoRef.current = false;
        }
    };

    const toggleChip = (valor, lista, setLista) => {
        setLista(prev =>
            prev.includes(valor) ? prev.filter(v => v !== valor) : [...prev, valor]
        );
    };

    const limpiarFiltros = () => {
        setFiltroDisc([]);
        setFiltroProfesor('');
        setFiltroHorario([]);
    };

    const hayFiltrosActivos = filtroDisc.length > 0 || filtroProfesor || filtroHorario.length > 0;

    const aplicarFiltros = (clases) => {
        return clases.filter(c => {
            if (filtroDisc.length > 0 && !filtroDisc.map(d => d.toLowerCase()).includes(c.actividad?.toLowerCase()))
                return false;
            if (filtroProfesor && String(c.profesor_id) !== String(filtroProfesor))
                return false;
            if (filtroHorario.length > 0) {
                const hora = parseInt(c.horario?.split(':')[0] ?? 0, 10);
                const enRango = filtroHorario.some(label => {
                    const rango = RANGOS_HORA.find(r => r.label === label);
                    return rango && hora >= rango.desde && hora < rango.hasta;
                });
                if (!enRango) return false;
            }
            return true;
        });
    };
    
    const chipsActivos = [
        ...filtroDisc.map(d => ({ label: d, quitar: () => toggleChip(d, filtroDisc, setFiltroDisc) })),
        ...filtroHorario.map(h => ({ label: h, quitar: () => toggleChip(h, filtroHorario, setFiltroHorario) })),
        ...(filtroProfesor ? [{
            label: profesores.find(p => String(p.id) === String(filtroProfesor))
                ? `${profesores.find(p => String(p.id) === String(filtroProfesor)).nombre} ${profesores.find(p => String(p.id) === String(filtroProfesor)).apellido}`
                : 'Profesor',
            quitar: () => setFiltroProfesor('')
        }] : []),
    ];

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

    // ── NUEVO: recalcular el ancho de la barra falsa cuando cambian las clases/filtros
    // o cuando cambia el tamaño de la ventana ──
    useEffect(() => {
        const actualizarAncho = () => {
            if (contenedorRef.current) {
                setAnchoScroll(contenedorRef.current.scrollWidth);
            }
        };

        actualizarAncho();

        window.addEventListener("resize", actualizarAncho);
        return () => window.removeEventListener("resize", actualizarAncho);
    }, [clases, filtroProfesor, filtroDisc, filtroHorario]);

    const abrirCambioProfesor = (clase) => {
        setClaseCambioProfesor(clase);
        setMostrarModalCambioProfesor(true);

        setModoCambioProfesor("");
        setProfesorSeleccionado("");
        setFechaCambio("");
        setMotivoCambio("");
    };

    const seleccionarModoCambio = (modo) => {
        setModoCambioProfesor(modo);

        setProfesorSeleccionado("");
        setFechaCambio("");
        setMotivoCambio("");

        if (modo === "temporal") {
            const fechas = generarFechasPorDiaSemana(claseCambioProfesor.dia);
            setFechasCambio(fechas);
        }
    };

    const confirmarCambioTemporal = async () => {
        if (!profesorSeleccionado) {
            toast.error("Debe seleccionar un profesor");
            return;
        }

        if (!fechaCambio) {
            toast.error("Debe seleccionar una fecha");
            return;
        }

        if (motivoCambio.trim().length < 5) {
            toast.error("El motivo debe tener al menos 5 caracteres");
            return;
        }

        const ahora = new Date();

        if (fechaCambio) {
            const [anio, mes, dia] = fechaCambio.split("-").map(Number);
            const [hora, minuto] = claseCambioProfesor.horario.split(":").map(Number);

            const inicioClase = new Date(
                anio,
                mes - 1,
                dia,
                hora,
                minuto,
                0,
                0
            );

            inicioClase.setHours(Number(hora), Number(minuto), 0, 0);

            const limite = new Date(inicioClase);
            limite.setMinutes(limite.getMinutes() - 5); // o -10 si querés

            if (ahora > limite) {
                toast.error(
                    "Los cambios temporales deben realizarse al menos 5 minutos antes del inicio de la clase."
                );
                return;
            }
        }

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
            toast.success("Cambio temporal de profesor exitoso.");

        } catch (err) {
            toast.error(err.response?.data?.detail || "Error" );
        }
    };

    const confirmarCambioPermanente = async () => {
        if (!profesorSeleccionado) {
            toast.error("Debe seleccionar un profesor");
            return;
        }

        if (motivoCambio.trim().length < 5) {
            toast.error("El motivo debe tener al menos 5 caracteres");
            return;
        }

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

            toast.success("Cambio permanente de profesor exitoso.");

        } catch (err) {
            toast.error(err.response?.data?.detail || "Error");
        }
    };

    const resetModalCambioProfesor = () => {
        setModoCambioProfesor(null);
        setProfesorSeleccionado("");
        setFechaCambio("");
        setMotivoCambio("");

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
        hoy.setHours(0, 0, 0, 0); // Ignorar la hora para comparar solo fechas

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
            toast.error(
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

            toast.success("Eliminación completada");

            setMostrarConfirmacion(false);
            setClaseAEliminar(null);
            setInfoEliminacion(null);

        } catch (error) {
            toast.error(
                error.response?.data?.detail ||
                "Error eliminando clase"
            );
        }
    };

    const abrirModalCancelacion = async (clase) => {
        setClaseCancelarDia(clase);

        try {
            const res = await api.get(
                `/clases/cancelar-dia/${clase.id}/fechas`
            );

            setFechasDisponibles(res.data);

            setFechaCancelar("");
            setMotivoCancelar("");

            setMostrarModalCancelarDia(true);

        } catch (error) {
            console.error(error);
        }
    };

    const ejecutarCancelacion = async () => {

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
            setMostrarConfirmacionCancelacion(false);

            toast.success("Clase cancelada correctamente");

        } catch(error){

            toast.error(
                error.response?.data?.detail ||
                "Error cancelando clase"
            );
        }
    };

    const cancelarDiaClase = async () => {
        if (!fechaCancelar) {
            toast.error("Debe seleccionar una fecha");
            return;
        }

        if (motivoCancelar.trim().length < 5) {
            toast.error("El motivo debe tener al menos 5 caracteres");
            return;
        }

        try {

            const info = await api.get(
                `/clases/cancelar-dia/${claseCancelarDia.id}/info/${fechaCancelar}`
            );

            if (info.data.total > 0) {
                setInfoCancelacion(info.data);
                setMostrarConfirmacionCancelacion(true);
                return;
            }

            ejecutarCancelacion();

        } catch(error){
            toast.error("Error verificando reservas");
        }
    };

    const capitalize = (texto) =>
        texto
            ?.split(" ")
            .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
            .join(" ") || "";

    const formatearFecha = (fecha) => {
        const [anio, mes, dia] = fecha.split("-");
        return `${dia}/${mes}/${anio}`;
    };

    const clasesFiltradas = useMemo(() => {
        return aplicarFiltros(clases);
    }, [clases, filtroProfesor, filtroDisc, filtroHorario]);
    
    return (
        <AdminLayout>
            <div className="lista-page">
                <div className="lista-label">
                    Gestión
                </div>

                <h1 className="lista-titulo">
                    Clases existentes
                </h1>

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
{/* ── FILTROS ── */}
            <div className="filtros-container">
                <button
                    className={`filtros-toggle ${filtrosAbiertos ? 'filtros-toggle--open' : ''}`}
                    onClick={() => setFiltrosAbiertos(v => !v)}
                >
                    <span>Filtrar clases</span>
                    <span className="filtros-toggle-arrow">{filtrosAbiertos ? '▲' : '▼'}</span>
                    {hayFiltrosActivos && <span className="filtros-badge">{chipsActivos.length}</span>}
                </button>

                {chipsActivos.length > 0 && (
                    <div className="filtros-chips-activos">
                        {chipsActivos.map((chip, i) => (
                            <span key={i} className="filtro-chip-activo">
                                {chip.label}
                                <button onClick={chip.quitar} className="filtro-chip-x">×</button>
                            </span>
                        ))}
                        <button onClick={limpiarFiltros} className="filtros-limpiar">Limpiar todo</button>
                    </div>
                )}

                {filtrosAbiertos && (
                    <div className="filtros-panel">
                        <div className="filtros-grupo">
                            <span className="filtros-grupo-label">Disciplina</span>
                            <div className="filtros-chips">
                                {DISCIPLINAS.map(d => (
                                    <button
                                        key={d}
                                        className={`filtro-chip ${filtroDisc.includes(d) ? 'filtro-chip--activo' : ''}`}
                                        onClick={() => toggleChip(d, filtroDisc, setFiltroDisc)}
                                    >{d}</button>
                                ))}
                            </div>
                        </div>
                        <div className="filtros-grupo">
                            <span className="filtros-grupo-label">Horario</span>
                            <div className="filtros-chips">
                                {RANGOS_HORA.map(r => (
                                    <button
                                        key={r.label}
                                        className={`filtro-chip ${filtroHorario.includes(r.label) ? 'filtro-chip--activo' : ''}`}
                                        onClick={() => toggleChip(r.label, filtroHorario, setFiltroHorario)}
                                    >
                                        {r.label}
                                        <span className="filtro-chip-sub">
                                            {r.desde}:00 – {r.hasta === 24 ? '24:00' : `${r.hasta}:00`}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="filtros-grupo">
                            <span className="filtros-grupo-label">Profesor</span>
                            <select
                                className="filtros-select"
                                value={filtroProfesor}
                                onChange={e => setFiltroProfesor(e.target.value)}
                            >
                                <option value="">Todos los profesores</option>
                                {profesores.map(p => (
                                    <option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

                {clasesFiltradas.length === 0 ? (
                    <div className="lista-vacia">
                        <span className="lista-vacia-icon">📭</span>
                        <p>
                            {clases.length === 0
                                ? "No hay clases cargadas todavía."
                                : "No hay clases que coincidan con los filtros."}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* ── NUEVO: barra de scroll falsa, arriba del tablero ── */}
                        <div
                            className="scroll-top-fake"
                            ref={scrollTopRef}
                            onScroll={sincronizarDesdeArriba}
                        >
                            <div
                                className="scroll-top-fake-inner"
                                style={{ width: anchoScroll ? `${anchoScroll}px` : "100%" }}
                            />
                        </div>

                        <div
                            className="columnas-semana-container"
                            ref={contenedorRef}
                            onScroll={sincronizarDesdeAbajo}
                        >
                            {diasSemana.map((dia) => {
                                const clasesDelDia = clasesFiltradas
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
                                                                Prof. {capitalize(clase.profesor_nombre)} {capitalize(clase.profesor_apellido)}
                                                            </p>

                                                            <span className="clase-mini-badge">
                                                                Cupo: {clase.cupo}
                                                            </span>

                                                            {(clase.alumnos_membresia !== undefined || clase.alumnos_individual !== undefined) ? (
                                                                <div className="clase-mini-alumnos-desglose">
                                                                    <span className="clase-mini-alumnos-fila membresia">
                                                                        🟢 <strong>{clase.alumnos_membresia ?? 0}</strong> con membresía
                                                                    </span>
                                                                    <span className="clase-mini-alumnos-fila individual">
                                                                        🟠 <strong>{clase.alumnos_individual ?? 0}</strong> individual
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <p className="clase-mini-alumnos">
                                                                    👥 {clase.alumnos_inscriptos || 0} alumnos
                                                                </p>
                                                            )}
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
                    </>
                )}
            </div>

            {/* MODAL ELIMINAR */}
            {mostrarConfirmacion && (
                <div className="modal-overlay">
                    <div className="modal-confirmacion">

                        <h3>
                            ¿Seguro que querés eliminar esta clase?
                        </h3>

                        <div className="detalle-alumnos">
                            <p className="detalle-total">
                                <strong>{infoEliminacion.alumnos_afectados} </strong> alumno{infoEliminacion.alumnos_afectados !== 1 ? 's' : ''} se verá{infoEliminacion.alumnos_afectados !== 1 ? 'n' : ''} afectado{infoEliminacion.alumnos_afectados !== 1 ? 's' : ''}
                            </p>
                                    
                            <div className="detalle-alumnos-grupos">
                                {infoEliminacion.socios_membresia > 0 && (
                                    <div className="detalle-grupo detalle-grupo--membresia">
                                        <span className="detalle-grupo-icon">🟢</span>
                                        <span className="detalle-grupo-texto">
                                            <strong>{infoEliminacion.socios_membresia}</strong> con membresía
                                        </span>
                                    </div>
                                )}
                        
                                {infoEliminacion.socios_individual > 0 && (
                                    <div className="detalle-grupo detalle-grupo--individual">
                                        <span className="detalle-grupo-icon">🟠</span>
                                        <span className="detalle-grupo-texto">
                                            <strong>{infoEliminacion.socios_individual}</strong> con reserva individual
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
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
                                }}
                                className="cancelar-dia-select"
                            >
                                <option value="">Seleccionar fecha</option>
                                {fechasDisponibles.map((fecha) => (
                                    <option key={fecha} value={fecha}>
                                        {formatearFecha(fecha)} ({capitalize(claseCancelarDia?.dia)})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="cancelar-dia-field">
                            <label className="cancelar-dia-field-label">Motivo</label>

                            <textarea
                                value={motivoCancelar}
                                onChange={(e) => {
                                    setMotivoCancelar(e.target.value);
                                }}
                                className="cancelar-dia-textarea"
                            />
                        </div>

                        <div className="modal-botones">
                            <button
                                className="btn-cancelar"
                                onClick={() =>
                                    setMostrarModalCancelarDia(false)
                                }
                            >
                                Cancelar
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
            {mostrarConfirmacionCancelacion && (
                <div className="modal-overlay">

                    <div className="modal-confirmacion">

                        <h3>
                            ¿Confirmar cancelación?
                        </h3>

                        <p>
                            Vas a cancelar la clase del día:
                        </p>

                        <strong>
                            {formatearFecha(fechaCancelar)}
                        </strong>

                        <div className="detalle-alumnos">

                            <p>
                                <strong>
                                   👥 Alumnos afectados: {infoCancelacion.total}
                                </strong>
                            </p>

                            <p>
                                <strong>
                                    🟢 Membresía: {infoCancelacion.membresia}
                                </strong>
                            </p>

                            <p>
                                <strong>
                                    🟠 Individual: {infoCancelacion.individuales}
                                </strong>
                            </p>

                        </div>


                        <div className="modal-botones">

                            <button
                                className="btn-cancelar"
                                onClick={() => {
                                    setMostrarConfirmacionCancelacion(false);
                                    setMostrarModalCancelarDia(false);
                                    setInfoCancelacion(null);
                                    setFechaCancelar("");
                                    setMotivoCancelar("");
                                }}
                            >
                                Volver
                            </button>


                            <button
                                className="btn-eliminar"
                                onClick={ejecutarCancelacion}
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
                                        className="cancelar-dia-select"
                                    >
                                        <option value="">Seleccionar fecha</option>
                                        {fechasCambio.map(f => (
                                            <option key={f} value={f}>
                                                {formatearFecha(f)} ({capitalize(claseCambioProfesor?.dia)})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="cancelar-dia-field">
                                    <label className="cancelar-dia-field-label">Profesor</label>

                                    <select
                                        value={profesorSeleccionado}
                                        onChange={(e) => setProfesorSeleccionado(e.target.value)}
                                        className="cancelar-dia-select"
                                    >
                                        <option value="">Seleccionar profesor</option>
                                        {profesores.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.email} ({capitalize(p.nombre + " " + p.apellido)})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="cancelar-dia-field">
                                    <label className="cancelar-dia-field-label">Motivo</label>

                                    <textarea
                                        value={motivoCambio}
                                        onChange={(e) => setMotivoCambio(e.target.value)}
                                        className="cancelar-dia-textarea"
                                    />
                                </div>

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
                                        className="cancelar-dia-select"
                                    >
                                        <option value="">Seleccionar profesor</option>
                                        {profesores.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.email} ({capitalize(p.nombre + " " + p.apellido)})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="cancelar-dia-field">
                                    <label className="cancelar-dia-field-label">Motivo</label>

                                    <textarea
                                        value={motivoCambio}
                                        onChange={(e) => setMotivoCambio(e.target.value)}
                                        className="cancelar-dia-textarea"
                                    />
                                </div>

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
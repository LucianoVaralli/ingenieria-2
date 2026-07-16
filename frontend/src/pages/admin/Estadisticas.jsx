import React, { useState, useMemo, useRef, useEffect } from "react";
import api from "../../api/api";
import AdminLayout from "../../layouts/AdminLayout";
import "../../assets/css/Estadisticas.css";
import {
    BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const dias = [
    { label: "Lunes",     value: "lunes"     },
    { label: "Martes",    value: "martes"    },
    { label: "Miércoles", value: "miercoles" },
    { label: "Jueves",    value: "jueves"    },
    { label: "Viernes",   value: "viernes"   },
    { label: "Sábado",    value: "sabado"    },
    { label: "Domingo",   value: "domingo"   },
];

const actividades = [
    { label: "Yoga",      value: "yoga"      },
    { label: "Funcional", value: "funcional" },
    { label: "Pilates",   value: "pilates"   },
];

const TIPOS_ESTADISTICA = [
    { value: "reservas_actividad", label: "Actividad con más reservas" },
    { value: "ingresos_actividad", label: "Actividad con más ingresos" },
    { value: "dia_concurrido",     label: "Día de la semana más concurrido" },
    { value: "hora_concurrida",    label: "Hora más concurrida" },
];

const COLORES = ["#5CB84D", "#4A90D9", "#E8A33D", "#D9534F", "#9B59B6", "#1ABC9C"];

// ── Habilitación de campos por tipo de estadística ──
// día/hora concurrida quedan totalmente bloqueados: se calculan sobre TODA la base, sin filtros.
const CAMPOS_HABILITADOS = {
    reservas_actividad: { dias: true,  hora: true,  fecha: true,  actividad: false },
    ingresos_actividad: { dias: true,  hora: true,  fecha: true,  actividad: false },
    dia_concurrido:     { dias: false, hora: false, fecha: false, actividad: false },
    hora_concurrida:    { dias: false, hora: false, fecha: false, actividad: false },
};

// ── Helpers de fecha ──
const formatearFechaISO = (fecha) => {
    const yyyy = fecha.getFullYear();
    const mm   = String(fecha.getMonth() + 1).padStart(2, "0");
    const dd   = String(fecha.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
};
const primerDiaMesActual    = () => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth(), 1); };
const ultimoDiaMesSiguiente = () => { const h = new Date(); return new Date(h.getFullYear(), h.getMonth() + 2, 0); };

const DIA_JS_A_VALUE = { 0: "domingo", 1: "lunes", 2: "martes", 3: "miercoles", 4: "jueves", 5: "viernes", 6: "sabado" };

/** Devuelve el set de días de semana ('lunes', 'martes', ...) que caen dentro de [desde, hasta] inclusive. */
const diasDentroDeRango = (desdeISO, hastaISO) => {
    if (!desdeISO || !hastaISO) return null; // null = sin restricción (rango no definido o >= 7 días se calcula afuera)
    const desde = new Date(desdeISO + "T00:00:00");
    const hasta = new Date(hastaISO + "T00:00:00");
    if (hasta < desde) return new Set();

    const diffMs   = hasta - desde;
    const diffDias = diffMs / (1000 * 60 * 60 * 24);
    if (diffDias >= 6) return null; // rango de una semana o más: todos los días son válidos, sin restricción

    const set = new Set();
    const cursor = new Date(desde);
    while (cursor <= hasta) {
        set.add(DIA_JS_A_VALUE[cursor.getDay()]);
        cursor.setDate(cursor.getDate() + 1);
    }
    return set;
};

/** Dropdown tipo combobox con checkboxes adentro — mismo look que un <select>, pero multi. */
function MultiSelectDropdown({ label, opciones, seleccionados, onChange, disabled, deshabilitarValor, placeholderTodos }) {
    const [abierto, setAbierto] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClickFuera = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setAbierto(false);
        };
        document.addEventListener("mousedown", handleClickFuera);
        return () => document.removeEventListener("mousedown", handleClickFuera);
    }, []);

    const toggleValor = (valor) => {
        if (seleccionados.includes(valor)) {
            onChange(seleccionados.filter(v => v !== valor));
        } else {
            onChange([...seleccionados, valor]);
        }
    };

    const textoBoton = seleccionados.length === 0
        ? placeholderTodos
        : seleccionados.length === 1
            ? opciones.find(o => o.value === seleccionados[0])?.label
            : `${seleccionados.length} seleccionados`;

    return (
        <div className="crear-clase-field" ref={ref} style={{ position: "relative" }}>
            <label className="crear-clase-field-label">{label}</label>
            <button
                type="button"
                className="crear-clase-select"
                style={{ textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: disabled ? "not-allowed" : "pointer" }}
                onClick={() => !disabled && setAbierto(v => !v)}
                disabled={disabled}
            >
                <span>{textoBoton}</span>
                <span style={{ marginLeft: "0.5rem" }}>{abierto ? "▲" : "▼"}</span>
            </button>

            {abierto && !disabled && (
                <div
                    style={{
                        position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20,
                        background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px",
                        marginTop: "4px", maxHeight: "220px", overflowY: "auto", padding: "0.4rem 0"
                    }}
                >
                    <label
                        style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.8rem", cursor: "pointer" }}
                    >
                        <input
                            type="checkbox"
                            checked={seleccionados.length === 0}
                            onChange={() => onChange([])}
                        />
                        {placeholderTodos}
                    </label>
                    {opciones.map(op => {
                        const opDeshabilitada = deshabilitarValor ? deshabilitarValor(op.value) : false;
                        return (
                            <label
                                key={op.value}
                                style={{
                                    display: "flex", alignItems: "center", gap: "0.5rem",
                                    padding: "0.4rem 0.8rem",
                                    cursor: opDeshabilitada ? "not-allowed" : "pointer",
                                    opacity: opDeshabilitada ? 0.4 : 1
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={seleccionados.includes(op.value)}
                                    disabled={opDeshabilitada}
                                    onChange={() => toggleValor(op.value)}
                                />
                                {op.label}
                            </label>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function Estadisticas() {
    // Filtros "en edición" (lo que el usuario está tocando, no aplicado todavía)
    const [diaSemana, setDiaSemana]     = useState([]);
    const [horaDesde, setHoraDesde]     = useState("");
    const [horaHasta, setHoraHasta]     = useState("");
    const [fechaDesde, setFechaDesde]   = useState("");
    const [fechaHasta, setFechaHasta]   = useState("");
    const [actividad, setActividad]     = useState([]);
    const [tipoEstadistica, setTipoEstadistica] = useState("");

    const [datos, setDatos]         = useState([]);
    const [cargando, setCargando]   = useState(false);
    const [error, setError]         = useState("");
    const [yaConsulte, setYaConsulte] = useState(false);
    const campos = CAMPOS_HABILITADOS[tipoEstadistica] || { dias: false, hora: false, fecha: false, actividad: false };
    const usaFiltrosFecha = campos.fecha;

    const limiteDesde    = useMemo(() => primerDiaMesActual(), []);
    const limiteHasta    = useMemo(() => ultimoDiaMesSiguiente(), []);
    const limiteDesdeISO = formatearFechaISO(limiteDesde);
    const limiteHastaISO = formatearFechaISO(limiteHasta);

    // Si el rango de fechas elegido es < 1 semana, restringe qué días son seleccionables
    const diasPermitidosPorRango = useMemo(
        () => diasDentroDeRango(fechaDesde, fechaHasta),
        [fechaDesde, fechaHasta]
    );

    const diaEstaDeshabilitadoPorRango = (valorDia) => {
        if (!campos.dias) return false;
        if (!diasPermitidosPorRango) return false; // sin restricción (rango >= semana o no definido)
        return !diasPermitidosPorRango.has(valorDia);
    };

    // Si cambia el rango y algún día seleccionado quedó fuera del rango permitido, lo sacamos
    useEffect(() => {
        if (!campos.dias || !diasPermitidosPorRango) return;
        setDiaSemana(prev => prev.filter(d => diasPermitidosPorRango.has(d)));
    }, [diasPermitidosPorRango, campos.dias]);

    const validarFechas = (desde, hasta) => {
        if (!campos.fecha) return true;
        if (!desde && !hasta) return true;

        const fDesde = desde ? new Date(desde + "T00:00:00") : null;
        const fHasta = hasta ? new Date(hasta + "T00:00:00") : null;

        if (fDesde && (fDesde < limiteDesde || fDesde > limiteHasta)) return false;
        if (fHasta && (fHasta < limiteDesde || fHasta > limiteHasta)) return false;
        if (fDesde && fHasta && fDesde > fHasta) return false;

        return true;
    };

    const construirParams = (tipo) => {
        const c = CAMPOS_HABILITADOS[tipo];
        const params = {};

        if (c.fecha) {
            params.fecha_desde = fechaDesde || limiteDesdeISO;
            params.fecha_hasta = fechaHasta || limiteHastaISO;
        }
        if (c.hora) {
            if (horaDesde) params.hora_desde = horaDesde;
            if (horaHasta) params.hora_hasta = horaHasta;
        }
        if (c.dias && diaSemana.length > 0) {
            params.dias = diaSemana.join(",");
        }
        if (c.actividad && actividad.length > 0) {
            params.actividades = actividad.join(",");
        }

        return params;
    };

    const consultarEstadistica = async (tipo) => {
        setDatos([]);
        setError("");
        setYaConsulte(false);

        if (CAMPOS_HABILITADOS[tipo].fecha && !validarFechas(fechaDesde, fechaHasta)) {
            setError("Se debe seleccionar una fecha del mes actual o siguiente.");
            setDatos([]);
            return;
        }

        setCargando(true);
        setDatos([]);

        try {
            let url = "";
            if (tipo === "reservas_actividad") url = "/estadisticas/reservas-por-actividad";
            else if (tipo === "ingresos_actividad") url = "/estadisticas/ingresos-por-actividad";
            else if (tipo === "dia_concurrido") url = "/estadisticas/dia-mas-concurrido";
            else if (tipo === "hora_concurrida") url = "/estadisticas/hora-mas-concurrida";

            const params = construirParams(tipo);
            const res = await api.get(url, { params });
            setDatos(res.data);
            setYaConsulte(true);
        } catch (err) {
            setError(err.response?.data?.detail || "Error al obtener estadísticas");
        } finally {
            setCargando(false);
        }
    };

    const handleSeleccionarTipo = (e) => {
        const tipo = e.target.value;
        setTipoEstadistica(tipo);
        setError("");
        setDatos([]);

        const nuevosCampos = CAMPOS_HABILITADOS[tipo] || {};
        if (!nuevosCampos.dias) setDiaSemana([]);
        if (!nuevosCampos.actividad) setActividad([]);
        if (!nuevosCampos.hora) { setHoraDesde(""); setHoraHasta(""); }
        if (!nuevosCampos.fecha) { setFechaDesde(""); setFechaHasta(""); }

        // Para día/hora concurrida no hay filtros que aplicar: consulta directa al elegir el tipo.
        if (tipo === "dia_concurrido" || tipo === "hora_concurrida") {
            consultarEstadistica(tipo);
        } else {
            // Para los demás tipos, esperamos a que el usuario presione "Aplicar filtros"
            setDatos([]);
        }
    };

    const handleAplicarFiltros = () => {
        if (tipoEstadistica) {
            consultarEstadistica(tipoEstadistica);
        }
    };

    const renderGrafico = () => {
        if (!tipoEstadistica) {
            return (
                <p className="profesores-vacio-txt">
                    Seleccioná un tipo de estadística para ver el gráfico.
                </p>
            );
        }

        const necesitaAplicar = (tipoEstadistica === "reservas_actividad" || tipoEstadistica === "ingresos_actividad")
            && !yaConsulte && !cargando && !error;

        if (cargando) return <p>Cargando datos...</p>;
        if (error) return <p className="lista-error-backend">{error}</p>;
        if (necesitaAplicar) {
            return (
                <p className="profesores-vacio-txt">
                    Configurá los filtros y presioná "Aplicar filtros" para ver el gráfico.
                </p>
            );
        }
        if (yaConsulte && datos.length === 0) return <p className="profesores-vacio-txt">No hay datos para mostrar con los filtros seleccionados.</p>;
        if (!yaConsulte) return null;

        if (tipoEstadistica === "reservas_actividad" || tipoEstadistica === "ingresos_actividad") {
            const dataKey = tipoEstadistica === "reservas_actividad" ? "cantidad" : "monto";
            return (
                <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                        <Pie
                            data={datos}
                            dataKey={dataKey}
                            nameKey="actividad"
                            cx="50%"
                            cy="50%"
                            outerRadius={140}
                            label={(entry) => `${entry.actividad}: ${entry[dataKey]}`}
                        >
                            {datos.map((_, index) => (
                                <Cell key={index} fill={COLORES[index % COLORES.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            );
        }

        const dataKey = tipoEstadistica === "dia_concurrido" ? "dia" : "hora";
        return (
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={datos}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={dataKey} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="asistencias" fill="#5CB84D" name="Asistencias" />
                </BarChart>
            </ResponsiveContainer>
        );
    };

    return (
        <AdminLayout>
            <div className="admin-page">
                <div className="admin-section-label">Gestión</div>
                <h1 className="admin-section-title">Estadísticas</h1>

                <div style={{ display: "flex", gap: "2rem", marginTop: "2rem", flexWrap: "wrap" }}>

                    {/* COLUMNA IZQUIERDA — FILTROS */}
                    <div style={{ flex: "1", minWidth: "280px" }}>

                        <div className="crear-clase-row">
                            <MultiSelectDropdown
                                label="Día de la semana"
                                opciones={dias}
                                seleccionados={diaSemana}
                                onChange={setDiaSemana}
                                disabled={!campos.dias}
                                deshabilitarValor={diaEstaDeshabilitadoPorRango}
                                placeholderTodos="Todos los días"
                            />

                            <div className="crear-clase-field">
                                <label className="crear-clase-field-label">Hora desde</label>
                                <input
                                    type="time"
                                    className="crear-clase-input"
                                    value={horaDesde}
                                    onChange={(e) => setHoraDesde(e.target.value)}
                                    disabled={!campos.hora}
                                />
                            </div>
                        </div>

                        <div className="crear-clase-row">
                            <div className="crear-clase-field">
                                <label className="crear-clase-field-label">Hora hasta</label>
                                <input
                                    type="time"
                                    className="crear-clase-input"
                                    value={horaHasta}
                                    onChange={(e) => setHoraHasta(e.target.value)}
                                    disabled={!campos.hora}
                                />
                            </div>

                            <div className="crear-clase-field">
                                <label className="crear-clase-field-label">Fecha desde</label>
                                <input
                                    type="date"
                                    className="crear-clase-input"
                                    value={fechaDesde}
                                    min={limiteDesdeISO}
                                    max={limiteHastaISO}
                                    onChange={(e) => setFechaDesde(e.target.value)}
                                    disabled={!usaFiltrosFecha}
                                />
                            </div>
                        </div>

                        <div className="crear-clase-row">
                            <div className="crear-clase-field">
                                <label className="crear-clase-field-label">Fecha hasta</label>
                                <input
                                    type="date"
                                    className="crear-clase-input"
                                    value={fechaHasta}
                                    min={limiteDesdeISO}
                                    max={limiteHastaISO}
                                    onChange={(e) => setFechaHasta(e.target.value)}
                                    disabled={!usaFiltrosFecha}
                                />
                            </div>

                            <MultiSelectDropdown
                                label="Actividad"
                                opciones={actividades}
                                seleccionados={actividad}
                                onChange={setActividad}
                                disabled={!campos.actividad}
                                placeholderTodos="Todas las actividades"
                            />
                        </div>

                        <div className="crear-clase-row">
                            <div className="crear-clase-field">
                                <label className="crear-clase-field-label">Tipo de estadística</label>
                                <select
                                    className="crear-clase-select"
                                    value={tipoEstadistica}
                                    onChange={handleSeleccionarTipo}
                                >
                                    <option value="">Seleccione tipo</option>
                                    {TIPOS_ESTADISTICA.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {usaFiltrosFecha && (
                            <p style={{ fontSize: "0.8rem", color: "#888" }}>
                                Solo se permiten fechas entre {limiteDesdeISO} y {limiteHastaISO} (mes actual y siguiente).
                            </p>
                        )}

                        {(campos.dias || campos.hora || campos.fecha || campos.actividad) && (
                            <button className="crear-clase-btn" onClick={handleAplicarFiltros} style={{ marginTop: "1rem" }}>
                                Aplicar filtros
                            </button>
                        )}

                    </div>

                    {/* COLUMNA DERECHA — GRÁFICO */}
                    <div style={{ flex: "2", minWidth: "320px" }} className="crear-clase-card">
                        {renderGrafico()}
                    </div>

                </div>
            </div>
        </AdminLayout>
    );
}

export default Estadisticas;

import React, { useEffect, useState } from "react";
import api from "../../api/api";
import "../../assets/css/EditarCapacidad.css";
import AdminLayout from "../../layouts/AdminLayout";

function EditarCapacidad() {
    const [capacidadTotal,      setCapacidadTotal]      = useState(0);
    const [nuevaCapacidad,      setNuevaCapacidad]      = useState("");
    const [errorBackend,        setErrorBackend]        = useState("");
    const [mensajeExito,        setMensajeExito]        = useState("");
    const [dropdownAbierto, setDropdownAbierto] = useState(false);
    const [ocupacionHoras, setocupacionHoras] = useState([]);

    // Estado para guardar el pico máximo de concurrencia por cada día
    const [picosPorDia, setPicosPorDia] = useState({
        Lunes: { max: 0, hora: null },
        Martes: { max: 0, hora: null },
        Miercoles: { max: 0, hora: null },
        Jueves: { max: 0, hora: null },
        Viernes: { max: 0, hora: null },
        Sabado: { max: 0, hora: null },
        Domingo: { max: 0, hora: null }
    });
    const [diaSeleccionado, setDiaSeleccionado] = useState("Lunes");

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        try {
            const resGimnasio = await api.get("/gimnasio/");
            setCapacidadTotal(resGimnasio.data.capacidad_total);

            // Seteamos directamente los picos exactos que calculó el backend
            setPicosPorDia(resGimnasio.data.picos_por_dia);
        } catch (error) {
            console.error("Error cargando datos del gimnasio:", error);
        }
    };

    useEffect(() => {
        if (!diaSeleccionado) return;

        api.get(`/clases/ocupacion/${diaSeleccionado}`)
            .then(res => setocupacionHoras(res.data));
    }, [diaSeleccionado]);


    const getEstadoDia = (pico, total) => {
        const porcentaje = total > 0 ? (pico / total) * 100 : 0;

        if (porcentaje >= 90) return "CRITICO";
        if (porcentaje >= 60) return "ALTO";
        if (porcentaje > 0) return "MEDIO";
        return "LIBRE";
    };

    const actualizarCapacidad = async (e) => {
        e.preventDefault();
        if (Number(nuevaCapacidad) <= 0) {
            setErrorBackend("La capacidad debe ser mayor a 0");
            return;
        }
        try {
            const res = await api.put("/gimnasio/capacidad", { capacidad_total: Number(nuevaCapacidad) });
            setMensajeExito(res.data.mensaje);
            setTimeout(() => setMensajeExito(""), 3000);
            setCapacidadTotal(res.data.capacidad_total);
            setNuevaCapacidad("");
            // Recargamos datos para actualizar cualquier lógica visual
            cargarDatos();
        } catch (error) {
            setErrorBackend(error.response?.data?.detail || "Error actualizando capacidad");
        }
    };

    const picoData = picosPorDia?.[diaSeleccionado] ?? { max: 0, hora: null };
    const pico = picoData.max;
    const horaPico = picoData.hora;

    const porcentaje =capacidadTotal > 0 ? (pico / capacidadTotal) * 100 : 0;
    
    let estadoColor = "dia-vacio";
    if (porcentaje >= 90) estadoColor = "dia-peligro";
    else if (porcentaje > 50) estadoColor = "dia-advertencia";
    else if (pico > 0) estadoColor = "dia-ok";

    return (
        <AdminLayout>
            <div className="capacidad-page">

                <div className="capacidad-label">
                    Gestión
                </div>
                
                <h1 className="capacidad-titulo">
                    Capacidad del Gimnasio
                </h1>

                <div className="capacidad-stats">
                    <div className="capacidad-stat">
                        <div className="capacidad-stat-label">Capacidad Total</div>
                        <div className="capacidad-stat-value">{capacidadTotal}</div>
                    </div>
                </div>

                {/* SECCIÓN OCUPACIÓN */}
                <div className="capacidad-dias-section">
                    <h2 className="seccion-subtitulo">
                        Ocupación Máxima Simultánea Por Día
                    </h2>

                    {/* TARJETA DEL DÍA SELECCIONADO */}
                    <div className={`dia-cuadradito ${estadoColor}`}>

                        {/* HEADER CLICKEABLE (esto abre el dropdown) */}
                        <div
                            className="dia-nombre clickable"
                            onClick={() => setDropdownAbierto(!dropdownAbierto)}
                            style={{ cursor: "pointer" }}
                        >
                            {diaSeleccionado}
                        </div>

                        {/* DROPDOWN DENTRO DE LA TARJETA */}
                        {dropdownAbierto && (
                            <div className="dropdown-in-card">
                                {Object.keys(picosPorDia).map((dia) => (
                                    <div
                                        key={dia}
                                        className="dropdown-item"
                                        onClick={() => {
                                            setDiaSeleccionado(dia);
                                            setDropdownAbierto(false);
                                        }}
                                    >
                                        {dia}
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* CONTENIDO NORMAL DE LA TARJETA, PARA MI SE BORRA PERO LO DEJO POR LAS DUDAS
                        <div className="dia-pico-contenedor">
                            <span className="dia-pico-valor">{pico}</span>
                            <span className="dia-pico-max">/ {capacidadTotal}</span>
                        </div>
                        <div className="dia-progreso-bar">
                            <div
                                className="dia-progreso-llenado"
                                style={{ width: `${Math.min(porcentaje, 100)}%` }}
                            />
                        </div> */}
                    </div>
                    <div className="ocupacion-horas">
                            {ocupacionHoras.map((hora) => (
                                <div key={hora.hora} className="hora-row">

                                    <span className="hora-label">
                                        {hora.hora}
                                    </span>

                                    <div className="barra-container">
                                        <div
                                            className="barra-ocupacion"
                                            style={{
                                                width: `${hora.capacidad ? (hora.ocupacion / hora.capacidad) * 100 : 0}%`
                                            }}
                                        />
                                    </div>

                                    <span className="hora-cupo">
                                        {hora.ocupacion}/{hora.capacidad}
                                    </span>

                                </div>
                            ))}
                        </div>
                </div>

                {/* FORMULARIO */}
                <div className="capacidad-card">
                    <h2>Actualizar Capacidad</h2>

                    {mensajeExito && <p className="capacidad-exito">{mensajeExito}</p>}
                    {errorBackend && <p className="capacidad-error">{errorBackend}</p>}

                    <form onSubmit={actualizarCapacidad}>
                        <input
                            type="number"
                            placeholder="Nueva capacidad total"
                            value={nuevaCapacidad}
                            className="capacidad-input"
                            onChange={(e) => {
                                setNuevaCapacidad(e.target.value);
                                setErrorBackend("");
                                setMensajeExito("");
                            }}
                        />

                        <button type="submit" className="capacidad-btn">
                            Actualizar
                        </button>
                    </form>
                </div>

            </div>
        </AdminLayout>
    );
}

export default EditarCapacidad;
import React, { useEffect, useState } from "react";
import api from "../../api/api";
import "../../assets/css/EditarCapacidad.css";
import AdminLayout from "../../layouts/AdminLayout";

function EditarCapacidad() {
    const [capacidadTotal,      setCapacidadTotal]      = useState(0);
    const [capacidadDisponible, setCapacidadDisponible] = useState(0);
    const [nuevaCapacidad,      setNuevaCapacidad]      = useState("");
    const [errorBackend,        setErrorBackend]        = useState("");
    const [mensajeExito,        setMensajeExito]        = useState("");
    
    // Estado para guardar el pico máximo de concurrencia por cada día
    const [picosPorDia, setPicosPorDia] = useState({
        Lunes: 0, Martes: 0, Miercoles: 0, Jueves: 0, Viernes: 0, Sabado: 0, Domingo: 0
    });

    useEffect(() => { cargarDatos(); }, []);

    const cargarDatos = async () => {
        try {
            const resGimnasio = await api.get("/gimnasio/");
            setCapacidadTotal(resGimnasio.data.capacidad_total);
            setCapacidadDisponible(resGimnasio.data.capacidad_disponible);
            
            // Seteamos directamente los picos exactos que calculó el backend
            setPicosPorDia(resGimnasio.data.picos_por_dia);
        } catch (error) {
            console.error("Error cargando datos del gimnasio:", error);
        }
    };

    // Función mágica para calcular la superposición horaria en el Frontend
    const calcularPicosPorDia = (clases) => {
        const diasSemana = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
        const picosCalculados = { Lunes: 0, Martes: 0, Miercoles: 0, Jueves: 0, Viernes: 0, Sabado: 0, Domingo: 0 };

        diasSemana.forEach((dia) => {
            const clasesDelDia = clases.filter(c => {
                const diaClase = (c.dia?.value || c.dia || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const diaObjetivo = dia.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return diaClase === diaObjetivo;
            });

            // Lógica de "Barrido" para encontrar el pico real de simultaneidad
            let eventos = [];
            clasesDelDia.forEach(c => {
                if (!c.horario || !c.duracion) return;
                
                // Convertir horario "HH:MM:SS" a minutos
                const [h, m] = c.horario.split(':').map(Number);
                const inicio = (h * 60) + m;
                const fin = inicio + c.duracion;

                eventos.push({ tiempo: inicio, tipo: 1, cupo: c.cupo });
                eventos.push({ tiempo: fin, tipo: -1, cupo: c.cupo });
            });

            eventos.sort((a, b) => a.tiempo - b.tiempo || a.tipo - b.tipo);

            let maximo = 0;
            let actual = 0;
            eventos.forEach(ev => {
                actual += (ev.tipo * ev.cupo);
                if (actual > maximo) maximo = actual;
            });

            picosCalculados[dia] = maximo;
        });

        setPicosPorDia(picosCalculados);
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
            setCapacidadDisponible(res.data.capacidad_disponible);
            setNuevaCapacidad("");
            // Recargamos datos para actualizar cualquier lógica visual
            cargarDatos();
        } catch (error) {
            setErrorBackend(error.response?.data?.detail || "Error actualizando capacidad");
        }
    };

    return (
        <AdminLayout>
            <div className="capacidad-page">

                <div className="capacidad-header">
                    <div className="capacidad-label">Gestión</div>
                    <h1 className="capacidad-titulo">Capacidad del Gimnasio</h1>
                </div>

                <div className="capacidad-stats">
                    <div className="capacidad-stat">
                        <div className="capacidad-stat-label">Capacidad Total</div>
                        <div className="capacidad-stat-value">{capacidadTotal}</div>
                    </div>
                    <div className="capacidad-stat">
                        <div className="capacidad-stat-label">Disponible</div>
                        <div className="capacidad-stat-value">{capacidadDisponible}</div>
                    </div>
                </div>

                {/* NUEVA SECCIÓN DE CUADRADITOS VISUALES */}
                <div className="capacidad-dias-section">
                    <h2 className="seccion-subtitulo">Ocupación Máxima Simultánea por Día</h2>
                    <div className="capacidad-dias-grid">
                        {Object.keys(picosPorDia).map((dia) => {
                            const pico = picosPorDia[dia];
                            // Calculamos el porcentaje para pintar el cuadradito según qué tan lleno esté
                            const porcentaje = capacidadTotal > 0 ? (pico / capacidadTotal) * 100 : 0;
                            
                            let estadoColor = "dia-vacio";
                            if (porcentaje >= 90) estadoColor = "dia-peligro"; // Casi lleno o lleno
                            else if (porcentaje > 50) estadoColor = "dia-advertencia"; // Mitad de capacidad
                            else if (pico > 0) estadoColor = "dia-ok"; // Con clases pero tranqui

                            return (
                                <div key={dia} className={`dia-cuadradito ${estadoColor}`}>
                                    <div className="dia-nombre">{dia}</div>
                                    <div className="dia-pico-contenedor">
                                        <span className="dia-pico-valor">{pico}</span>
                                        <span className="dia-pico-max">/ {capacidadTotal}</span>
                                    </div>
                                    <div className="dia-progreso-bar">
                                        <div 
                                            className="dia-progreso-llenado" 
                                            style={{ width: `${Math.min(porcentaje, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

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
                        <button type="submit" className="capacidad-btn">Actualizar</button>
                    </form>
                </div>

            </div>
        </AdminLayout>
    );
}

export default EditarCapacidad;
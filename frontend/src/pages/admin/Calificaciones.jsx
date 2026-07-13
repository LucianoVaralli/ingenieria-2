import React, { useEffect, useState } from "react";
import api from "../../api/api";
import "../../assets/css/Calificacion.css";
import AdminLayout from "../../layouts/AdminLayout";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";


const AdminCalificaciones = () => {
    const [ranking, setRanking] = useState([]);
    const [comentarios, setComentarios] = useState([]);
    const [mostrarRankingCompleto, setMostrarRankingCompleto] = useState(false);
    const [actividadFiltro, setActividadFiltro] = useState("Todas");
    const [profesorFiltro, setProfesorFiltro] = useState("Todos");
    const [textoBusqueda, setTextoBusqueda] = useState("");
    const [mostrarComentarios, setMostrarComentarios] = useState(false);
    const [satisfaccion, setSatisfaccion] = useState({
        promedio: 0,
        total: 0,
        estrellas: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    });

    const actividades = [
        "Todas",
        ...new Set(comentarios.map(c => c.actividad))
    ];

    const profesores = [
        "Todos",
        ...new Set(comentarios.map(c => c.profesor))
    ];

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            const [rankingRes, comentariosRes, satisfaccionRes] = await Promise.all([
                api.get("/calificaciones/ranking-profesores"),
                api.get("/calificaciones/comentarios"),
                api.get("/calificaciones/satisfaccion")
            ]);
            setRanking(rankingRes.data);
            setComentarios(comentariosRes.data);
            setSatisfaccion(satisfaccionRes.data);
        } catch (error) {
            console.error(error);
        }
    };

    const comentariosFiltrados = comentarios.filter((c) => {

        const coincideActividad =
            actividadFiltro === "Todas" ||
            c.actividad === actividadFiltro;

        const coincideProfesor =
            profesorFiltro === "Todos" ||
            c.profesor === profesorFiltro;

        const coincideBusqueda =
            c.comentario
                ?.toLowerCase()
                .includes(textoBusqueda.toLowerCase());

        return (
            coincideActividad &&
            coincideProfesor &&
            coincideBusqueda
        );

    });

    // Transformamos el objeto de estrellas en un formato que Recharts entienda
    const datosGrafico = Object.entries(satisfaccion.estrellas)
        .reverse() // Para que muestre de 5 estrellas a 1 estrella de arriba a abajo
        .map(([estrellas, cantidad]) => ({
            name: `${estrellas} ⭐`,
            cantidad: cantidad
        }));


    const capitalizar = (texto) => texto
            ?.split(" ")
            .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
            .join(" ") || "";

    const capitalize = (texto) => {
        if (!texto) return "";
        return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
    };

    return (
        <AdminLayout>
            <div className="admin-calificaciones-page">
                <div className="calificaciones-header">
                    <div className="calificaciones-label">Gestión</div>
                    <h1 className="calificaciones-titulo">Calificaciones</h1>
                </div>

                <div className="calificaciones-grid">
                    {/* Ranking */}
                    <section className="card-calificaciones">
                        <h2>🏆 Ranking de Profesores</h2>
                        <table className="tabla-ranking">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Profesor</th>
                                    <th>Promedio</th>
                                    <th>Calificaciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ranking.slice(0, 5).map((p, index) => (
                                    <tr key={p.profesor_id}>
                                        <td>{index + 1}</td>
                                        <td>{capitalizar(p.nombre)}</td>
                                        <td>⭐ {p.promedio}</td>
                                        <td>{p.cantidad_calificaciones}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="ranking-footer">
                            <button className="btn-ver-mas" onClick={() => setMostrarRankingCompleto(true)}>
                                Ver ranking completo
                            </button>
                        </div>
                    </section>

                    {/* Satisfacción */}
                    <section className="card-calificaciones card-satisfacion">
                        <h2>Satisfacción General</h2>
                        
                        <div className="promedio-box">
                            <h1>⭐ {satisfaccion.promedio}</h1>
                            <p>{satisfaccion.total} calificaciones</p>
                        </div>

                        {/* Contenedor del Gráfico de Barras */}
                        <div className="grafico-estrellas-container" style={{ width: "100%", height: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={datosGrafico}
                                    layout="vertical" // Hace que las barras sean horizontales
                                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                                >
                                    {/* Eje Y: Muestra "5 ⭐", "4 ⭐", etc. */}
                                    <XAxis type="number" hide /> {/* Escondemos el eje X numérico para un diseño más limpio */}
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        tick={{ fill: "#bdbdbd", fontSize: 13 }} 
                                        axisLine={false} 
                                        tickLine={false} 
                                    />
                                    
                                    {/* Tooltip flotante al pasar el mouse */}
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: "#232323", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                                        itemStyle={{ color: "#fff" }}
                                        labelStyle={{ color: "#888" }}
                                        cursor={{ fill: "rgba(255, 255, 255, 0.05)" }}
                                    />

                                    {/* La barra en sí: el color #f6c343 es el amarillo que ya usás en tu app */}
                                    <Bar 
                                        dataKey="cantidad" 
                                        fill="#f6c343" 
                                        radius={[0, 4, 4, 0]} // Bordes redondeados solo en las puntas derechas
                                        barSize={12} // Grosor de las barras
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                </div>
                {/* Comentarios */}
                <section className="card-calificaciones">
                    <h2>💬 Comentarios</h2>
                    <div className="filtros-comentarios">
                        <select
                            value={actividadFiltro}
                            onChange={(e) => setActividadFiltro(e.target.value)}
                        >
                            {actividades.map((actividad, index) => (
                                <option key={index} value={actividad}>
                                    {capitalizar(actividad)}
                                </option>
                            ))}
                        </select>
                        <select
                            value={profesorFiltro}
                            onChange={(e) => setProfesorFiltro(e.target.value)}
                        >
                            {profesores.map((profesor, index) => (
                                <option key={index} value={profesor}>
                                    {capitalizar(profesor)}
                                </option>
                            ))}
                        </select>
                        <input
                            className="buscador"
                            type="text"
                            placeholder="Buscar comentario..."
                            value={textoBusqueda}
                            onChange={(e) => setTextoBusqueda(e.target.value)}
                        />
                    </div>
                    {comentarios.length === 0 ? (
                        <p>No hay comentarios.</p>
                    ) : (
                        <div className="comentarios-grid">
                        {comentariosFiltrados.slice(0, 5).map((c, index) => (
                            <div className="comentario-card" key={index}>
                                {/* Fila Superior: Actividad, Estrellas y Fecha */}
                                <div className="comentario-header">
                                    <h3>{capitalizar(c.actividad)}</h3>
                                    <div className="comentario-meta-right">
                                        <span className="comentario-estrellas">{"⭐".repeat(c.puntuacion)}</span>
                                        <span className="comentario-fecha">{new Date(c.fecha).toLocaleDateString("es-AR")}</span>
                                    </div>
                                </div>

                                {/* Fila Media: Detalles de la clase y profesor */}
                                <div className="comentario-detalles">
                                    <span>📅 {capitalizar(c.dia)} - {c.horario}</span>
                                    <span className="divisor">•</span>
                                    <span>Profesor: <strong>{capitalizar(c.profesor)}</strong></span>
                                </div>

                                {/* Fila Inferior: Texto del comentario */}
                                {c.comentario && (
                                    <p className="comentario-texto">
                                        "{capitalize(c.comentario)}"
                                    </p>
                                )}
                            </div>    
                        ))}
                    </div>

                    )}
                    <div className="ranking-footer">
                        <button
                            className="btn-ver-mas"
                            onClick={() => setMostrarComentarios(true)}
                        >
                            Ver todos
                        </button>
                    </div>
                </section>
            </div>

            {/* Modal Ranking Completo */}
            {mostrarRankingCompleto && (
                <div className="modal-overlay" onClick={() => setMostrarRankingCompleto(false)}>
                    <div className="modal-box modal-ranking" onClick={(e) => e.stopPropagation()}>
                        <h2>🏆 Ranking completo</h2>
                        <table className="tabla-ranking">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Profesor</th>
                                    <th>Promedio</th>
                                    <th>Calificaciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ranking.map((p, index) => (
                                    <tr key={p.profesor_id}>
                                        <td>{index + 1}</td>
                                        <td>{capitalizar(p.nombre)}</td>
                                        <td>⭐ {p.promedio}</td>
                                        <td>{p.cantidad_calificaciones}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button className="btn-cerrar" onClick={() => setMostrarRankingCompleto(false)}>
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
            {/* Modal Comentarios */}
            {mostrarComentarios && (
                    <div
                        className="modal-overlay"
                        onClick={() => setMostrarComentarios(false)}
                    >
                        <div
                            className="modal-box modal-comentarios"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2>💬 Todos los comentarios</h2>

                            <div className="filtros-comentarios">
                                <select
                                    value={actividadFiltro}
                                    onChange={(e) =>
                                        setActividadFiltro(e.target.value)
                                    }
                                >
                                    {actividades.map((a) => (
                                        <option
                                            key={a}
                                            value={a}
                                        >
                                            {capitalizar(a)}
                                        </option>

                                    ))}

                                </select>

                                <select
                                    value={profesorFiltro}
                                    onChange={(e) =>
                                        setProfesorFiltro(e.target.value)
                                    }
                                >

                                    {profesores.map((p) => (
                                        <option
                                            key={p}
                                            value={p}
                                        >
                                            {capitalizar(p)}
                                        </option>

                                    ))}

                                </select>

                                <input
                                    className="buscador"
                                    type="text"
                                    placeholder="Buscar comentario..."
                                    value={textoBusqueda}
                                    onChange={(e) =>
                                        setTextoBusqueda(e.target.value)
                                    }
                                />

                            </div>

                            <div className="lista-comentarios">
                                {comentariosFiltrados.map((c) => (
                                    <div className="comentario-card" key={c.id}>
                                        {/* Fila Superior: Actividad, Estrellas y Fecha */}
                                        <div className="comentario-header">
                                            <h3>{capitalizar(c.actividad)}</h3>
                                            <div className="comentario-meta-right">
                                                <span className="comentario-estrellas">{"⭐".repeat(c.puntuacion)}</span>
                                                <span className="comentario-fecha">{new Date(c.fecha).toLocaleDateString("es-AR")}</span>
                                            </div>
                                        </div>

                                        {/* Fila Media: Detalles de la clase y profesor */}
                                        <div className="comentario-detalles">
                                            <span>📅 {capitalizar(c.dia)} - {c.horario}</span>
                                            <span className="divisor">•</span>
                                            <span>Profesor: <strong>{capitalizar(c.profesor)}</strong></span>
                                        </div>

                                        {/* Fila Inferior: Texto del comentario */}
                                        {c.comentario && (
                                            <p className="comentario-texto">
                                                "{capitalize(c.comentario)}"
                                            </p>
                                        )}
                                    </div>   
                                ))}

                            </div>

                            <button
                                className="btn-cerrar"
                                onClick={() =>
                                    setMostrarComentarios(false)
                                }
                            >
                                Cerrar
                            </button>

                        </div>

                    </div>

                )
            }

        </AdminLayout>
    );
};

export default AdminCalificaciones;

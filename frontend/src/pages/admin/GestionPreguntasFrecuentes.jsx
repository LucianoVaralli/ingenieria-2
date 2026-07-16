import { useEffect, useState, useRef } from "react";
import api from "../../api/api";
import AdminLayout from "../../layouts/AdminLayout";
import "../../assets/css/GestionPreguntasFrecuentes.css";

function GestionPreguntasFrecuentes() {

    const [preguntas, setPreguntas] = useState([]);

    const [titulo, setTitulo] = useState("");
    const [respuesta, setRespuesta] = useState("");
    
    const [editandoId, setEditandoId] = useState(null);
    const formRef = useRef(null);
    const [mostrarModal, setMostrarModal] = useState(false);
    const [preguntaAEliminar, setPreguntaAEliminar] = useState(null);

    useEffect(() => {
        cargarPreguntas();
    }, []);

    const cargarPreguntas = async () => {
        try {
            const res = await api.get("/preguntas-frecuentes/listar_preguntas");
            setPreguntas(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const guardarPregunta = async (e) => {
        e.preventDefault();

        try {
            if (editandoId) {

                await api.put(
                    `/preguntas-frecuentes/editar_pregunta/${editandoId}`,
                    {
                        titulo,
                        respuesta
                    }
                );

            } else {

                await api.post(
                    "/preguntas-frecuentes/crear_pregunta",
                    {
                        titulo,
                        respuesta
                    }
                );
            }

            setTitulo("");
            setRespuesta("");
            setEditandoId(null);

            cargarPreguntas();

        } catch (error) {
            console.error(error);
        }
    };

    const editarPregunta = (pregunta) => {
        setTitulo(pregunta.titulo);
        setRespuesta(pregunta.respuesta);
        setEditandoId(pregunta.id);
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const cancelarEdicion = () => {
        setTitulo("");
        setRespuesta("");
        setEditandoId(null);
    };

    const abrirModalEliminar = (id) => {
        setPreguntaAEliminar(id);
        setMostrarModal(true);
    };

    const confirmarEliminacion = async () => {
        try {
            await api.delete(
                `/preguntas-frecuentes/eliminar_pregunta/${preguntaAEliminar}`
            );

            setMostrarModal(false);
            setPreguntaAEliminar(null);

            cargarPreguntas();

        } catch (error) {
            console.error(error);
        }
    };

    return (
        <AdminLayout>

            <div className="admin-page">

                <div className="admin-section-label">
                    Gestión
                </div>

                <h1 className="admin-section-title">
                    Preguntas Frecuentes
                </h1>

                <div className="admin-section-title-block">
                    <h2 className="admin-subtitle">
                        {editandoId ? "Editando pregunta" : "Crear pregunta"}
                    </h2>
                </div>

                <form
                    ref={formRef}
                    onSubmit={guardarPregunta}
                    className={`admin-form ${editandoId ? "admin-form--editando" : ""}`}
                >

                    <label>Título</label>

                    <input
                        type="text"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        required
                    />

                    <label>Respuesta</label>

                    <textarea
                        value={respuesta}
                        onChange={(e) => setRespuesta(e.target.value)}
                        rows={5}
                        required
                    />

                    <div className="admin-form-botones">
                        <button type="submit">
                            {editandoId
                                ? "Guardar cambios"
                                : "Agregar pregunta"}
                        </button>

                        {editandoId && (
                            <button
                                type="button"
                                className="btn-cancelar-edicion"
                                onClick={cancelarEdicion}
                            >
                                Cancelar edición
                            </button>
                        )}
                    </div>

                </form>

                <div className="admin-divider" />

                    <div className="admin-section-title-block">
                        <h2 className="admin-subtitle">Preguntas creadas</h2>
                    </div>

                    <div className="admin-opciones">

                        {preguntas.map((pregunta) => (

                            <div
                                key={pregunta.id}
                                className={`faq-admin-card ${editandoId === pregunta.id ? "faq-admin-card--editando" : ""}`}
                            >

                                <h3>{pregunta.titulo}</h3>

                                <p>{pregunta.respuesta}</p>

                                <div className="faq-admin-actions">
                                    <button
                                        className="btn-editar"
                                        onClick={() =>
                                            editarPregunta(pregunta)
                                        }
                                    >
                                        Editar
                                    </button>

                                    <button
                                        className="btn-eliminar"
                                        onClick={() =>
                                            abrirModalEliminar(pregunta.id)
                                        }
                                    >
                                        Eliminar
                                    </button>
                                </div>

                            </div>

                        ))}

                </div>

            </div>
            {mostrarModal && (
                <div className="modal-overlay">
                    <div className="modal-content">

                        <h3>Eliminar pregunta</h3>

                        <p>
                            ¿Estás seguro de que querés eliminar esta pregunta frecuente?
                        </p>

                        <div className="modal-actions">

                            <button
                                className="btn-cancelar"
                                onClick={() => {
                                    setMostrarModal(false);
                                    setPreguntaAEliminar(null);
                                }}
                            >
                                Cancelar
                            </button>

                            <button
                                className="btn-eliminar"
                                onClick={confirmarEliminacion}
                            >
                                Eliminar
                            </button>

                        </div>

                    </div>
                </div>
            )}

        </AdminLayout>
    );
}

export default GestionPreguntasFrecuentes;
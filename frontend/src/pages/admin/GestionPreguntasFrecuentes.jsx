import { useEffect, useState } from "react";
import api from "../../api/api";
import AdminLayout from "../../layouts/AdminLayout";
import "../../assets/css/Admin.css";

function GestionPreguntasFrecuentes() {

    const [preguntas, setPreguntas] = useState([]);

    const [titulo, setTitulo] = useState("");
    const [respuesta, setRespuesta] = useState("");

    const [editandoId, setEditandoId] = useState(null);

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
    };

    const eliminarPregunta = async (id) => {

        if (!window.confirm("¿Eliminar esta pregunta?"))
            return;

        try {
            await api.delete(`/preguntas-frecuentes/eliminar_pregunta/${id}`);
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

                <form
                    onSubmit={guardarPregunta}
                    className="admin-form"
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

                    <button type="submit">
                        {editandoId
                            ? "Guardar cambios"
                            : "Agregar pregunta"}
                    </button>

                </form>

                <div className="admin-opciones">

                    {preguntas.map((pregunta) => (

                        <div
                            key={pregunta.id}
                            className="faq-admin-card"
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
                                        eliminarPregunta(pregunta.id)
                                    }
                                >
                                    Eliminar
                                </button>
                            </div>

                        </div>

                    ))}

                </div>

            </div>

        </AdminLayout>
    );
}

export default GestionPreguntasFrecuentes;
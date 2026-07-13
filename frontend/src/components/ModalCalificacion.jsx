import React, { useState } from "react";
import api from "../api/api";
import toast from "react-hot-toast";

const ModalCalificacion = ({ claseId, cerrar }) => {
    const [puntuacion, setPuntuacion] = useState(0);
    const [comentario, setComentario] = useState("");
    const [mensaje, setMensaje] = useState("");

    const enviarCalificacion = async () => {
        try {
            await api.post("/calificaciones/", {
                clase_id: claseId,
                puntuacion: puntuacion,
                comentario: comentario
            });
            toast.success("Calificación enviada correctamente ⭐");
            // Opcional: Podés meter un setTimeout para que se cierre solo a los 2 segundos
        } catch (error) {
            console.log(error.response?.data);
            toast.error(error.response?.data?.detail || "Error al enviar calificación");
        }
    };

    return (
        /* Al hacer clic en el fondo gris, se cierra el modal */
        <div className="modal-overlay-calificacion" onClick={cerrar}>
            
            <div className="modal-contenido-calificacion" onClick={(e) => e.stopPropagation()}>
                <h2 style={{ margin: 0, fontSize: "20px" }}>Califica la clase</h2>

                {/* Bloque de Estrellas */}
                <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                    {[1, 2, 3, 4, 5].map((numero) => (
                        <button
                            key={numero}
                            onClick={() => setPuntuacion(numero)}
                            style={{
                                fontSize: "32px",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                opacity: puntuacion >= numero ? 1 : 0.2,
                                transition: "opacity 0.1s"
                            }}
                        >
                            ⭐
                        </button>
                    ))}
                </div>

                <textarea
                    placeholder="Comentario opcional..."
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                />

                <p style={{ margin: 0, color: mensaje.includes("correctamente") ? "#4caf50" : "#f44336", textAlign: "center", fontSize: "14px" }}>
                    {mensaje}
                </p>

                <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                    <button 
                        onClick={cerrar} 
                        style={{ flex: 1, padding: "10px", borderRadius: "6px", cursor: "pointer" }}
                    >
                        Cerrar
                    </button>
                    <button 
                        onClick={enviarCalificacion} 
                        disabled={puntuacion === 0}
                        style={{ flex: 1, padding: "10px", borderRadius: "6px", cursor: puntuacion === 0 ? "not-allowed" : "pointer", backgroundColor: "#f6c343", border: "none", fontWeight: "bold" }}
                    >
                        Enviar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalCalificacion;

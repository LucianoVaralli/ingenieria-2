import React, { useEffect, useState } from "react";
import api from "../api/api.js";
import "../assets/css/Notificaciones.css";


function Notificaciones() {

    const [notificaciones, setNotificaciones] = useState([]);
    const [notificacionSeleccionada, setNotificacionSeleccionada] = useState(null);

    useEffect(() => {
        cargarNotificaciones();
    }, []);

    const cargarNotificaciones = async () => {
        try {
            const res = await api.get("/notificaciones/me");
            setNotificaciones(res.data);
        } catch (error) {
            console.error("Error cargando notificaciones", error);
        }
    };

    const abrirNotificacion = async (notif) => {

        setNotificacionSeleccionada(notif);

        if (!notif.leida) {
            try {
                await api.put(`/notificaciones/${notif.id}/leer`);

                setNotificaciones(prev =>
                    prev.map(n =>
                        n.id === notif.id
                            ? { ...n, leida: true }
                            : n
                    )
                );

            } catch (error) {
                console.error("Error marcando notificación", error);
            }
        }
    };

    return (
        <>
            {/* <Navbar /> */}

            <div className="notificaciones-page">

                <h1>Notificaciones</h1>

                {notificaciones.length === 0 ? (
                    <p>No tienes notificaciones.</p>
                ) : (

                    <div className="notificaciones-lista">

                        {notificaciones.map((notif) => (

                            <div
                                key={notif.id}
                                className={`notificacion-card ${
                                    notif.leida
                                        ? "leida"
                                        : "no-leida"
                                }`}
                                onClick={() => abrirNotificacion(notif)}
                            >

                                <h3>{notif.titulo}</h3>

                                <p>
                                    {notif.mensaje.length > 80
                                        ? notif.mensaje.substring(0, 80) + "..."
                                        : notif.mensaje}
                                </p>

                                <small>
                                    {new Date(notif.fecha).toLocaleString()}
                                </small>

                            </div>

                        ))}

                    </div>
                )}

                {notificacionSeleccionada && (

                    <div className="notificacion-detalle">

                        <h2>{notificacionSeleccionada.titulo}</h2>

                        <p>
                            {notificacionSeleccionada.mensaje}
                        </p>

                        <small>
                            {new Date(
                                notificacionSeleccionada.fecha
                            ).toLocaleString()}
                        </small>

                    </div>
                )}

            </div>
        </>
    );
}

export default Notificaciones;
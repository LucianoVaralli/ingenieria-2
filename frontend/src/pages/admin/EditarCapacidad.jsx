import React, { useEffect, useState } from "react";
import api from "../../api/api";
import "../../assets/css/Admin.css";
import AdminLayout from "../../layouts/AdminLayout";

function EditarCapacidad() {

    const [capacidadTotal, setCapacidadTotal] = useState(0);
    const [capacidadDisponible, setCapacidadDisponible] = useState(0);

    const [nuevaCapacidad, setNuevaCapacidad] = useState("");

    const [errorBackend, setErrorBackend] = useState("");
    const [mensajeExito, setMensajeExito] = useState("");

    useEffect(() => {
        cargarCapacidad();
    }, []);

    const cargarCapacidad = async () => {

        try {

            const res = await api.get("/gimnasio/");

            setCapacidadTotal(res.data.capacidad_total);
            setCapacidadDisponible(res.data.capacidad_disponible);

        } catch (error) {

            console.error(error);
            alert("Error cargando capacidad");

        }
    };

    const actualizarCapacidad = async (e) => {

        e.preventDefault();

        try {
            if (Number(nuevaCapacidad) <= 0) {
                setErrorBackend("La capacidad debe ser mayor a 0");
                return;
            }

            const res = await api.put("/gimnasio/capacidad", {
                capacidad_total: Number(nuevaCapacidad)
            });

            setMensajeExito(res.data.mensaje);

            setTimeout(() => {
                setMensajeExito("");
            }, 3000);

            setCapacidadTotal(res.data.capacidad_total);
            setCapacidadDisponible(res.data.capacidad_disponible);

            setNuevaCapacidad("");

        } catch (error) {

            console.error(error);

            setErrorBackend(
                error.response?.data?.detail ||
                "Error actualizando capacidad"
            );
        }
    };

    return (
        <AdminLayout>
            <div className="admin-page">

                <div className="crear-clase-container">

                    <h2>Capacidad del Gimnasio</h2>

                        {mensajeExito && (
                            <p className="mensaje-exito">
                                {mensajeExito}
                            </p>
                        )}

                        {errorBackend && (
                            <p className="input-error">
                                {errorBackend}
                            </p>
                        )}

                    <p>
                        <strong>Capacidad total:</strong> {capacidadTotal}
                    </p>

                    <p>
                        <strong>Capacidad disponible:</strong> {capacidadDisponible}
                    </p>

                    <form onSubmit={actualizarCapacidad}>

                        <input
                            type="number"
                            placeholder="Nueva capacidad"
                            value={nuevaCapacidad}
                            onChange={(e) => {
                                setNuevaCapacidad(e.target.value);
                                setErrorBackend("");
                                setMensajeExito("");
                            }}
                        />

                        <button type="submit">
                            Actualizar capacidad
                        </button>

                    </form>

                </div>

            </div>
        </AdminLayout>
    );
}

export default EditarCapacidad;
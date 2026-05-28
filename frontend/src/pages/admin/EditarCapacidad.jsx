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

    useEffect(() => { cargarCapacidad(); }, []);

    const cargarCapacidad = async () => {
        try {
            const res = await api.get("/gimnasio/");
            setCapacidadTotal(res.data.capacidad_total);
            setCapacidadDisponible(res.data.capacidad_disponible);
        } catch (error) {
            console.error(error);
        }
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

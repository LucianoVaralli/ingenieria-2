import { useState, useEffect } from "react";
import api from "../../api/api";
import AdminLayout from "../../layouts/AdminLayout";
import { toast } from "react-hot-toast";

import "../../assets/css/GestionProfesores.css";

function GestionProfesores() {

    const [form, setForm] = useState({
        nombre: "",
        apellido: "",
        dni: "",
        email: "",
        telefono: ""
    });

    const [credenciales, setCredenciales] = useState(null);
    const [profesores, setProfesores] = useState([]);
    const [errors, setErrors] = useState({});

    const [editMode, setEditMode] = useState(false);
    const [profesorEditando, setProfesorEditando] = useState(null);
    const [errorEliminacion, setErrorEliminacion] = useState(null);
    
    const cargarProfesores = async () => {
        const res = await api.get("/socios/profesores");
        setProfesores(res.data);
    };

    const [tipoProfesorEliminar, setTipoProfesorEliminar] = useState(null);
    const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
    const [profesorAEliminar, setProfesorAEliminar] = useState(null);
    useEffect(() => {
        cargarProfesores();
    }, []);

    useEffect(() => {
        if (Object.keys(errors).length === 0) return;

        const timer = setTimeout(() => {
            setErrors({});
        }, 4000);

        return () => clearTimeout(timer);
    }, [errors]);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const limpiarFormulario = () => {
        setForm({
            nombre: "",
            apellido: "",
            dni: "",
            email: "",
            telefono: ""
        });

        setErrors({});
    };

    const editarProfesor = (profesor) => {
        setProfesorEditando(profesor);

        setForm({
            nombre: profesor.nombre,
            apellido: profesor.apellido,
            dni: String(profesor.dni),
            email: profesor.email,
            telefono: profesor.telefono
        });

        setErrors({});
        setEditMode(true);
    };

    const crearProfesor = async (e) => {
        e.preventDefault();

        try {
            const res = await api.post(
                "/socios/crear_profesores",
                form
            );

            await cargarProfesores();

            toast.success(
                "Profesor creado correctamente. Se enviaron las credenciales al email."
            );

            limpiarFormulario();

        } catch (err) {

            const detalle = err.response?.data?.detail;

            if (
                detalle &&
                typeof detalle === "object" &&
                !Array.isArray(detalle)
            ) {
                setErrors(detalle);
            } else if (Array.isArray(detalle)) {
                toast.error(detalle[0].msg);
            } else {
                toast.error(detalle || "Error al crear profesor");
            }
        }
    };

    const actualizarProfesor = async (e) => {
        e.preventDefault();

        try {

            await api.put(
                `/socios/profesores/${profesorEditando.id}`,
                form
            );

            toast.success(
                "Profesor actualizado correctamente"
            );

            setEditMode(false);
            setProfesorEditando(null);
            limpiarFormulario();

            await cargarProfesores();

        } catch (err) {

            const detalle = err.response?.data?.detail;

            if (
                detalle &&
                typeof detalle === "object" &&
                !Array.isArray(detalle)
            ) {
                setErrors(detalle);
            } else {
                toast.error(
                    detalle || "Error al actualizar profesor"
                );
            }
        }
    };

    const eliminarProfesor = async (id) => {

        try {
            await api.delete(`/socios/profesores/${id}`);

            toast.success("Profesor eliminado correctamente");
            await cargarProfesores();

            setMostrarConfirmacion(false);
            setProfesorAEliminar(null);

        } catch (err) {
            console.log("ERROR ELIMINAR:", err.response?.data);
            const detalle = err.response?.data?.detail;

            // Caso: profesor con clases asignadas
            if (detalle?.clases || detalle?.reemplazos) {

                setMostrarConfirmacion(false);

                const clasesAfectadas = [
                    ...(detalle.clases || []),
                    ...(detalle.reemplazos || [])
                ];

                setErrorEliminacion({
                    nombre: detalle.nombre,
                    clases: clasesAfectadas
                });

                return;
            }

            setErrorEliminacion({
                nombre: "",
                clases: []
            });
        }
    };

    const capitalize = (texto) =>
        texto
            ?.split(" ")
            .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
            .join(" ") || "";

    return (
        <AdminLayout>

            <div className="admin-page">
                <div className="admin-section-label">
                    Gestión
                </div>

                <h1 className="admin-section-title">
                    Profesores
                </h1>

                <div className="form-profesor-card">

                    <h2 className="admin-subtitle">Crear profesor</h2>

                    <form
                        onSubmit={crearProfesor}
                        className="form-profesor"
                    >

                        <div className="input-group">
                            <input
                                name="nombre"
                                placeholder="Nombre"
                                value={form.nombre}
                                onChange={handleChange}
                            />
                            {errors.nombre && (
                                <span className="error-message">
                                    {errors.nombre}
                                </span>
                            )}
                        </div>

                        <div className="input-group">
                            <input
                                name="apellido"
                                placeholder="Apellido"
                                value={form.apellido}
                                onChange={handleChange}
                            />
                            {errors.apellido && (
                                <span className="error-message">
                                    {errors.apellido}
                                </span>
                            )}
                        </div>

                        <div className="input-group">
                            <input
                                name="dni"
                                placeholder="DNI"
                                value={form.dni}
                                onChange={handleChange}
                            />
                            {errors.dni && (
                                <span className="error-message">
                                    {errors.dni}
                                </span>
                            )}
                        </div>

                        <div className="input-group">
                            <input
                                name="email"
                                placeholder="Email"
                                value={form.email}
                                onChange={handleChange}
                            />
                            {errors.email && (
                                <span className="error-message">
                                    {errors.email}
                                </span>
                            )}
                        </div>

                        <div className="input-group">
                            <input
                                name="telefono"
                                placeholder="Teléfono"
                                value={form.telefono}
                                onChange={handleChange}
                            />
                            {errors.telefono && (
                                <span className="error-message">
                                    {errors.telefono}
                                </span>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="btn-crear-profesor"
                        >
                            Crear profesor
                        </button>

                    </form>

                </div>

                <h2 className="admin-subtitle">Profesores registrados</h2>

                <div className="contenido-profesor">

                    {profesores.length === 0 ? (

                        <p className="profesores-vacio-txt">
                            Sin profesores
                        </p>

                    ) : (

                        profesores.map((profesor) => (

                            <div
                                key={profesor.id}
                                className="profesor-card"
                            >

                                <div className="profesor-body">

                                    <h4>
                                        {capitalize(profesor.nombre)}{" "}
                                        {capitalize(profesor.apellido)}
                                    </h4>

                                    <p>
                                        📧 {profesor.email}
                                    </p>

                                    <p>
                                        🪪 DNI: {profesor.dni}
                                    </p>

                                    <p>
                                        📞 {profesor.telefono}
                                    </p>

                                </div>

                                <div className="profesor-footer">

                                    <button
                                        className="btn-editar-profesor"
                                        onClick={() =>
                                            editarProfesor(
                                                profesor
                                            )
                                        }
                                    >
                                        Editar
                                    </button>

                                    <button
                                        className="btn-eliminar-profesor"
                                        onClick={() => {
                                            setProfesorAEliminar(
                                                profesor
                                            );
                                            setMostrarConfirmacion(
                                                true
                                            );
                                        }}
                                    >
                                        Eliminar
                                    </button>

                                </div>

                            </div>

                        ))

                    )}

                </div>
            </div>
            {editMode && (

                <div className="modal-overlay">

                    <div className="modal-profesor">

                        <h3>Editar profesor</h3>

                        <form
                            onSubmit={actualizarProfesor}
                            className="form-profesor"
                        >

                            <div className="input-group">
                                <input
                                    name="nombre"
                                    value={form.nombre}
                                    onChange={handleChange}
                                />
                                {errors.nombre &&
                                    <span className="error-message">
                                        {errors.nombre}
                                    </span>
                                }
                            </div>

                            <div className="input-group">
                                <input
                                    name="apellido"
                                    value={form.apellido}
                                    onChange={handleChange}
                                />
                                {errors.apellido &&
                                    <span className="error-message">
                                        {errors.apellido}
                                    </span>
                                }
                            </div>

                            <div className="input-group">
                                <input
                                    name="dni"
                                    value={form.dni}
                                    onChange={handleChange}
                                />
                                {errors.dni &&
                                    <span className="error-message">
                                        {errors.dni}
                                    </span>
                                }
                            </div>

                            <div className="input-group">
                                <input
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                />
                                {errors.email &&
                                    <span className="error-message">
                                        {errors.email}
                                    </span>
                                }
                            </div>

                            <div className="input-group">
                                <input
                                    name="telefono"
                                    value={form.telefono}
                                    onChange={handleChange}
                                />
                                {errors.telefono &&
                                    <span className="error-message">
                                        {errors.telefono}
                                    </span>
                                }
                            </div>

                            <div className="modal-actions">

                                <button
                                className="btn-cambio">
                                    Guardar cambios
                                </button>

                                <button
                                    className="btn-cerrar"
                                    onClick={() => {
                                        setEditMode(false);
                                        setProfesorEditando(null);
                                        limpiarFormulario();
                                    }}
                                >
                                    Cancelar
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

            {mostrarConfirmacion && (
                <div className="modal-overlay">
                    <div className="modal-confirmacion">
                        <h3>¿Seguro que querés eliminar a {capitalize(profesorAEliminar?.nombre)} {capitalize(profesorAEliminar?.apellido)}?</h3>
                        <div className="modal-botones">
                            <button className="btn-cancelar" onClick={() => { setMostrarConfirmacion(false); setProfesorAEliminar(null); }}>
                                Cancelar
                            </button>
                            <button className="btn-eliminar" onClick={() => eliminarProfesor(profesorAEliminar.id)}>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {errorEliminacion && (
                <div className="modal-overlay">
                    <div className="modal-confirmacion">

                        <h3 className="titulo-advertencia">
                            ⚠️ No se puede eliminar a{" "}
                            <strong>
                                {capitalize(errorEliminacion.nombre)}
                            </strong>
                        </h3>

                        <p style={{ marginTop: "10px" }}>
                            El profesor está asignado a las siguientes clases:
                        </p>

                        <ul className="lista-clases-profesor">
                            {errorEliminacion.clases.map((c, i) => (
                                <li key={i}>

                                    {c.tipo === "Titular" ? (
                                        <>
                                            🟢 <strong>Titular</strong>
                                            {" · "}
                                            {capitalize(c.dia)}
                                            {" · "}
                                            {c.horario} hs
                                            {" · "}
                                            {capitalize(c.actividad)}
                                        </>
                                    ) : (
                                        <>
                                            🔄 <strong>Reemplazo temporal</strong>
                                            {" · "}
                                            {capitalize(c.dia)}
                                            {" · "}
                                            {c.horario} hs
                                            {" · "}
                                            {capitalize(c.actividad)}
                                            {" · "}
                                            Fecha: {c.fecha}
                                        </>
                                    )}

                                </li>
                            ))}
                        </ul>

                        <p style={{ marginTop: "15px" }}>
                            Primero debés asignar estas clases a otro profesor o eliminar las clases.
                        </p>

                        <button
                            className="btn-cerrar"
                            onClick={() => {
                                setErrorEliminacion(null);
                                setProfesorAEliminar(null);
                            }}
                        >
                            Entendido
                        </button>

                    </div>
                </div>
            )}

        </AdminLayout>
    );
}

export default GestionProfesores;
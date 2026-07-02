import { useState, useEffect } from "react";
import api from "../../api/api";
import AdminLayout from "../../layouts/AdminLayout";
import { toast, Toaster } from "react-hot-toast";
import "../../assets/css/Profesor.css";

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
    const [errorEliminacion, setErrorEliminacion] = useState("");
    
    const cargarProfesores = async () => {
        const res = await api.get("/socios/profesores");
        setProfesores(res.data);
    };

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

            setForm({
                nombre: "",
                apellido: "",
                dni: "",
                email: "",
                telefono: ""
            });

            setErrors({});

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

            setForm({
                nombre: "",
                apellido: "",
                dni: "",
                email: "",
                telefono: ""
            });

            setErrors({});

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
            const detalle = err.response?.data?.detail;

            // Caso: profesor con clases asignadas
            if (detalle?.clases) {
                setErrorEliminacion({
                    mensaje: detalle.mensaje || "No se puede eliminar el profesor, cambie al profesor o elimine las siguientes clases:",
                    clases: detalle.clases
                });
                return;
            }

            // Caso: error tipo string
            if (typeof detalle === "string") {
                setErrorEliminacion({
                    mensaje: detalle,
                    clases: []
                });
                return;
            }

            // Fallback
            setErrorEliminacion({
                mensaje: "Error al eliminar profesor",
                clases: []
            });
        }
    };
    return (
        <AdminLayout>

            <Toaster />
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
                                        {profesor.nombre}{" "}
                                        {profesor.apellido}
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

                                <button type="submit">
                                    Guardar cambios
                                </button>

                                <button
                                    type="button"
                                    className="btn-cerrar"
                                    onClick={() => {
                                        setEditMode(false);
                                        setProfesorEditando(null);
                                        setErrors({});
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
                        <h3>¿Seguro que querés eliminar a {profesorAEliminar?.nombre} {profesorAEliminar?.apellido}?</h3>
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

                        <h3>{errorEliminacion.mensaje}</h3>

                        {errorEliminacion.clases.length > 0 && (
                            <ul>
                                {errorEliminacion.clases.map((c, i) => (
                                    <li key={i}>{c}</li>
                                ))}
                            </ul>
                        )}

                        <button
                            className="btn-cerrar"
                            onClick={() => setErrorEliminacion(null)}
                        >
                            Cerrar
                        </button>

                    </div>
                </div>
            )}

        </AdminLayout>
    );
}

export default GestionProfesores;
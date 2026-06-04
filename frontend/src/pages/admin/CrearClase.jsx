import React, { useState, useEffect } from "react";
import api from "../../api/api";
import "../../assets/css/CrearClase.css";
import AdminLayout from "../../layouts/AdminLayout";

const actividades = [
    { label: "Yoga",      value: "yoga"      },
    { label: "Funcional", value: "funcional" },
    { label: "Pilates",   value: "pilates"   },
];

const dias = [
    { label: "Lunes",     value: "lunes"     },
    { label: "Martes",    value: "martes"    },
    { label: "Miércoles", value: "miercoles" },
    { label: "Jueves",    value: "jueves"    },
    { label: "Viernes",   value: "viernes"   },
    { label: "Sábado",    value: "sabado"    },
    { label: "Domingo",   value: "domingo"   },
];

const CrearClase = () => {
    const [formData, setFormData] = useState({
        actividad: "", dia: "", horario: "",
        profesor_id: "", cupo: "", duracion: "", precio_individual: ""
    });
    const [errores,      setErrores]      = useState({});
    const [errorBackend, setErrorBackend] = useState("");
    const [mensajeExito, setMensajeExito] = useState("");
    const [profesores,   setProfesores]   = useState([]);
    const [horariosSugeridos,  setHorariosSugeridos]  = useState([]);
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

    useEffect(() => { cargarProfesores(); }, []);

    const cargarProfesores = async () => {
        try {
            const res = await api.get("/socios/profesores");
            setProfesores(res.data);
        } catch (error) {
            console.error("Error cargando profesores:", error);
        }
    };

    // Solo limpia el error del campo que se edita, no toca los demás
    const handleChange = (e) => {
        setErrorBackend("");
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setErrores(prev => {
            const copia = { ...prev };
            delete copia[name];
            return copia;
        });
    };

    // Acumula TODOS los errores antes de retornar
    const validate = () => {
        const temp = {};

        if (!formData.actividad)   temp.actividad   = "Debe seleccionar una actividad";
        if (!formData.dia)         temp.dia         = "Debe seleccionar un día";
        if (!formData.horario)     temp.horario     = "Debe ingresar un horario";
        if (!formData.profesor_id) temp.profesor_id = "Debe seleccionar un profesor";

        if (!formData.cupo)                        temp.cupo = "Debe ingresar un cupo";
        else if (isNaN(formData.cupo))             temp.cupo = "El cupo debe ser numérico";
        else if (Number(formData.cupo) <= 0)       temp.cupo = "El cupo debe ser mayor a 0";

        const dur = Number(formData.duracion);
        if (!formData.duracion)                    temp.duracion = "Debe ingresar una duración";
        else if (isNaN(dur))                       temp.duracion = "La duración debe ser numérica";
        else if (dur < 30 || dur > 240)            temp.duracion = "La duración debe ser de mínimo 30 min y máximo 4 horas";

        if (!formData.precio_individual)                          temp.precio_individual = "Debe ingresar un precio";
        else if (isNaN(formData.precio_individual))               temp.precio_individual = "El precio debe ser numérico";
        else if (Number(formData.precio_individual) <= 0)         temp.precio_individual = "El precio debe ser mayor a 0";

        setErrores(temp);
        return Object.keys(temp).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorBackend("");
        setMensajeExito("");

        // Muestra TODOS los errores frontend de una sola vez
        if (!validate()) return;

        try {
            await api.post("/clases/crear", formData);
            setMensajeExito("Clase creada exitosamente");
            setTimeout(() => setMensajeExito(""), 3000);
            setFormData({ actividad: "", dia: "", horario: "", profesor_id: "", cupo: "", duracion: "", precio_individual: "" });
        } catch (error) {
            const data   = error.response?.data;
            const detail = data?.detail;

            // Errores múltiples del backend → objeto { errores: { campo: msg } }
            if (detail?.errores) {
                setErrores(prev => ({ ...prev, ...detail.errores }));
                return;
            }

            // Sugerencias de horario por capacidad excedida
            if (detail?.horarios_libres || data?.horarios_libres) {
                const libre = detail ?? data;
                setHorariosSugeridos(libre.horarios_libres || []);
                setMostrarSugerencias(true);
                setErrores(prev => ({ ...prev, horario: libre.error || "No hay capacidad en ese horario" })); // ← cambiada
                return;
            }

            // Error simple de string (profesor con horario ocupado, capacidad, etc.)
            if (typeof detail === "string") {
                if (detail.toLowerCase().includes("profesor")) {
                    setErrores(prev => ({ ...prev, profesor_id: detail }));
                } else {
                    setErrorBackend(detail);
                }
            } else {
                setErrorBackend("Error al crear clase");
            }
        }
    };

    return (
        <AdminLayout>
            <div className="crear-clase-page">
                <div className="crear-clase-header">
                    <div className="crear-clase-label">Gestión</div>
                    <h1 className="crear-clase-titulo">Crear Clase</h1>
                    <p className="crear-clase-subtitulo">Configurá nuevas actividades para el gimnasio</p>
                </div>

                <div className="crear-clase-card">
                    {mensajeExito && <p className="crear-clase-mensaje-exito">{mensajeExito}</p>}
                    {errorBackend && <p className="crear-clase-error-backend">{errorBackend}</p>}

                    <form onSubmit={handleSubmit} noValidate>

                        {/* Actividad y Día */}
                        <div className="crear-clase-row">
                            <div className="crear-clase-field">
                                <label className="crear-clase-field-label">Actividad</label>
                                <select name="actividad" value={formData.actividad} onChange={handleChange} className={`crear-clase-select ${errores.actividad ? "error" : ""}`}>
                                    <option value="">Seleccione actividad</option>
                                    {actividades.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                                </select>
                                {errores.actividad && <p className="crear-clase-error-field">{errores.actividad}</p>}
                            </div>
                            <div className="crear-clase-field">
                                <label className="crear-clase-field-label">Día</label>
                                <select name="dia" value={formData.dia} onChange={handleChange} className={`crear-clase-select ${errores.dia ? "error" : ""}`}>
                                    <option value="">Seleccione día</option>
                                    {dias.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                </select>
                                {errores.dia && <p className="crear-clase-error-field">{errores.dia}</p>}
                            </div>
                        </div>

                        {/* Horario y Profesor */}
                        <div className="crear-clase-row">
                            <div className="crear-clase-field">
                                <label className="crear-clase-field-label">Horario</label>
                                <input type="time" name="horario" value={formData.horario} onChange={handleChange} className={`crear-clase-input ${errores.horario ? "error" : ""}`} />
                                {errores.horario && <p className="crear-clase-error-field">{errores.horario}</p>}
                            </div>
                            <div className="crear-clase-field">
                                <label className="crear-clase-field-label">Profesor</label>
                                <select name="profesor_id" value={formData.profesor_id} onChange={handleChange} className={`crear-clase-select ${errores.profesor_id ? "error" : ""}`}>
                                    <option value="">Seleccione profesor</option>
                                    {profesores.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.email} ({p.nombre} {p.apellido})
                                        </option>
                                    ))}
                                </select>
                                {errores.profesor_id && <p className="crear-clase-error-field">{errores.profesor_id}</p>}
                            </div>
                        </div>

                        {/* Cupo y Duración */}
                        <div className="crear-clase-row">
                            <div className="crear-clase-field">
                                <label className="crear-clase-field-label">Cupo</label>
                                <input type="number" name="cupo" placeholder="Ej: 20" value={formData.cupo} onChange={handleChange} className={`crear-clase-input ${errores.cupo ? "error" : ""}`} />
                                {errores.cupo && <p className="crear-clase-error-field">{errores.cupo}</p>}
                            </div>
                            <div className="crear-clase-field">
                                <label className="crear-clase-field-label">Duración (minutos)</label>
                                <input type="number" name="duracion" placeholder="Ej: 60" value={formData.duracion} onChange={handleChange} className={`crear-clase-input ${errores.duracion ? "error" : ""}`} />
                                {errores.duracion && <p className="crear-clase-error-field">{errores.duracion}</p>}
                            </div>
                        </div>

                        {/* Precio */}
                        <div className="crear-clase-field">
                            <label className="crear-clase-field-label">Precio Individual ($)</label>
                            <input type="number" name="precio_individual" placeholder="Ej: 1500" value={formData.precio_individual} onChange={handleChange} className={`crear-clase-input ${errores.precio_individual ? "error" : ""}`} />
                            {errores.precio_individual && <p className="crear-clase-error-field">{errores.precio_individual}</p>}
                        </div>

                        {mostrarSugerencias && horariosSugeridos.length > 0 && (
                            <div className="sugerencias-box">
                                <h4>Horarios sugeridos</h4>
                                {horariosSugeridos.map((h, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className="sugerencia-btn"
                                        onClick={() => {
                                            setFormData(prev => ({ ...prev, horario: h.desde }));
                                            setMostrarSugerencias(false);
                                        }}
                                    >
                                        {h.desde} - {h.hasta}
                                    </button>
                                ))}
                            </div>
                        )}

                        <button type="submit" className="crear-clase-btn">
                            Crear Clase
                        </button>

                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};

export default CrearClase;

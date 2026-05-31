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
    const [errores,       setErrores]       = useState({});
    const [errorBackend,  setErrorBackend]  = useState("");
    const [mensajeExito,  setMensajeExito]  = useState("");
    const [profesores, setProfesores] = useState([]);
    const [horariosSugeridos, setHorariosSugeridos] = useState([]);
    const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

    useEffect(() => {
        cargarProfesores();
    }, []);

    const cargarProfesores = async () => {
        try {
            const res = await api.get("/socios/profesores");
            setProfesores(res.data);
        } catch (error) {
            console.error("Error cargando profesores:", error);
        }
    };

    const handleChange = (e) => {
        setErrorBackend("");
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        let nuevosErrores = { ...errores };

        // Si el usuario vuelve a escribir en un campo con error, limpiamos ese error específico
        if (nuevosErrores[name]) {
            delete nuevosErrores[name];
        }

        if (name === "cupo") {
            if (!value) nuevosErrores.cupo = "Debe ingresar un cupo";
            else if (isNaN(value)) nuevosErrores.cupo = "El cupo debe ser numérico";
            else if (Number(value) <= 0) nuevosErrores.cupo = "El cupo debe ser mayor a 0";
            else delete nuevosErrores.cupo;
        }
        if (name === "precio_individual") {
            if (!value) nuevosErrores.precio_individual = "Debe ingresar un precio";
            else if (isNaN(value)) nuevosErrores.precio_individual = "El precio debe ser numérico";
            else if (Number(value) <= 0) nuevosErrores.precio_individual = "El precio debe ser mayor a 0";
            else delete nuevosErrores.precio_individual;
        }
        
        // NOTA: Se eliminó por completo el bloque "if (name === 'duracion')" de aquí
        
        setErrores(nuevosErrores);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorBackend("");
        setMensajeExito("");
        
        // Validaciones de duración al presionar el botón
        const dur = Number(formData.duracion);
        if (!formData.duracion) {
            setErrores(prev => ({ ...prev, duracion: "Debe ingresar una duración" }));
            return;
        }
        if (isNaN(dur)) {
            setErrores(prev => ({ ...prev, duracion: "La duración debe ser numérica" }));
            return;
        }
        if (dur < 30 || dur > 240) {
            setErrores(prev => ({ 
                ...prev, 
                duracion: "La duración de la clase es de mínimo 30 minutos y máximo 4 horas" 
            }));
            return;
        }

        try {
            await api.post("/clases/crear", formData);
            setMensajeExito("Clase creada exitosamente");
            setTimeout(() => setMensajeExito(""), 3000);
            setFormData({ actividad: "", dia: "", horario: "", profesor_id: "", cupo: "", duracion: "", precio_individual: "" });
        } catch (error) {

            const data = error.response?.data;

            // si viene con sugerencias del backend
            if (data?.horarios_libres) {
                setHorariosSugeridos(data.horarios_libres || []);
                setMostrarSugerencias(true);

                setErrorBackend(data.error || "No hay disponibilidad en ese horario, pero te mostramos alternativas");
                return;
            }

            // Manejo de errores de negocio del backend (ej: Profesor inexistente, horario ocupado, etc.)
            const detail = error.response?.data?.detail || "Error al crear clase";
            
            if (detail.toLowerCase().includes("profesor")) {
                setErrores(prev => ({ ...prev, profesor_id: detail }));
            } else {
                setErrorBackend(detail);
            }
        }
    };

    const pedirSugerencias = async () => {
        try {
            const res = await api.get("/gimnasio/sugerencias", {
                params: {
                    dia: formData.dia,
                    duracion: formData.duracion
                }
            });

            setHorariosSugeridos(res.data || []);
            setMostrarSugerencias(true);

        } catch (error) {
            console.error("Error sugerencias:", error);
        }
    };

    const deshabilitado =
        !formData.actividad ||
        !formData.dia ||
        !formData.horario ||
        !formData.profesor_id ||
        !formData.cupo ||
        !formData.duracion ||
        !formData.precio_individual;


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

                    <form onSubmit={handleSubmit}>

                        {/* Actividad y Día */}
                        <div className="crear-clase-row">
                            <div className="crear-clase-field">
                                <label className="crear-clase-field-label">Actividad</label>
                                <select name="actividad" value={formData.actividad} onChange={handleChange} className="crear-clase-select">
                                    <option value="">Seleccione actividad</option>
                                    {actividades.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                                </select>
                            </div>
                            <div className="crear-clase-field">
                                <label className="crear-clase-field-label">Día</label>
                                <select name="dia" value={formData.dia} onChange={handleChange} className="crear-clase-select">
                                    <option value="">Seleccione día</option>
                                    {dias.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Horario y Email */}
                        <div className="crear-clase-row">
                            <div className="crear-clase-field">
                                <label className="crear-clase-field-label">Horario</label>
                                <input type="time" name="horario" value={formData.horario} onChange={handleChange} className="crear-clase-input" />
                            </div>
                            <div className="crear-clase-field">
                                <label className="crear-clase-field-label">Profesor</label>

                                <select
                                    name="profesor_id"
                                    value={formData.profesor_id}
                                    onChange={handleChange}
                                    className="crear-clase-select"
                                >
                                    <option value="">Seleccione profesor</option>

                                    {profesores.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.email} ({p.nombre} {p.apellido})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Cupo y Duración */}
                        <div className="crear-clase-row">
                            <div className="crear-clase-field">
                                <label className="crear-clase-field-label">Cupo</label>
                                <input type="number" name="cupo" placeholder="Ej: 20" value={formData.cupo} onChange={handleChange} className={`crear-clase-input ${errores.cupo ? 'error' : ''}`} />
                                {errores.cupo && <p className="crear-clase-error-field">{errores.cupo}</p>}
                            </div>
                            <div className="crear-clase-field">
                                <label className="crear-clase-field-label">Duración (minutos)</label>
                                <input type="number" name="duracion" placeholder="Ej: 60" value={formData.duracion} onChange={handleChange} className={`crear-clase-input ${errores.duracion ? 'error' : ''}`} />
                                {errores.duracion && <p className="crear-clase-error-field">{errores.duracion}</p>}
                            </div>
                        </div>

                        {/* Precio */}
                        <div className="crear-clase-field">
                            <label className="crear-clase-field-label">Precio Individual ($)</label>
                            <input type="number" name="precio_individual" placeholder="Ej: 1500" value={formData.precio_individual} onChange={handleChange} className={`crear-clase-input ${errores.precio_individual ? 'error' : ''}`} />
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
                                            setFormData({
                                                ...formData,
                                                horario: h.desde
                                            });
                                            setMostrarSugerencias(false);
                                        }}
                                    >
                                        {h.desde} - {h.hasta}
                                    </button>
                                ))}
                            </div>
                        )}

                        <button type="submit" className="crear-clase-btn" disabled={deshabilitado}>
                            Crear Clase
                        </button>

                    </form>
                </div>
            </div>
        </AdminLayout>
    );
};

export default CrearClase;
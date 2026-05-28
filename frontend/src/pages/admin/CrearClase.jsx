import React, { useState } from "react";
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
        profesor_email: "", cupo: "", duracion: "", precio_individual: ""
    });
    const [errores,       setErrores]       = useState({});
    const [errorBackend,  setErrorBackend]  = useState("");
    const [mensajeExito,  setMensajeExito]  = useState("");

    const handleChange = (e) => {
        setErrorBackend("");
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });

        let nuevosErrores = { ...errores };

        if (name === "cupo") {
            if (!value) nuevosErrores.cupo = "Debe ingresar un cupo";
            else if (isNaN(value)) nuevosErrores.cupo = "El cupo debe ser numérico";
            else if (Number(value) <= 0) nuevosErrores.cupo = "El cupo debe ser mayor a 0";
            else delete nuevosErrores.cupo;
        }
        if (name === "duracion") {
            if (!value) nuevosErrores.duracion = "Debe ingresar una duración";
            else if (isNaN(value)) nuevosErrores.duracion = "La duración debe ser numérica";
            else if (Number(value) < 30) nuevosErrores.duracion = "La duración mínima es de 30 minutos";
            else if (Number(value) > 240) nuevosErrores.duracion = "La duración máxima es de 4 horas";
            else delete nuevosErrores.duracion;
        }
        if (name === "precio_individual") {
            if (!value) nuevosErrores.precio_individual = "Debe ingresar un precio";
            else if (isNaN(value)) nuevosErrores.precio_individual = "El precio debe ser numérico";
            else if (Number(value) <= 0) nuevosErrores.precio_individual = "El precio debe ser mayor a 0";
            else delete nuevosErrores.precio_individual;
        }
        if (name === "profesor_email") {
            if (value && !value.includes("@")) nuevosErrores.profesor_email = "Email inválido";
            else delete nuevosErrores.profesor_email;
        }
        setErrores(nuevosErrores);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorBackend("");
        setMensajeExito("");
        try {
            await api.post("/clases/crear", formData);
            setMensajeExito("¡Clase creada exitosamente!");
            setTimeout(() => setMensajeExito(""), 3000);
            setFormData({ actividad: "", dia: "", horario: "", profesor_email: "", cupo: "", duracion: "", precio_individual: "" });
        } catch (error) {
            setErrorBackend(error.response?.data?.detail || "Error al crear clase");
        }
    };

    const deshabilitado =
        Object.keys(errores).length > 0 ||
        !formData.actividad || !formData.dia || !formData.horario ||
        !formData.profesor_email || !formData.cupo ||
        !formData.duracion || !formData.precio_individual;

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
                                <label className="crear-clase-field-label">Email del Profesor</label>
                                <input type="email" name="profesor_email" placeholder="profesor@email.com" value={formData.profesor_email} onChange={handleChange} className={`crear-clase-input ${errores.profesor_email ? 'error' : ''}`} />
                                {errores.profesor_email && <p className="crear-clase-error-field">{errores.profesor_email}</p>}
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

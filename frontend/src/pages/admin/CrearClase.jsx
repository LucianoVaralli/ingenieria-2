import React, { useState, useEffect } from "react"; 
import api from "../../api/api";
import "../../assets/css/Admin.css";
import AdminLayout from "../../layouts/AdminLayout";

const CrearClase = () => {

    // ENUMS del backend
    const actividades = [
        {
            label: "Yoga",
            value: "yoga"
        },
        {
            label: "Funcional",
            value: "funcional"
        },
        {
            label: "Pilates",
            value: "pilates"
        }
    ];

    const dias = [
        {
            label: "Lunes",
            value: "lunes"
        },
        {
            label: "Martes",
            value: "martes"
        },
        {
            label: "Miércoles",
            value: "miercoles"
        },
        {
            label: "Jueves",
            value: "jueves"
        },
        {
            label: "Viernes",
            value: "viernes"
        },
        {
            label: "Sábado",
            value: "sabado"
        },
        {
            label: "Domingo",
            value: "domingo"
        }
    ];

    // después esto va a venir del backend
    const [profesores, setProfesores] = useState([]);

    const [formData, setFormData] = useState({
        actividad: "",
        dia: "",
        horario: "",
        profesor_email: "",
        cupo: "",
        duracion: "",
        precio_individual: ""
    });

    const [errores, setErrores] = useState({});
    const [errorBackend, setErrorBackend] = useState("");
    const [mensajeExito, setMensajeExito] = useState("");
/**  se agrega en el futuro para la lista desplegable de profesores, por ahora es un input de email
useEffect(() => {

        // después esto sería:
        // api.get("/profesores")

        setProfesores([
            {
                nombre: "Juan Pérez",
                email: "juan@gmail.com"
            },
            {
                nombre: "Ana López",
                email: "ana@gmail.com"
            }
        ]);

    }, []);
*/
    const handleChange = (e) => {

        setErrorBackend("");

        const { name, value } = e.target;

        setFormData({
            ...formData,
            [name]: value
        });

        let nuevosErrores = { ...errores };

        // CUPOS
        if (name === "cupo") {

            if (value === "") {

                nuevosErrores.cupo =
                    "Debe ingresar un cupo";

            } else if (isNaN(value)) {

                nuevosErrores.cupo =
                    "El cupo debe ser numérico";

            } else if (Number(value) <= 0) {

                nuevosErrores.cupo =
                    "El cupo debe ser mayor a 0";

            } else {

                delete nuevosErrores.cupo;
            }
        }

        // DURACION
        if (name === "duracion") {

            if (value === "") {

                nuevosErrores.duracion =
                    "Debe ingresar una duración";

            } else if (isNaN(value)) {

                nuevosErrores.duracion =
                    "La duración debe ser numérica";

            } else if (Number(value) < 30) {

                nuevosErrores.duracion =
                    "La duración mínima es de 30 minutos";

            } else if (Number(value) > 240) {

                nuevosErrores.duracion =
                    "La duración máxima es de 4 horas";

            } else {

                delete nuevosErrores.duracion;
            }
        }        

        // PRECIO
        if (name === "precio_individual") {

            if (value === "") {

                nuevosErrores.precio_individual =
                    "Debe ingresar un precio";

            } else if (isNaN(value)) {

                nuevosErrores.precio_individual =
                    "El precio debe ser numérico";

            } else if (Number(value) <= 0) {

                nuevosErrores.precio_individual =
                    "El precio debe ser mayor a 0";

            } else {

                delete nuevosErrores.precio_individual;
            }
        }

        // EMAIL
        if (name === "profesor_email") {

            if (
                value &&
                !value.includes("@")
            ) {

                nuevosErrores.profesor_email =
                    "Email inválido";

            } else {

                delete nuevosErrores.profesor_email;
            }
        }

        setErrores(nuevosErrores);
    };

    const handleSubmit = async (e) => {

        e.preventDefault();

        setErrorBackend("");
        setMensajeExito("");

        try {

            await api.post("/clases/crear", formData);

            setMensajeExito("Creación de clase exitosa");

            setTimeout(() => {
                setMensajeExito("");
            }, 3000);

            setFormData({
                actividad: "",
                dia: "",
                horario: "",
                profesor_email: "",
                cupo: "",
                duracion: "",
                precio_individual: ""
            });

        } catch (error) {

            console.error(error);

            setErrorBackend(
                error.response?.data?.detail ||
                "Error al crear clase"
            );
        }
    };

    return (
        <AdminLayout>
            <div className="admin-page">
                <div className="crear-clase-container">

                    <h2>Crear Clase</h2>

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

                    <form onSubmit={handleSubmit}>

                        {/* ACTIVIDAD */}
                        <select
                            name="actividad"
                            value={formData.actividad}
                            onChange={handleChange}
                        >
                            <option value="">
                                Seleccione actividad
                            </option>

                            {actividades.map((actividad) => (

                                <option
                                    key={actividad.value}
                                    value={actividad.value}
                                >
                                    {actividad.label}
                                </option>

                            ))}
                        </select>

                        {/* DIA */}
                        <select
                            name="dia"
                            value={formData.dia}
                            onChange={handleChange}
                        >
                            <option value="">
                                Seleccione día
                            </option>

                            {dias.map((dia) => (
                                <option
                                    key={dia.value}
                                    value={dia.value}
                                >
                                    {dia.label}
                                </option>
                            ))}
                        </select>

                        {/* HORARIO */}
                        <input
                            type="time"
                            name="horario"
                            value={formData.horario}
                            onChange={handleChange}
                        />                       

                        {/* PROFESOR (provisorio, el de abajo me pone a los profesores como una lista desplegable, se modifica aca y en routes/socio.py-> obtener_profesores)*/}
                        <input
                            type="email"
                            name="profesor_email"
                            placeholder="Email profesor"
                            value={formData.profesor_email}
                            onChange={handleChange}
                        /> 
                        {errores.profesor_email && (
                            <p className="input-error">
                                {errores.profesor_email}
                            </p>
                        )}  
{/*                       
                         <select
                            name="profesor_email"
                            value={formData.profesor_email}
                            onChange={handleChange}
                        >
                            <option value="">
                                Seleccione profesor
                            </option>

                            {profesores.map((profesor) => (
                                <option
                                    key={profesor.email}
                                    value={profesor.email}
                                >
                                    {profesor.nombre}
                                </option>
                            ))}
                        </select>
*/} 
                        {/* CUPO */}
                        <input
                            type="number"
                            name="cupo"
                            placeholder="Cupo"
                            value={formData.cupo}
                            onChange={handleChange}
                        />

                        {errores.cupo && (
                            <p className="input-error">
                                {errores.cupo}
                            </p>
                        )}                

                        {/* DURACION */}
                        {/* mas adelante se deberia hacer como lista desplegable */}
                        <input
                            type="number"
                            name="duracion"
                            placeholder="Duración (minutos)"
                            value={formData.duracion}
                            onChange={handleChange}
                        />

                        {errores.duracion && (
                            <p className="input-error">
                                {errores.duracion}
                            </p>
                        )}

                        {/* PRECIO */}
                        <input
                            type="number"
                            name="precio_individual"
                            placeholder="Precio individual"
                            value={formData.precio_individual}
                            onChange={handleChange}
                        />     

                        {errores.precio_individual && (
                            <p className="input-error">
                                {errores.precio_individual}
                            </p>
                        )}                        

                        <button
                            type="submit"
                            disabled={
                                Object.keys(errores).length > 0 ||
                                !formData.actividad ||
                                !formData.dia ||
                                !formData.horario ||
                                !formData.profesor_email ||
                                !formData.cupo ||
                                !formData.duracion ||
                                !formData.precio_individual
                            }
                        >
                            Crear Clase
                        </button>

                    </form>

                </div>
            </div>
        </AdminLayout>
    );
};

export default CrearClase;
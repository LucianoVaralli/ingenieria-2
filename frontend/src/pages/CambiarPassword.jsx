import React, { useState } from "react";
import api from "../api/api";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../assets/css/CambiarPassword.css";

const CambiarPassword = () => {
    const navigate = useNavigate();
    const [passwordActual, setPasswordActual] = useState("");
    const [passwordNueva, setPasswordNueva] = useState("");
    const [confirmarPassword, setConfirmarPassword] = useState("");

    const [mostrarActual, setMostrarActual] = useState(false);
    const [mostrarNueva, setMostrarNueva] = useState(false);
    const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // 1. VALIDACIÓN: Verificar si algún campo está vacío o contiene solo espacios
        if (!passwordActual.trim() || !passwordNueva.trim() || !confirmarPassword.trim()) {
            toast.error("Todos los campos son obligatorios. Por favor, completalos.");
            return;
        }

        // 2. VALIDACIÓN: Que las contraseñas nuevas coincidan
        if (passwordNueva !== confirmarPassword) {
            toast.error("La confirmación de la nueva contraseña no coincide");
            return;
        }

        // 3. VALIDACIÓN: Regla de negocio (6-16 caracteres, una mayúscula, un carácter especial)
        // Usamos exactamente la misma lógica de expresiones regulares que tenés en tu backend
        const passRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,16}$/;

        if (!passRegex.test(passwordNueva)) {
            toast.error("La nueva contraseña debe tener entre 6 y 16 caracteres, incluir al menos una mayúscula y un carácter especial.");
            return; // Frena la ejecución y no hace la petición al backend
        }

        try {
            // Envío de datos seguro al backend
            const res = await api.post("/socios/cambiar-password", {
                password_actual: passwordActual,
                password_nueva: passwordNueva,
                confirmar_password_nueva: confirmarPassword
            });

            // Si el backend responde exitosamente:
            toast.success(res.data.mensaje || "Contraseña actualizada con éxito");

            // Limpiamos los campos por seguridad
            setPasswordActual("");
            setPasswordNueva("");
            setConfirmarPassword("");

            // 3. REDIRECCIÓN: Mandamos al usuario a la pantalla de perfil
            navigate("/perfil");

        } catch (err) {
            // Captura los errores del backend (ej: si la contraseña actual es incorrecta)
            const errorMsg = err.response?.data?.detail || "Error al cambiar contraseña";

            if (Array.isArray(errorMsg)) {
                toast.error(errorMsg[0].msg);
            } else {
                toast.error(errorMsg); // Muestra "La contraseña actual es incorrecta" directamente en la pantalla
            }
        }
    };

    return (
        <div className="reset-container">
            <div className="reset-card">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="btn-volver-top"
                >
                    ← Volver
                </button>

                <h1 className="reset-title">Cambiar Contraseña</h1>

                <form onSubmit={handleSubmit} className="reset-form">

                    {/* CAMPO CONTRASEÑA ACTUAL */}
                    <div className="reset-input-wrapper">
                        <input
                            type={mostrarActual ? "text" : "password"}
                            placeholder="Contraseña actual"
                            value={passwordActual}
                            onChange={(e) => setPasswordActual(e.target.value)}
                            className="reset-input"
                            required
                        />
                        <button
                            type="button"
                            className="reset-eye-btn"
                            onClick={() => setMostrarActual(!mostrarActual)}
                        >
                            {mostrarActual ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>

                    {/* CAMPO NUEVA CONTRASEÑA */}
                    <div className="reset-input-wrapper">
                        <input
                            type={mostrarNueva ? "text" : "password"}
                            placeholder="Nueva contraseña"
                            value={passwordNueva}
                            onChange={(e) => setPasswordNueva(e.target.value)}
                            className="reset-input"
                            required
                        />
                        <button
                            type="button"
                            className="reset-eye-btn"
                            onClick={() => setMostrarNueva(!mostrarNueva)}
                        >
                            {mostrarNueva ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>

                    {/* CAMPO CONFIRMAR NUEVA CONTRASEÑA */}
                    <div className="reset-input-wrapper">
                        <input
                            type={mostrarConfirmar ? "text" : "password"}
                            placeholder="Confirmar nueva contraseña"
                            value={confirmarPassword}
                            onChange={(e) => setConfirmarPassword(e.target.value)}
                            className="reset-input"
                            required
                        />
                        <button
                            type="button"
                            className="reset-eye-btn"
                            onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                        >
                            {mostrarConfirmar ? <FaEyeSlash /> : <FaEye />}
                        </button>
                    </div>

                    <button type="submit" className="reset-button">
                        Cambiar Contraseña
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CambiarPassword;
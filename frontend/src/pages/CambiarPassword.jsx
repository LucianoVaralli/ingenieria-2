import React, { useState } from "react";
import api from "../api/api";
import { toast, Toaster } from "react-hot-toast"; // Agregamos Toaster para manejar el éxito
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../assets/css/CambiarPassword.css";

const CambiarPassword = () => {
    const navigate = useNavigate();
    const [passwordActual, setPasswordActual] = useState("");
    const [passwordNueva, setPasswordNueva] = useState("");
    const [confirmarPassword, setConfirmarPassword] = useState("");

    // Nuevo estado de errores individuales para renderizar abajo de cada input
    const [errors, setErrors] = useState({
        passwordActual: "",
        passwordNueva: "",
        confirmarPassword: ""
    });

    const [mostrarActual, setMostrarActual] = useState(false);
    const [mostrarNueva, setMostrarNueva] = useState(false);
    const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

    // Expresión regular unificada con tu backend
    const passRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,16}$/;

    // Handlers específicos para actualizar datos y limpiar el error en tiempo real al escribir
    const handleActualChange = (val) => {
        setPasswordActual(val);
        setErrors((prev) => ({ ...prev, passwordActual: "" }));
    };

    const handleNuevaChange = (val) => {
        setPasswordNueva(val);
        setErrors((prev) => ({ ...prev, passwordNueva: "" }));
    };

    const handleConfirmarChange = (val) => {
        setConfirmarPassword(val);
        setErrors((prev) => ({ ...prev, confirmarPassword: "" }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Estructura limpia para capturar los errores de la validación actual
        let localErrors = { passwordActual: "", passwordNueva: "", confirmarPassword: "" };
        let hasFailed = false;

        // 1. VALIDACIÓN: Verificar campos vacíos de forma independiente
        if (!passwordActual.trim()) {
            localErrors.passwordActual = "La contraseña actual es obligatoria.";
            hasFailed = true;
        }
        if (!passwordNueva.trim()) {
            localErrors.passwordNueva = "La nueva contraseña es obligatoria.";
            hasFailed = true;
        }
        if (!confirmarPassword.trim()) {
            localErrors.confirmarPassword = "Debés confirmar la nueva contraseña.";
            hasFailed = true;
        }

        // 2. VALIDACIÓN: Regla de negocio (solo si se escribió algo)
        if (passwordNueva.trim() && !passRegex.test(passwordNueva)) {
            localErrors.passwordNueva = "Debe tener entre 6 y 16 caracteres, incluir al menos una mayúscula y un carácter especial.";
            hasFailed = true;
        }

        // 3. VALIDACIÓN: Que las contraseñas nuevas coincidan
        if (passwordNueva.trim() && confirmarPassword.trim() && passwordNueva !== confirmarPassword) {
            localErrors.confirmarPassword = "La confirmación de la nueva contraseña no coincide.";
            hasFailed = true;
        }

        // Si salta algún error de front, los renderizamos juntos y frenamos la petición
        if (hasFailed) {
            setErrors(localErrors);
            return;
        }

        try {
            // Envío de datos seguro al backend
            const res = await api.post("/socios/cambiar-password", {
                password_actual: passwordActual,
                password_nueva: passwordNueva,
                confirmar_password_nueva: confirmarPassword
            });

            // Éxito flotante permitido 🎉
            toast.success(res.data.mensaje || "Contraseña actualizada con éxito");

            // Limpiamos campos por seguridad
            setPasswordActual("");
            setPasswordNueva("");
            setConfirmarPassword("");

            setTimeout(() => {
                navigate("/perfil");
            }, 2000);

        } catch (err) {
            console.error("Error capturado en CambiarPassword:", err);
            const errorMsg = err.response?.data?.detail || "Error al cambiar contraseña";

            // Si el backend rechaza los datos, los mapeamos como errores fijos en la UI
            if (Array.isArray(errorMsg)) {
                setErrors((prev) => ({ ...prev, passwordNueva: errorMsg[0].msg }));
            } else {
                // Si la contraseña actual no coincide en base de datos, el cartel se inyecta directamente abajo de ella
                if (errorMsg.toLowerCase().includes("actual")) {
                    setErrors((prev) => ({ ...prev, passwordActual: errorMsg }));
                } else {
                    setErrors((prev) => ({ ...prev, passwordNueva: errorMsg }));
                }
            }
        }
    };

    return (
        <div className="reset-container">
            {/* Montamos el Toaster pasivo esperando el success */}
            <Toaster />

            <div className="reset-card">
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="btn-volver-top"
                >
                    ← Volver
                </button>

                <h1 className="reset-title">Cambiar Contraseña</h1>

                {/* noValidate apaga los tooltips nativos del navegador */}
                <form onSubmit={handleSubmit} className="reset-form" noValidate>

                    {/* CAMPO CONTRASEÑA ACTUAL */}
                    <div className="reset-input-group">
                        <div className="reset-input-wrapper">
                            <input
                                type={mostrarActual ? "text" : "password"}
                                placeholder="Contraseña actual"
                                value={passwordActual}
                                onChange={(e) => handleActualChange(e.target.value)}
                                className={`reset-input ${errors.passwordActual ? "invalid-border" : ""}`}
                            />
                            <button
                                type="button"
                                className="reset-eye-btn"
                                onClick={() => setMostrarActual(!mostrarActual)}
                            >
                                {mostrarActual ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        {errors.passwordActual && (
                            <p className="reset-error-message">{errors.passwordActual}</p>
                        )}
                    </div>

                    {/* CAMPO NUEVA CONTRASEÑA */}
                    <div className="reset-input-group">
                        <div className="reset-input-wrapper">
                            <input
                                type={mostrarNueva ? "text" : "password"}
                                placeholder="Nueva contraseña"
                                value={passwordNueva}
                                onChange={(e) => handleNuevaChange(e.target.value)}
                                className={`reset-input ${errors.passwordNueva ? "invalid-border" : ""}`}
                            />
                            <button
                                type="button"
                                className="reset-eye-btn"
                                onClick={() => setMostrarNueva(!mostrarNueva)}
                            >
                                {mostrarNueva ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        {errors.passwordNueva && (
                            <p className="reset-error-message">{errors.passwordNueva}</p>
                        )}
                    </div>

                    {/* CAMPO CONFIRMAR NUEVA CONTRASEÑA */}
                    <div className="reset-input-group">
                        <div className="reset-input-wrapper">
                            <input
                                type={mostrarConfirmar ? "text" : "password"}
                                placeholder="Confirmar nueva contraseña"
                                value={confirmarPassword}
                                onChange={(e) => handleConfirmarChange(e.target.value)}
                                className={`reset-input ${errors.confirmarPassword ? "invalid-border" : ""}`}
                            />
                            <button
                                type="button"
                                className="reset-eye-btn"
                                onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                            >
                                {mostrarConfirmar ? <FaEyeSlash /> : <FaEye />}
                            </button>
                        </div>
                        {errors.confirmarPassword && (
                            <p className="reset-error-message">{errors.confirmarPassword}</p>
                        )}
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
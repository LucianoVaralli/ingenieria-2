import React, { useState } from "react";
import api from "../api/api";
import { toast, Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../assets/css/CambiarPassword.css";

const CambiarPassword = () => {
    const navigate = useNavigate();
    const [passwordActual, setPasswordActual] = useState("");
    const [passwordNueva, setPasswordNueva] = useState("");
    const [confirmarPassword, setConfirmarPassword] = useState("");

    // Estado inicial limpio de errores
    const [errors, setErrors] = useState({
        passwordActual: "",
        passwordNueva: "",
        confirmarPassword: ""
    });

    const [mostrarActual, setMostrarActual] = useState(false);
    const [mostrarNueva, setMostrarNueva] = useState(false);
    const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

    const passRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,16}$/;

    // Handlers que limpian el error individual en tiempo real al escribir
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

        // 1. Estructura limpia para evaluar la validación actual desde cero
        let localErrors = { passwordActual: "", passwordNueva: "", confirmarPassword: "" };
        let hasFailed = false;

        // Validación: Verificar campos vacíos
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

        // Validación: Regla de negocio de complejidad
        if (passwordNueva.trim() && !passRegex.test(passwordNueva)) {
            localErrors.passwordNueva = "Debe tener entre 6 y 16 caracteres, incluir al menos una mayúscula y un carácter especial.";
            hasFailed = true;
        }

        // Validación: Que coincidan las contraseñas nuevas
        if (passwordNueva.trim() && confirmarPassword.trim() && passwordNueva !== confirmarPassword) {
            localErrors.confirmarPassword = "La confirmación de la nueva contraseña no coincide.";
            hasFailed = true;
        }

        // Si falla alguna validación de Frontend, mostramos y frenamos
        if (hasFailed) {
            setErrors(localErrors);
            return;
        }

        try {
            // 💡 CLAVE: Antes de mandar la petición, vaciamos los errores viejos de la pantalla
            setErrors({ passwordActual: "", passwordNueva: "", confirmarPassword: "" });

            const res = await api.post("/socios/cambiar-password", {
                password_actual: passwordActual,
                password_nueva: passwordNueva,
                confirmar_password_nueva: confirmarPassword
            });

            toast.success(res.data.mensaje || "Contraseña actualizada con éxito");

            setPasswordActual("");
            setPasswordNueva("");
            setConfirmarPassword("");

            setTimeout(() => {
                navigate("/perfil");
            }, 2000);

        } catch (err) {
            console.error("Error capturado en CambiarPassword:", err);
            const errorMsg = err.response?.data?.detail || "Error al cambiar contraseña";

            if (Array.isArray(errorMsg)) {
                // Manejo de errores de validación estructurados del backend (Pydantic)
                setErrors({
                    passwordActual: "",
                    passwordNueva: errorMsg[0].msg,
                    confirmarPassword: ""
                });
            } else {
                const msgString = errorMsg.toLowerCase();

                // 💡 CLAVE: Mapeamos el error de forma exclusiva y nos aseguramos de limpiar los demás
                if (msgString.includes("actual") || msgString.includes("incorrecta")) {
                    setErrors({
                        passwordActual: errorMsg, // Muestra "La contraseña actual es incorrecta"
                        passwordNueva: "",        // Se asegura de limpiar errores viejos
                        confirmarPassword: ""     // Evita que aparezca el error fantasma de coincidencia
                    });
                } else if (msgString.includes("coincide") || msgString.includes("confirmar")) {
                    setErrors({
                        passwordActual: "",
                        passwordNueva: "",
                        confirmarPassword: errorMsg
                    });
                } else {
                    setErrors({
                        passwordActual: "",
                        passwordNueva: errorMsg,
                        confirmarPassword: ""
                    });
                }
            }
        }
    };

    return (
        <div className="reset-container">
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
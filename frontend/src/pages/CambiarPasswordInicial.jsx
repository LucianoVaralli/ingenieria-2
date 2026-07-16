import React, { useState } from "react";
import api from "../api/api";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import "../assets/css/CambiarPassword.css";

const CambiarPasswordInicial = () => {
    const navigate = useNavigate();
    const [passwordNueva, setPasswordNueva] = useState("");
    const [confirmarPassword, setConfirmarPassword] = useState("");

    // Estado inicial limpio de errores
    const [errors, setErrors] = useState({
        passwordNueva: "",
        confirmarPassword: ""
    });

    const [mostrarNueva, setMostrarNueva] = useState(false);
    const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

    const passRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{6,16}$/;

    // Handlers que limpian el error individual en tiempo real al escribir

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
        let localErrors = { passwordNueva: "", confirmarPassword: "" };
        let hasFailed = false;

        // Validación: Verificar campos vacíos
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
            // Antes de mandar la petición, vaciamos los errores viejos de la pantalla
            setErrors({ passwordNueva: "", confirmarPassword: "" });

            const res = await api.post("/socios/cambiar-password-inicial", {
                password_nueva: passwordNueva,
                confirmar_password_nueva: confirmarPassword
            });

            toast.success(res.data.mensaje || "Contraseña actualizada con éxito");

            setPasswordNueva("");
            setConfirmarPassword("");

            setTimeout(() => {
                navigate("/perfil");
            }, 2000);

        } catch (err) {
            console.error("Error capturado en CambiarPasswordInicial:", err);
            const errorMsg = err.response?.data?.detail || "Error al cambiar contraseña";

            if (Array.isArray(errorMsg)) {
                // Manejo de errores de validación estructurados del backend (Pydantic)
                setErrors({
                    passwordNueva: errorMsg[0].msg,
                    confirmarPassword: ""
                });
            } else {
                const msgString = errorMsg.toLowerCase();

                // 💡 CLAVE: Mapeamos el error de forma exclusiva y nos aseguramos de limpiar los demás
                if (msgString.includes("actual") || msgString.includes("incorrecta")) {
                    setErrors({
                        passwordNueva: "",        // Se asegura de limpiar errores viejos
                        confirmarPassword: ""     // Evita que aparezca el error fantasma de coincidencia
                    });
                } else if (msgString.includes("coincide") || msgString.includes("confirmar")) {
                    setErrors({
                        passwordNueva: "",
                        confirmarPassword: errorMsg
                    });
                } else {
                    setErrors({
                        passwordNueva: errorMsg,
                        confirmarPassword: ""
                    });
                }
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

                <form onSubmit={handleSubmit} className="reset-form" noValidate>

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

export default CambiarPasswordInicial;
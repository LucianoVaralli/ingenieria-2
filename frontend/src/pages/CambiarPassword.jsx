import React, { useState } from "react";
import api from "../api/api";
import { toast } from "react-hot-toast";

const CambiarPassword = () => {
    const [passwordActual, setPasswordActual] = useState("");
    const [passwordNueva, setPasswordNueva] = useState("");
    const [confirmarPassword, setConfirmarPassword] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (passwordNueva !== confirmarPassword) {
            toast.error("Las contraseñas no coinciden");
            return;
        }

        try {
            const res = await api.post("/auth/change-password", {
                password_actual: passwordActual,
                password_nueva: passwordNueva
            });

            toast.success(res.data.message);

        } catch (err) {
            toast.error(
                err.response?.data?.detail || "Error al cambiar contraseña"
            );
        }
    };

    return (
        <div style={{ padding: "30px", color: "white" }}>
            <h1>Cambiar Contraseña</h1>

            <form onSubmit={handleSubmit}>
                <input
                    type="password"
                    placeholder="Contraseña actual"
                    value={passwordActual}
                    onChange={(e) => setPasswordActual(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Nueva contraseña"
                    value={passwordNueva}
                    onChange={(e) => setPasswordNueva(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Confirmar nueva contraseña"
                    value={confirmarPassword}
                    onChange={(e) => setConfirmarPassword(e.target.value)}
                />

                <button type="submit">
                    Cambiar Contraseña
                </button>
            </form>
        </div>
    );
};

export default CambiarPassword;
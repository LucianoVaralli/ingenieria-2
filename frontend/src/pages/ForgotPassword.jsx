import React, { useState } from 'react';
import api from '../api/api.js';

const ForgotPassword = () => {

    const [email, setEmail] = useState('');

    const handleForgotPassword = async (e) => {

        e.preventDefault();

        try {

            const res = await api.post(
                '/auth/forgot-password',
                {
                    email: email
                }
            );

            alert(res.data.message);

        } catch (err) {

            console.error(err);

            alert("Error al enviar código");
        }
    };

    return (

        <div>

            <h1>Recuperar contraseña</h1>

            <form onSubmit={handleForgotPassword}>

                <input
                    type="email"
                    placeholder="Ingresar email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <button type="submit">
                    Enviar código
                </button>

            </form>

        </div>
    );
};

export default ForgotPassword;
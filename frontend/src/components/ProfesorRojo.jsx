import React, { useState, useEffect } from 'react';
import '../assets/css/ProfesorRojo.css'; // Asegurate de crear este CSS
import personajeImg from '../assets/img/personaje-rojo.png'; // Cambiá por tu ruta real

const ProfesorRojo = () => {
    const [fase, setFase] = useState('corriendo'); // 'corriendo' o 'hablando'

    useEffect(() => {
        // El personaje corre durante 3 segundos antes de detenerse a hablar
        const timer = setTimeout(() => {
            setFase('hablando');
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="contenedor-animacion-personaje">
            <div className={`personaje-rojo ${fase}`}>
                <img 
                    src={personajeImg} 
                    alt="Profesor Rojo" 
                    className={fase === 'hablando' ? 'boca-movimiento' : ''} 
                />
                
                {fase === 'hablando' && (
                    <div className="bocadillo-texto">
                        <p>El único profesor disponible soy yo</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfesorRojo;
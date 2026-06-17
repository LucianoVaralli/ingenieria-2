import React from 'react';
import '../assets/css/Modal.css';

const ModalResultado = ({ isOpen, onClose, mensaje }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-contenedor modal-resultado">
                <button className="modal-close" onClick={onClose}>×</button>
                <p className="modal-mensaje-resultado">{mensaje}</p>
            </div>
        </div>
    );
};

export default ModalResultado;
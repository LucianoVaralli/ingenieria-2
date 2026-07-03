import React from 'react';
import '../assets/css/Modal.css';

const ModalConfirmacion = ({ isOpen, onConfirm, onCancel, titulo, mensaje }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-contenedor modal-confirmacion">
                <h3 className="modal-titulo">{titulo}</h3>
                <p
                    className="modal-mensaje"
                    style={{ whiteSpace: "pre-line" }}
                >
                    {mensaje}
                </p>
                <div className="modal-botones">
                    <button className="modal-btn modal-btn-no" onClick={onCancel}>
                        No
                    </button>
                    <button className="modal-btn modal-btn-si" onClick={onConfirm}>
                        Sí
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalConfirmacion;
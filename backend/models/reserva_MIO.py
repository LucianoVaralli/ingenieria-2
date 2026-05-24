from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class Reserva(Base):
    __tablename__ = "reservas"

    id           = Column(Integer, primary_key=True, index=True)
    socio_id     = Column(Integer, ForeignKey("socios.id"), nullable=False)
    clase_id     = Column(Integer, ForeignKey("clases.id"), nullable=False)

    # "membresia" o "individual"
    tipo         = Column(String, nullable=False)

    estado       = Column(String, default="pendiente_pago")

    # Fecha concreta de esa clase, ej: "2026-03-09"
    fecha_clase  = Column(String, nullable=False)
    fecha_creacion = Column(DateTime, default=lambda: datetime.now(timezone.utc))


    monto_pagado = Column(Float, default=0)
    monto_total  = Column(Float, nullable=False)
    porcentaje_pagado = Column(Integer, default=100)    

    reembolso_realizado = Column(Boolean, default=False)
    credito_generado = Column(Boolean, default=False)

    motivo_cancelacion = Column(String, nullable=True)
    mensaje_admin = Column(String, nullable=True)
    tipo_cancelacion = Column(String, nullable=True)

    # Relaciones para acceder fácil a los datos en la lógica del backend
    socio = relationship("Socio")
    clase = relationship("Clase")
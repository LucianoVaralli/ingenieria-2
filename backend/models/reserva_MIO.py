from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime
from datetime import datetime, timezone
from database import Base

class Reserva(Base):
    __tablename__ = "reservas"

    id           = Column(Integer, primary_key=True, index=True)
    socio_id     = Column(Integer, ForeignKey("socios.id"), nullable=False)
    clase_id     = Column(Integer, ForeignKey("clases.id"), nullable=False)

    # "membresia" o "individual"
    tipo         = Column(String, nullable=False)

    # esta va? ya que siempre esta esperando
    estado       = Column(String, default="pendiente_pago")

    # Fecha concreta de esa clase, ej: "2026-03-09"
    fecha_clase  = Column(String, nullable=False)

    monto_total  = Column(Float, nullable=False)
    monto_pagado = Column(Float, default=0.0)

    fecha_creacion = Column(DateTime, default=lambda: datetime.now(timezone.utc))

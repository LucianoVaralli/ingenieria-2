from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Notificacion(Base):
    __tablename__ = "notificaciones"

    id = Column(Integer, primary_key=True, index=True)

    socio_id = Column(Integer, ForeignKey("socios.id"), nullable=False)

    titulo = Column(String, nullable=False)
    mensaje = Column(String, nullable=False)

    leida = Column(Boolean, default=False)

    fecha = Column(DateTime, default=datetime.utcnow)

    # relación opcional (no obligatoria pero útil)
    socio = relationship("Socio", back_populates="notificaciones")
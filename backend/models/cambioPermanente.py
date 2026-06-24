from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from database import Base


class CambioProfesorPermanente(Base):
    __tablename__ = "cambios_profesor_permanente"

    id = Column(Integer, primary_key=True)

    clase_id = Column(
        Integer,
        ForeignKey("clases.id"),
        nullable=False
    )

    profesor_anterior_id = Column(
        Integer,
        ForeignKey("socios.id"),
        nullable=False
    )

    profesor_nuevo_id = Column(
        Integer,
        ForeignKey("socios.id"),
        nullable=False
    )

    motivo = Column(
        String,
        nullable=False
    )

    fecha_cambio = Column(
        DateTime,
        server_default=func.now()
    )
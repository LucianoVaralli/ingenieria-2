# models/cambio_profesor_temporal.py

from sqlalchemy import Column, Integer, Date, String, ForeignKey
from database import Base

class CambioProfesorTemporal(Base):
    __tablename__ = "cambio_profesor_temporal"

    id = Column(Integer, primary_key=True, index=True)

    clase_id = Column(
        Integer,
        ForeignKey("clases.id"),
        nullable=False
    )

    profesor_original_id = Column(
        Integer,
        ForeignKey("socios.id"),
        nullable=False
    )

    profesor_reemplazo_id = Column(
        Integer,
        ForeignKey("socios.id"),
        nullable=False
    )

    fecha = Column(
        Date,
        nullable=False
    )

    motivo = Column(
        String,
        nullable=False
    )
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime

from database import Base


class CalificacionDB(Base):
    __tablename__ = "calificaciones"

    id = Column(Integer, primary_key=True, index=True)

    alumno_id = Column(
        Integer,
        ForeignKey("socios.id"),
        nullable=False
    )

    clase_id = Column(
        Integer,
        ForeignKey("clases.id"),
        nullable=False
    )

    profesor_id = Column(
        Integer,
        ForeignKey("socios.id"),
        nullable=False
    )

    puntuacion = Column(
        Integer,
        nullable=False
    )

    comentario = Column(
        Text,
        nullable=True
    )

    fecha_creacion = Column(
        DateTime,
        default=datetime.utcnow
    )


    alumno = relationship(
        "Socio",
        foreign_keys=[alumno_id]
    )

    profesor = relationship(
        "Socio",
        foreign_keys=[profesor_id]
    )

    clase = relationship(
        "Clase"
    )
    __table_args__ = (
    UniqueConstraint(
        "alumno_id",
        "clase_id",
        "profesor_id",
        name="unique_calificacion_clase"
    ),
)
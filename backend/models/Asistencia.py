from sqlalchemy import Column, Integer, ForeignKey, String, UniqueConstraint
from database import Base

class Asistencia(Base):
    __tablename__ = "asistencias"
    id = Column(Integer, primary_key=True, index=True)
    socio_id = Column(Integer, ForeignKey("socios.id"), nullable=False)
    clase_id = Column(Integer, ForeignKey("clases.id"), nullable=False)
    fecha_clase = Column(String, nullable=False)  # "2026-06-03"

    __table_args__ = (
        UniqueConstraint("socio_id", "clase_id", "fecha_clase", name="uq_asistencia"),
    )
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from datetime import datetime, timezone
from database import Base

class ListaEspera(Base):
    __tablename__ = "lista_espera"

    id          = Column(Integer, primary_key=True, index=True)
    socio_id    = Column(Integer, ForeignKey("socios.id"), nullable=False)
    clase_id    = Column(Integer, ForeignKey("clases.id"), nullable=False)

    # Fecha concreta sin cupo, ej: "2026-03-31", esto va?
    fecha_clase = Column(String, nullable=False)

    # "membresia" o "individual" — define la prioridad en la fila
    tipo        = Column(String, nullable=False)
    estado        = Column(String, default="esperando")
    # La prioridad se calcula con este campo: el que lleva más tiempo espera primero
    fecha_ingreso = Column(DateTime, default=lambda: datetime.now(timezone.utc))

   
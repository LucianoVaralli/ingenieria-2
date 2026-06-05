from sqlalchemy import Column, Integer, Boolean, ForeignKey
from database import Base
from datetime import datetime
from sqlalchemy import DateTime

class Membresia(Base):
    __tablename__ = "membresias"

    id = Column(Integer, primary_key=True, index=True)

    socio_id = Column(Integer, ForeignKey("socios.id"), nullable=False)

    clase_id = Column(Integer, ForeignKey("clases.id"), nullable=False)

    activa = Column(Boolean, default=True)

    mes_vigente = Column(Integer, nullable=False)
    anio_vigente = Column(Integer, nullable=False)

    prioridad_hasta_dia = Column(Integer, default=10)

    fecha_expiracion = Column(DateTime, nullable=True)
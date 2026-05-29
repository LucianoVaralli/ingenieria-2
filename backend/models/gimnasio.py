from sqlalchemy import Column, Integer

from database import Base

class Gimnasio(Base):
    __tablename__ = "gimnasio"

    id = Column(Integer, primary_key=True)

    capacidad_total = Column(Integer, default=50)  # capacidad global de referencia
    capacidad_disponible = Column(Integer, default=50)
    # Capacidad máxima por día
    cap_lunes     = Column(Integer, default=50)
    cap_martes    = Column(Integer, default=50)
    cap_miercoles = Column(Integer, default=50)
    cap_jueves    = Column(Integer, default=50)
    cap_viernes   = Column(Integer, default=50)
    cap_sabado    = Column(Integer, default=50)
    cap_domingo   = Column(Integer, default=50)
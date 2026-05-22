from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship

from database import Base
from models.socio import Socio

class Clase(Base):
    __tablename__ = "clases"

    id = Column(Integer, primary_key=True, index=True)

    actividad = Column(String)
    dia = Column(String)
    horario = Column(String)
    profesor_id = Column(Integer, ForeignKey("socios.id")) #esta columna apunta al id de la tabla socios, esta clase pertenece a este profesor
    precio_individual = Column(Float, nullable=False, default=0.0)
    cupo = Column(Integer)
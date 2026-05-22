
from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy import Column, Integer, ForeignKey,Time, Enum
from models.enums import DiaSemana, TipoActividad


from database import Base

class Clase(Base):
    __tablename__ = "clases"

    id = Column(Integer, primary_key=True, index=True)

    actividad = Column(Enum(TipoActividad))
    dia = Column(Enum(DiaSemana))
    horario = Column(Time)
    profesor_id = Column(Integer, ForeignKey("socios.id")) #esta columna apunta al id de la tabla socios, esta clase pertenece a este profesor
    precio_individual = Column(Float, nullable=False, default=0.0)
    cupo = Column(Integer)
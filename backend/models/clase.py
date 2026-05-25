from sqlalchemy import Column, Integer, Float, ForeignKey, Time, Enum, Boolean, String
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
    duracion = Column(Integer, nullable=False, default=60) #duracion en minutos y por defecto es 60 minutos
    cupo = Column(Integer)

    activa = Column(Boolean, default=True) #para ver si la clase aparece o no del calendario
    motivo_baja = Column(String, nullable=True)
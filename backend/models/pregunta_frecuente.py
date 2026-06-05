from sqlalchemy import Column, Integer, String, Text, Boolean
from dependencies.database import Base

class PreguntaFrecuente(Base):
    __tablename__ = "preguntas_frecuentes"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(255), nullable=False)
    respuesta = Column(Text, nullable=False)
    activa = Column(Boolean, default=True)
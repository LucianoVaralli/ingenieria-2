from sqlalchemy import Column, Integer

from database import Base

class Gimnasio(Base):
    __tablename__ = "gimnasio"

    id = Column(Integer, primary_key=True)

    capacidad_total = Column(Integer)
    capacidad_disponible = Column(Integer)
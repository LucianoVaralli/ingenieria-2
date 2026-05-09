from sqlalchemy import Column, Integer, String, Boolean
from database import Base

# Definimos cómo es un Socio en la base de datos
class Socio(Base):
    __tablename__ = "socios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    apellido = Column(String)
    dni = Column(Integer, unique=True)
    email = Column(String, unique=True) # Para el login
    hashed_password = Column(String) # Contraseña protegida
    rol = Column(String, default="alumno") # "admin", "profesor" o "alumno"
    cuota_al_dia = Column(Boolean, default=True)
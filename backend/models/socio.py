from sqlalchemy import Column, Integer, String, Boolean
from database import Base
from models.enums import Rol

# Definimos cómo es un Socio en la base de datos
class Socio(Base):
    __tablename__ = "socios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    apellido = Column(String)
    dni = Column(Integer, unique=True)
    email = Column(String, unique=True) # Para el login
    telefono = Column(String)
    hashed_password = Column(String) # Contraseña protegida
    rol = Column(String, default=Rol.Miembro.value) # aca puede ser admin, profesor, miembro, no_miembro o no_usuario
    cuota_al_dia = Column(Boolean, default=True)
    apto_fisico_path = Column(String, nullable=True) # Guardamos el nombre del archivo
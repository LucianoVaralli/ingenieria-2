from sqlalchemy import Column, Integer, String, Boolean, Date
from database import Base
from models.enums import Rol
from sqlalchemy.orm import relationship  

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
    cuota_al_dia = Column(Boolean, default=False)
    creditos_disponibles = Column(Integer, default=0)
    apto_fisico_path = Column(String, nullable=True) # Guardamos el nombre del archivo
    notificaciones = relationship("Notificacion", back_populates="socio")
    membresia_activa_hasta = Column(Date, nullable=True)
    fecha_membresia_inicio = Column(Date, nullable=True)
    fecha_membresia_vencimiento = Column(Date, nullable=True)
    primer_login = Column(Boolean, default=False) # Para saber si es el primer login del usuario y forzar el cambio de contraseña
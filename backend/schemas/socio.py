from pydantic import BaseModel
from models.enums import Rol

class SocioCreate(BaseModel):
    nombre: str
    apellido: str
    dni: int
    email: str
    password: str
    rol: Rol = Rol.Miembro # Por defecto, el rol es Miembro

class EsquemaLogin(BaseModel):
    email: str
    password: str
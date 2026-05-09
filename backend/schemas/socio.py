from pydantic import BaseModel

class SocioCreate(BaseModel):
    nombre: str
    apellido: str
    dni: int
    email: str
    password: str
    rol: str = "alumno"

class EsquemaLogin(BaseModel):
    email: str
    password: str
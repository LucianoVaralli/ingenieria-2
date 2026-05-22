from datetime import time

from pydantic import BaseModel, EmailStr
from models.enums import DiaSemana, TipoActividad

class ClaseCreate(BaseModel):
    actividad: TipoActividad
    dia: DiaSemana
    horario: str
    profesor_email: EmailStr
    cupo: int
    precio_individual: float

class ClaseResponse(BaseModel):
    id: int
    actividad: str
    dia: DiaSemana
    horario: str
    profesor_id: int
    profesor_nombre: str = ""
    cupo: int
    precio_individual: float 

    class Config:
        from_attributes = True

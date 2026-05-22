from datetime import time

from pydantic import BaseModel, EmailStr
from models.enums import DiaSemana, TipoActividad

class ClaseCreate(BaseModel):
    actividad: TipoActividad
    dia: DiaSemana
    horario: time
    profesor_email: EmailStr
    cupo: int

class ClaseResponse(BaseModel):
    id: int
    actividad: str
    dia: DiaSemana
    horario: time
    profesor_id: int
    cupo: int
    precio_individual: float 

    class Config:
        from_attributes = True

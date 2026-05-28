from datetime import time

from pydantic import BaseModel, EmailStr
from models.enums import DiaSemana, TipoActividad
from datetime import datetime, timedelta, time

class ClaseCreate(BaseModel):
    actividad: TipoActividad
    dia: DiaSemana
    horario: time
    profesor_email: EmailStr
    cupo: int
    precio_individual: float
    duracion: int

class ClaseResponse(BaseModel):
    id: int
    actividad: str
    dia: DiaSemana
    horario: time
    profesor_id: int
    profesor_nombre: str = ""
    cupo: int
    precio_individual: float 
    duracion: int
    
    class Config:
        from_attributes = True

class CancelarClaseDia(BaseModel):
    fecha_clase: str
    motivo: str

class EliminarClase(BaseModel):
    motivo: str    



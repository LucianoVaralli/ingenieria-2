from datetime import date, time

from pydantic import BaseModel, EmailStr
from models.enums import DiaSemana, TipoActividad

class ClaseCreate(BaseModel):
    actividad: TipoActividad
    dia: DiaSemana
    horario: time
    profesor_id: int
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
    alumnos_inscriptos: int = 0
    
    class Config:
        from_attributes = True

class CancelarClaseDia(BaseModel):
    fecha_clase: str
    motivo: str

class EliminarClase(BaseModel):
    motivo: str    

class CambioProfesorTemporal(BaseModel):
    profesor_id: int
    fecha: date
    motivo: str

class CambioProfesorPermanente(BaseModel):
    profesor_id: int
    motivo: str
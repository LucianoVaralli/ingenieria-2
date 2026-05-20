from datetime import time

from pydantic import BaseModel
from models.enums import DiaSemana, TipoActividad

class ClaseCreate(BaseModel):
    actividad: TipoActividad
    dia: DiaSemana
    horario: time
    profesor_id: int
    cupo: int
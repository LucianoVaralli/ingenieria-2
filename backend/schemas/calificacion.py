from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CalificacionCrear(BaseModel):
    clase_id: int
    puntuacion: int
    fecha_clase: datetime
    comentario: Optional[str] = None



class CalificacionRespuesta(BaseModel):
    id: int
    alumno_id: int
    clase_id: int
    profesor_id: int
    puntuacion: int
    comentario: Optional[str]
    fecha_creacion: datetime


    class Config:
        from_attributes = True
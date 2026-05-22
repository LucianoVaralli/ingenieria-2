from pydantic import BaseModel
from models.enums import TipoActividad

class ClaseCreate(BaseModel):
    actividad: TipoActividad
    dia: str
    horario: str
    profesor_id: int
    cupo: int
    precio_individual: float  # NUEVO
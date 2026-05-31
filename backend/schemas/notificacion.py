from pydantic import BaseModel
from datetime import datetime


class NotificacionOut(BaseModel):
    id: int
    titulo: str
    mensaje: str
    leida: bool
    fecha: datetime

    class Config:
        from_attributes = True
from pydantic import BaseModel
from datetime import date


class CancelacionClaseDiaBase(BaseModel):
    fecha_clase: date
    motivo: str


class CancelacionClaseDiaCreate(CancelacionClaseDiaBase):
    clase_id: int


class CancelacionClaseDiaResponse(CancelacionClaseDiaBase):
    id: int
    clase_id: int

    class Config:
        from_attributes = True
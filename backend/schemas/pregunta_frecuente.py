from pydantic import BaseModel

class PreguntaFrecuenteCreate(BaseModel):
    titulo: str
    respuesta: str

class PreguntaFrecuenteResponse(BaseModel):
    id: int
    titulo: str
    respuesta: str

    class Config:
        from_attributes = True
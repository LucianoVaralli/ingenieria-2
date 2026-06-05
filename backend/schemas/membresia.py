from pydantic import BaseModel

class RenovarMembresiaRequest(BaseModel):
    socio_id: int
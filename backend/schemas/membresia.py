from pydantic import BaseModel

class RenovarMembresiaRequest(BaseModel):
    clase_ids: list[int]


    

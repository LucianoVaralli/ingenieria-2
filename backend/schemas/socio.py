from pydantic import BaseModel, Field, EmailStr, field_validator, model_validator
from models.enums import Rol  # Importamos tu Enum de la carpeta models
import re

class SocioBase(BaseModel):
    nombre: str
    apellido: str
    dni: str = Field(..., min_length=8, max_length=8, pattern=r"^\d{8}$")
    email: EmailStr
    telefono: str = Field(..., min_length=10, max_length=10, pattern=r"^\d{10}$")
    # Usamos el Enum directamente para que solo acepte valores válidos (Escenario Rol)
    rol: Rol = Rol.Miembro 

class SocioCreate(SocioBase):
    password: str = Field(..., min_length=6, max_length=16)
    confirmar_password: str

    @field_validator("password")
    @classmethod
    def validar_complejidad_password(cls, v: str) -> str:
        # Escenario 6: Validación de mayúscula y carácter especial
        if not re.search(r"[A-Z]", v):
            raise ValueError("contraseña invalida, debe incluir una mayuscula")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("contraseña invalida, debe incluir un caracter especial")
        return v

    @model_validator(mode="after")
    def verificar_claves_coinciden(self) -> "SocioCreate":
        # Escenario 8: Las contraseñas deben coincidir
        if self.password != self.confirmar_password:
            raise ValueError("Las contraseñas deben coincidir")
        return self

class SocioResponse(BaseModel):  # O el nombre de la clase que use tu endpoint
    id: int
    nombre: str
    apellido: str
    email: str
    cuota_al_dia: bool
    rol: str
    

    dni: int
    telefono: str  
    
    class Config:
        from_attributes = True

class EsquemaLogin(BaseModel):
    email: str
    password: str
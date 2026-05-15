from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from dependencies.database import get_db
from models.socio import Socio
from schemas.socio import EsquemaLogin
from services.auth import verificar_password
from services.auth import crear_token_acceso

router = APIRouter(
    prefix="/auth", # Agregamos un prefijo para agrupar
    tags=["Autenticación"] # Esto lo separa en el Swagger
)

@router.post("/login")
def login(
    # Cambiamos EsquemaLogin por esto para que Swagger sea compatible
    credenciales: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    # Ojo: OAuth2PasswordRequestForm usa .username (aunque sea el email)
    usuario = db.query(Socio).filter(Socio.email == credenciales.username).first()
    
    error_msg = "Nombre de usuario y/o contraseña incorrecta"

    if not usuario or not verificar_password(credenciales.password, usuario.hashed_password):
        raise HTTPException(status_code=401, detail=error_msg)

    token_real = crear_token_acceso(data={"sub": usuario.email, "rol": usuario.rol})

    return {
        "access_token": token_real, 
        "token_type": "bearer"
    }
    
@router.post("/logout")
def logout():
    return {"mensaje": "Cierre de sesión exitoso"}

@router.post("/forgot-password")
def forgot_password():
    return {"message": "Recuperación de contraseña"}
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from dependencies.database import get_db
from models.socio import Socio
from schemas.socio import EsquemaLogin
from services.auth import verificar_password

router = APIRouter(
    tags=["Autenticación"] # Esto lo separa en el Swagger
)

@router.post("/login")
def login(
    credenciales: EsquemaLogin, 
    db: Session = Depends(get_db)
):
    usuario = db.query(Socio).filter(Socio.email == credenciales.email).first()
    
    # Regla de Negocio: Mensaje exacto de tus Criterios de Aceptación
    error_msg = "Nombre de usuario y/o contraseña incorrecta"

    if not usuario or not verificar_password(credenciales.password, usuario.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail=error_msg
        )

    return {
        "access_token": "token_provisorio_para_probar",
        "token_type": "bearer",
        "rol": usuario.rol
    }

@router.post("/logout")
def logout():
    return {"mensaje": "Cierre de sesión exitoso"}
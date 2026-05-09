from fastapi import APIRouter, Depends, HTTPException, status
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
def login(credenciales: EsquemaLogin, db: Session = Depends(get_db)):
    usuario = db.query(Socio).filter(Socio.email == credenciales.email).first()
    
    error_msg = "Nombre de usuario y/o contraseña incorrecta"

    if not usuario or not verificar_password(credenciales.password, usuario.hashed_password):
        raise HTTPException(status_code=401, detail=error_msg)

    # CREAMOS EL TOKEN REAL
    # Guardamos el email (sub) y el rol dentro del token
    token_real = crear_token_acceso(
        data={"sub": usuario.email, "rol": usuario.rol}
    )

    return {
        "access_token": token_real,
        "token_type": "bearer",
        "rol": usuario.rol
    }
    
@router.post("/logout")
def logout():
    return {"mensaje": "Cierre de sesión exitoso"}
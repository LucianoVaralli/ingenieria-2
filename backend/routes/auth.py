from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from dependencies.database import get_db
from models.socio import Socio
from schemas.socio import EsquemaLogin
from services.auth import verificar_password, crear_token_acceso, get_password_hash
from schemas.password_recovery import ForgotPasswordRequest, ValidateCodeRequest, ResetPasswordRequest
from services.password_recovery_service import send_recovery_code, validate_recovery_code, change_password

router = APIRouter(
    prefix="/auth",
    tags=["Autenticación"]
)

@router.post("/login")
def login(
    credenciales: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    usuario = db.query(Socio).filter(Socio.email == credenciales.username).first()
    error_msg = "Nombre de usuario y/o contraseña incorrecta"

    if not usuario or not verificar_password(credenciales.password, usuario.hashed_password):
        raise HTTPException(status_code=401, detail=error_msg)

    token_real = crear_token_acceso(data={"sub": usuario.email, "rol": usuario.rol})

    return {
        "access_token": token_real,
        "token_type": "bearer",
        "primer_login": usuario.primer_login,
        "rol": usuario.rol
    }
    
@router.post("/logout")
def logout():
    return {"mensaje": "Cierre de sesión exitoso"}

@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    usuario_existe = db.query(Socio).filter(Socio.email == data.email).first()
    
    if not usuario_existe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El correo electrónico no se encuentra registrado"
        )
    
    # Validamos que el usuario no esté en su primer login, ya que debe usar la contraseña temporal para recuperar su contraseña
    if usuario_existe.primer_login:
        raise HTTPException(
            status_code=400,
            detail="Debes ingresar con la contraseña temporal antes de recuperar tu contraseña"
        )

    result = await send_recovery_code(
        data.email,
        db
    )
    return result

@router.post("/validate-code")
async def validate_code(
    data: ValidateCodeRequest,
    db: Session = Depends(get_db)
):
    result = await validate_recovery_code(
        data.email,
        data.code,
        db
    )
    return result

@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    result = await change_password(
        data.email,
        data.code,
        data.password,
        db
    )
    return result
from models.enums import Rol
from fastapi import HTTPException

from pwdlib import PasswordHash

from datetime import datetime, timedelta, timezone
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from fastapi import Depends
from sqlalchemy.orm import Session
from dependencies.database import get_db
from models.socio import Socio

# CONFIGURACIÓN (En producción esto iría en un archivo .env)
SECRET_KEY = "tu_clave_secreta_super_segura_para_sportify"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

def crear_token_acceso(data: dict):
    """Genera un token JWT firmado"""
    a_copiar = data.copy()
    
    # Configuramos el tiempo de expiración
    expiracion = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # Agregamos la expiración a los datos del token
    a_copiar.update({"exp": expiracion})
    
    # Firmamos el token con nuestra llave secreta
    token_jwt = jwt.encode(a_copiar, SECRET_KEY, algorithm=ALGORITHM)
    return token_jwt

password_hasher = PasswordHash.recommended()

#verificar que la contraseña sin encriptar coincida con la encriptada
def verificar_password(plain_password, hashed_password):
    return password_hasher.verify(
        plain_password,
        hashed_password
    )

#encriptar contraseña para guardarla en la base de datos
def get_password_hash(password):
    return password_hasher.hash(password)


# Esto le dice a FastAPI que busque el token en el encabezado "Authorization"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

from fastapi import Depends

def obtener_usuario_actual(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        # 1. Abrimos el token con la llave secreta
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        
        if email is None:
            raise HTTPException(status_code=401, detail="Token inválido")
            
    except JWTError:
        raise HTTPException(status_code=401, detail="No se pudo validar la sesión")

    # 2. Buscamos al dueño del token en la DB
    usuario = db.query(Socio).filter(Socio.email == email).first()
    if usuario is None:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    
    return usuario

from datetime import date

def validar_membresia(socio):
    if socio.rol != Rol.Miembro.value:
        return

    if not socio.membresia_activa_hasta:
        raise HTTPException(403, "Membresía no activa")

    if socio.membresia_activa_hasta < date.today():
        raise HTTPException(403, "Membresía vencida")
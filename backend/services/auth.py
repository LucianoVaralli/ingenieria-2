from http.client import HTTPException

from pwdlib import PasswordHash

from datetime import datetime, timedelta, timezone
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from models.socio import Socio

# CONFIGURACIÓN (En producción esto iría en un archivo .env)
SECRET_KEY = "tu_clave_secreta_super_segura_para_sportify"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

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

def verificar_password(plain_password, hashed_password):
    return password_hasher.verify(
        plain_password,
        hashed_password
    )

def get_password_hash(password):
    return password_hasher.hash(password)


# Esto le dice a FastAPI que busque el token en el encabezado "Authorization"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def obtener_usuario_actual(db: Session, token: str):
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
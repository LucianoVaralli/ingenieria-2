from pwdlib import PasswordHash

from datetime import datetime, timedelta, timezone
from jose import jwt

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
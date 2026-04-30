from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from pwdlib import PasswordHash
import database

# 1. Configuración de Seguridad Moderna (Reemplaza a passlib/CryptContext)
password_hasher = PasswordHash.recommended()

# Crea las tablas si no existen
database.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Sportify API")

# Dependencia de la DB
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- ESQUEMAS (Pydantic) ---

class SocioCreate(BaseModel):
    nombre: str
    apellido: str
    dni: int
    email: str
    password: str
    rol: str = "alumno" # Valor por defecto

class EsquemaLogin(BaseModel):
    email: str
    password: str

# --- FUNCIONES DE SEGURIDAD ---

def verificar_password(plain_password, hashed_password):
    return password_hasher.verify(plain_password, hashed_password)

def get_password_hash(password):
    return password_hasher.hash(password)

# --- RUTAS (Endpoints) ---

@app.post("/socios")
def crear_socio(socio: SocioCreate, db: Session = Depends(get_db)):
    # Buscamos si ya existe por DNI
    socio_existente = db.query(database.Socio).filter(database.Socio.dni == socio.dni).first()
    if socio_existente:
        raise HTTPException(status_code=400, detail="Ya existe un socio con ese DNI")
    
    # Encriptamos la contraseña con la nueva librería
    password_encriptada = get_password_hash(socio.password)
    
    nuevo_socio = database.Socio(
        nombre=socio.nombre,
        apellido=socio.apellido,
        dni=socio.dni,
        email=socio.email,
        hashed_password=password_encriptada,
        rol=socio.rol
    )
    db.add(nuevo_socio)
    db.commit()
    db.refresh(nuevo_socio)
    return nuevo_socio

@app.post("/login")
def login(datos_login: EsquemaLogin, db: Session = Depends(get_db)):
    # 1. Buscar usuario por email[cite: 1]
    usuario = db.query(database.Socio).filter(database.Socio.email == datos_login.email).first()
    
    # 2. Verificar existencia y contraseña (usando el nombre correcto: verificar_password)
    if not usuario or not verificar_password(datos_login.password, usuario.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas"
        )
    
    # 3. Respuesta exitosa (Próximo paso: Generar JWT real)
    return {
        "access_token": "token_provisorio_para_probar", 
        "token_type": "bearer",
        "rol": usuario.rol 
    }

# --- RUTAS DE CONSULTA ---

@app.get("/socios")
def obtener_socios(db: Session = Depends(get_db)):
    return db.query(database.Socio).all()

@app.get("/socios/buscar/{dni}")
def buscar_socio_por_dni(dni: int, db: Session = Depends(get_db)):
    socio = db.query(database.Socio).filter(database.Socio.dni == dni).first()
    if not socio:
        return {"mensaje": "Socio no encontrado", "existe": False}
    return {"mensaje": "Socio encontrado", "existe": True, "socio": socio}

@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API de Sportify - Gimnasio UNLP"}
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import os
import shutil # Para guardar el archivo en el disco
from models.enums import Rol

from dependencies.database import get_db
from models.socio import Socio
from schemas.socio import SocioCreate
from services.auth import get_password_hash, oauth2_scheme, obtener_usuario_actual

router = APIRouter(
    prefix="/socios",
    tags=["Socios"]
)

@router.post("/registrar")
async def registrar_socio(
    # Recibimos el archivo (Escenario 4)
    apto_fisico: UploadFile = File(...),
    # Recibimos los datos como Form (porque enviamos archivo)
    nombre: str = Form(...),
    apellido: str = Form(...),
    dni: str = Form(...),
    email: str = Form(...),
    telefono: str = Form(...),
    password: str = Form(...),
    confirmar_password: str = Form(...),
    db: Session = Depends(get_db)
):
    # 1. Validaciones de existencia (DNI y Email)
    if db.query(Socio).filter(Socio.dni == dni).first():
        raise HTTPException(status_code=400, detail="DNI ya registrado")
    
    if db.query(Socio).filter(Socio.email == email).first():
        raise HTTPException(status_code=400, detail="correo ya registrado")

    # 2. Guardar el archivo físicamente en una carpeta 'uploads'
    # 3. Crear la carpeta si no existe
    os.makedirs("uploads", exist_ok=True) 

    # 4. Guardar
    file_location = f"uploads/{dni}_{apto_fisico.filename}"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(apto_fisico.file, buffer)

    # 3. Encriptar y Guardar en DB
    hashed_pass = get_password_hash(password)
    
    nuevo_socio = Socio(
        nombre=nombre,
        apellido=apellido,
        dni=dni,
        email=email,
        telefono=telefono,
        hashed_password=hashed_pass,
        apto_fisico_path=file_location, # Guardamos donde quedó la foto
        rol=Rol.Miembro.value # Por defecto según tu Enum
    )

    db.add(nuevo_socio)
    db.commit()
    db.refresh(nuevo_socio)
    return {"mensaje": "registro exitoso", "socio_id": nuevo_socio.id}

@router.get("/me")
def obtener_mi_perfil(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    # La magia ocurre acá: la función decodifica el token y busca al socio
    usuario = obtener_usuario_actual(db, token)
    
    return {
        "nombre": usuario.nombre,
        "apellido": usuario.apellido,
        "email": usuario.email,
        "rol": usuario.rol,
        "cuota_al_dia": usuario.cuota_al_dia,
        "apto_fisico": usuario.apto_fisico_path
    }

@router.get("/")
def obtener_socios(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme) # FastAPI pide el token automáticamente
):
    # Validamos el token y obtenemos quién es el que pregunta
    usuario_peticion = obtener_usuario_actual(db, token)
    
    # REGLA DE ROL: Solo Admin o Profesor (usando tu Enum)
    if usuario_peticion.rol not in [Rol.Admin, Rol.Profesor]:
        raise HTTPException(
            status_code=403, 
            detail="No tienes permisos para ver esta lista"
        )

    return db.query(Socio).all()
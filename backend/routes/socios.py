from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from models.enums import Rol

from dependencies.database import get_db
from models.socio import Socio
from schemas.socio import SocioCreate
from services.auth import get_password_hash

router = APIRouter(
    prefix="/socios",
    tags=["Socios"]
)

@router.post("/")
def crear_socio(
    socio: SocioCreate, 
    db: Session = Depends(get_db)
):
    # 1. Validación DNI Único (Escenario 3)
    if db.query(Socio).filter(Socio.dni == socio.dni).first():
        raise HTTPException(
            status_code=400, 
            detail="DNI ya registrado"
        )

    # 2. Validación Email Único (Escenario 2)
    if db.query(Socio).filter(Socio.email == socio.email).first():
        raise HTTPException(
            status_code=400, 
            detail="correo ya registrado"
        )

    # 3. Encriptación
    password_encriptada = get_password_hash(socio.password)

    # 4. Creación con el Enum correcto
    nuevo_socio = Socio(
        nombre=socio.nombre,
        apellido=socio.apellido,
        dni=socio.dni,
        email=socio.email,
        hashed_password=password_encriptada,
        # Si 'socio.rol' en el Schema es el Enum, usamos .value
        rol=socio.rol.value if hasattr(socio.rol, 'value') else socio.rol
    )

    db.add(nuevo_socio)
    db.commit()
    db.refresh(nuevo_socio)

    return nuevo_socio

@router.get("/")
def obtener_socios(db: Session = Depends(get_db)):
    return db.query(Socio).all()
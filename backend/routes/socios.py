from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from dependencies.database import get_db
from models.socio import Socio
from schemas.socio import SocioCreate, EsquemaLogin
from services.auth import (
    verificar_password,
    get_password_hash
)

router = APIRouter(
    prefix="/socios",
    tags=["Socios"]
)

@router.post("/")
def crear_socio(
    socio: SocioCreate,
    db: Session = Depends(get_db)
):
    socio_existente = db.query(Socio).filter(
        Socio.dni == socio.dni
    ).first()

    if socio_existente:
        raise HTTPException(
            status_code=400,
            detail="Ya existe un socio"
        )

    password_encriptada = get_password_hash(
        socio.password
    )

    nuevo_socio = Socio(
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

@router.get("/")
def obtener_socios(
    db: Session = Depends(get_db)
):
    return db.query(Socio).all()
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from dependencies.database import get_db

from models.gimnasio import Gimnasio
from schemas.gimnasio import CapacidadUpdate

router = APIRouter(
    prefix="/gimnasio",
    tags=["Gimnasio"]
)

@router.put("/capacidad")
def actualizar_capacidad(
    datos: CapacidadUpdate,
    db: Session = Depends(get_db)
):
    
    # Buscar gimnasio en la base de datos
    gimnasio = db.query(Gimnasio).first()

    # Validar que exista
    if not gimnasio:
        raise HTTPException(
            status_code=404,
            detail="No existe configuración del gimnasio"
        )

    # Validar capacidad positiva
    if datos.capacidad_total <= 0:
        raise HTTPException(
            status_code=400,
            detail="La capacidad debe ser mayor a 0"
        )

    # Validar que la capacidad sea distinta a la actual
    if datos.capacidad_total == gimnasio.capacidad_total:
        raise HTTPException(
            status_code=400,
            detail="La capacidad ya tiene ese valor"
        )    

    # Actualizar capacidad
    ocupado = gimnasio.capacidad_total - gimnasio.capacidad_disponible

    nueva_disponible = datos.capacidad_total - ocupado

    # evitar negativos
    if nueva_disponible < 0:
        raise HTTPException(
            status_code=400,
            detail="La nueva capacidad no puede ser menor al espacio ya ocupado"
        )

    gimnasio.capacidad_total = datos.capacidad_total
    gimnasio.capacidad_disponible = nueva_disponible        

    # Guardar cambios
    db.commit()

    return {
        "mensaje": "Capacidad actualizada correctamente",
        "capacidad_total": gimnasio.capacidad_total,
        "capacidad_disponible": gimnasio.capacidad_disponible
    }

@router.get("/")
def obtener_gimnasio(db: Session = Depends(get_db)):

    gimnasio = db.query(Gimnasio).first()

    if not gimnasio:
        raise HTTPException(
            status_code=404,
            detail="No existe configuración del gimnasio"
        )

    return gimnasio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from dependencies.database import get_db

from models.gimnasio import Gimnasio
from schemas.gimnasio import CapacidadUpdate

router = APIRouter(
    prefix="/gimnasio",
    tags=["Gimnasio"]
)

# Esta funcion es para modificar la capacidad de un gimnasio que YA fue creado 
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

    # Actualizar capacidad
    gimnasio.capacidad_total = datos.capacidad_total
    gimnasio.capacidad_disponible = datos.capacidad_total

    # Guardar cambios
    db.commit()

    return {
        "mensaje": "Capacidad actualizada correctamente",
        "capacidad_total": gimnasio.capacidad_total,
        "capacidad_disponible": gimnasio.capacidad_disponible
    }

# Para crear un gimnasio 
@router.post("/inicializar")
def inicializar_gimnasio(datos: CapacidadUpdate, db: Session = Depends(get_db)):
    # Si ya existe, no crear otro
    if db.query(Gimnasio).first():
        raise HTTPException(status_code=400, detail="El gimnasio ya fue inicializado")
    
    gimnasio = Gimnasio(
        capacidad_total=datos.capacidad_total,
        capacidad_disponible=datos.capacidad_total
    )
    db.add(gimnasio)
    db.commit()
    return {"mensaje": "Gimnasio inicializado", "capacidad_total": datos.capacidad_total}
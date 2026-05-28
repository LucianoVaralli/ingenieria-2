from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from dependencies.database import get_db
from datetime import datetime, timedelta

from models.gimnasio import Gimnasio
from models.clase import Clase  # Importamos Clase para poder revisar los horarios existentes
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
    # 1. Buscar la configuración actual del gimnasio
    gimnasio = db.query(Gimnasio).first()
    if not gimnasio:
        raise HTTPException(status_code=404, detail="No existe configuración del gimnasio")

    if datos.capacidad_total <= 0:
        raise HTTPException(status_code=400, detail="La capacidad debe ser mayor a 0")
        
    if datos.capacidad_total == gimnasio.capacidad_total:
        raise HTTPException(status_code=400, detail="La capacidad ya tiene ese valor")    

    # ----------------------------------------------------------------------
    # TU PETICIÓN: Chequear la semana entera para ver si es seguro bajar la capacidad
    # ----------------------------------------------------------------------
    # Traemos todas las clases que están activas en la grilla semanal
    clases_activas = db.query(Clase).filter(Clase.activa == True).all()

    # Vamos a revisar cada clase, una por una, para ver su "pico" de superposición
    for c1 in clases_activas:
        inicio1 = datetime.combine(datetime.today(), c1.horario)
        fin1 = inicio1 + timedelta(minutes=c1.duracion)
        
        # Sumamos los cupos de todas las clases que compartan el mismo día y horario con c1
        cupos_simultaneos_este_bloque = 0
        for c2 in clases_activas:
            if c2.dia == c1.dia:  # Mismo día de la semana (ej: Lunes)
                inicio2 = datetime.combine(datetime.today(), c2.horario)
                fin2 = inicio2 + timedelta(minutes=c2.duracion)
                
                # Si los rangos horarios se cruzan/superponen
                if inicio1 < fin2 and fin1 > inicio2:
                    cupos_simultaneos_este_bloque += c2.cupo
        
        # SI EN CUALQUIER MOMENTO DE LA SEMANA EL CUPO SUPERA LA NUEVA CAPACIDAD QUE SE QUIERE PONER:
        # Le frenamos el carro al administrador y le avisamos exactamente dónde está el problema
        if cupos_simultaneos_este_bloque > datos.capacidad_total:
            raise HTTPException(
                status_code=400, 
                detail= f"No podés reducir la capacidad a {datos.capacidad_total}. "
                        f"El día '{c1.dia.value}' en el horario de las {c1.horario.strftime('%H:%M')} "
                        f"ya tenés clases planificadas que suman {cupos_simultaneos_este_bloque} cupos en simultáneo."
            )

    # Si el bucle termina y ningún horario superó la nueva capacidad, el cambio es seguro:
    gimnasio.capacidad_total = datos.capacidad_total
    
    # Mantenemos la columna disponible igual a la total para no romper contratos con el front
    gimnasio.capacidad_disponible = datos.capacidad_total        

    db.commit()

    return {
        "mensaje": "Capacidad del gimnasio modificada con éxito para toda la grilla",
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
        capacidad_disponible=datos.capacidad_total  # Inicializa en igualdad
    )
    db.add(gimnasio)
    db.commit()
    return {"mensaje": "Gimnasio inicializado", "capacidad_total": datos.capacidad_total}


@router.get("/")
def obtener_gimnasio(db: Session = Depends(get_db)):
    gimnasio = db.query(Gimnasio).first()

    if not gimnasio:
        raise HTTPException(
            status_code=404,
            detail="No existe configuración del gimnasio"
        )

    # Devolvemos capacidad_disponible igual a la total para que en las tarjetitas
    # del Front se vea limpio y el control real pase a las clases individuales.
    return {
        "id": gimnasio.id,
        "capacidad_total": gimnasio.capacidad_total,
        "capacidad_disponible": gimnasio.capacidad_total
    }
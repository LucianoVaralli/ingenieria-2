from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from dependencies.database import get_db
from datetime import time
from models.gimnasio import Gimnasio
from schemas.gimnasio import CapacidadUpdate
from routes.clase import Clase
from collections import defaultdict

router = APIRouter(
    prefix="/gimnasio",
    tags=["Gimnasio"]
)

def calcular_picos_por_dia(db: Session):
    clases_activas = db.query(Clase).filter(Clase.activa == True).all()

    clases_por_dia = defaultdict(list)

    for c in clases_activas:
        dia_limpio = c.dia.value.capitalize()
        clases_por_dia[dia_limpio].append(c)

    picos = {
        "Lunes": 0, "Martes": 0, "Miercoles": 0,
        "Jueves": 0, "Viernes": 0, "Sabado": 0, "Domingo": 0
    }

    for dia, clases in clases_por_dia.items():
        eventos = []

        for c in clases:
            inicio = c.horario.hour * 60 + c.horario.minute
            fin = inicio + c.duracion

            cupo = c.cupo or 0
            eventos.append((inicio, 1, cupo))
            eventos.append((fin, -1, cupo))

        eventos.sort()

        actual = 0
        maximo = 0

        for _, tipo, cupo in eventos:
            actual += tipo * cupo
            maximo = max(maximo, actual)

        picos[dia] = maximo

    return picos

# Esta funcion es para modificar la capacidad de un gimnasio que YA fue creado 
@router.put("/capacidad")
def actualizar_capacidad(datos: CapacidadUpdate, db: Session = Depends(get_db)):
    gimnasio = db.query(Gimnasio).first()
    if not gimnasio:
        raise HTTPException(status_code=404, detail="No existe gimnasio")

    # opcional: validar contra picos actuales
    picos = calcular_picos_por_dia(db)

    for dia, pico in picos.items():
        if pico > datos.capacidad_total:
            raise HTTPException(
                status_code=400,
                detail=f"No puedes reducir capacidad. El {dia} hay pico de {pico}"
            )

    gimnasio.capacidad_total = datos.capacidad_total
    db.commit()

    return {"mensaje": "Capacidad actualizada"}

@router.get("/capacidad/ocupacion-horaria")
def obtener_ocupacion_horaria(db: Session = Depends(get_db)):        
    return calcular_picos_por_dia(db)

# Para crear un gimnasio 
@router.post("/inicializar")
def inicializar_gimnasio(datos: CapacidadUpdate, db: Session = Depends(get_db)):
    # Si ya existe, no crear otro
    if db.query(Gimnasio).first():
        raise HTTPException(status_code=400, detail="El gimnasio ya fue inicializado")
    
    gimnasio = Gimnasio(
        capacidad_total=datos.capacidad_total
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
    
    # 2. Devolver todo junto en el JSON
    return {
        "id": gimnasio.id,
        "capacidad_total": gimnasio.capacidad_total,
        "picos_por_dia": calcular_picos_por_dia(db)  # <-- Enviamos los picos reales calculados
    }

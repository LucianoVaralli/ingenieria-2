from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from dependencies.database import get_db
from datetime import datetime, timedelta, date
from models.gimnasio import Gimnasio
from schemas.gimnasio import CapacidadUpdate
from routes.clase import Clase
from collections import defaultdict

router = APIRouter(
    prefix="/gimnasio",
    tags=["Gimnasio"]
)

# Esta funcion es para modificar la capacidad de un gimnasio que YA fue creado 
@router.put("/capacidad")
def actualizar_capacidad(datos: CapacidadUpdate, db: Session = Depends(get_db)):
    gimnasio = db.query(Gimnasio).first()
    if not gimnasio:
        raise HTTPException(status_code=404, detail="No existe gimnasio")

    clases_activas = db.query(Clase).filter(Clase.activa == True).all()
    
    clases_por_dia = defaultdict(list)
    for c in clases_activas:
        clases_por_dia[str(c.dia)].append(c)

    for dia, clases in clases_por_dia.items():
        eventos = []
        for c in clases:
            if c.horario is None or c.duracion is None:
                continue
            
            inicio = (c.horario.hour * 60) + c.horario.minute
            fin = inicio + c.duracion
            
            eventos.append((inicio, 1, c.cupo or 0))
            eventos.append((fin, -1, c.cupo or 0))

        eventos.sort()

        cupos_en_el_momento = 0
        for tiempo, tipo, cupo in eventos:
            cupos_en_el_momento += (tipo * cupo)
            
            if cupos_en_el_momento > datos.capacidad_total:
                raise HTTPException(
                    status_code=400, 
                    detail=f"No puedes reducir a {datos.capacidad_total}. El {dia} tienes {cupos_en_el_momento} cupos en simultáneo."
                )

    gimnasio.capacidad_total = datos.capacidad_total
    gimnasio.capacidad_disponible = datos.capacidad_total
    db.commit()
    
    return {"mensaje": "Capacidad actualizada", "capacidad_total": gimnasio.capacidad_total}

@router.get("/capacidad/limites")
def obtener_limites_capacidad(db: Session = Depends(get_db)):
    clases_activas = db.query(Clase).filter(Clase.activa == True).all()
    
    clases_por_dia = defaultdict(list)
    for c in clases_activas:
        clases_por_dia[str(c.dia)].append(c)

    picos_por_dia = {}
    
    for dia, clases in clases_por_dia.items():
        eventos = []
        for c in clases:
            if c.horario and c.duracion:
                inicio = (c.horario.hour * 60) + c.horario.minute
                fin = inicio + c.duracion
                eventos.append((inicio, 1, c.cupo or 0))
                eventos.append((fin, -1, c.cupo or 0))
        
        eventos.sort()
        
        maximo = 0
        actual = 0
        for _, tipo, cupo in eventos:
            actual += (tipo * cupo)
            if actual > maximo:
                maximo = actual
        picos_por_dia[dia] = maximo
        
    return picos_por_dia

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

@router.get("/")
def obtener_gimnasio(db: Session = Depends(get_db)):
    gimnasio = db.query(Gimnasio).first()

    if not gimnasio:
        raise HTTPException(
            status_code=404,
            detail="No existe configuración del gimnasio"
        )

    # 1. Calcular los picos reales por día con el algoritmo de barrido
    clases_activas = db.query(Clase).filter(Clase.activa == True).all()
    clases_por_dia = defaultdict(list)
    
    for c in clases_activas:
        # Normalizamos el nombre del día para que coincida con React (Lunes, Martes...)
        dia_str = c.dia.value if hasattr(c.dia, 'value') else str(c.dia)
        dia_limpio = dia_str.split('.')[-1].capitalize()
        if "Miercoles" in dia_limpio or "Miércoles" in dia_limpio:
            dia_limpio = "Miercoles"
        clases_por_dia[dia_limpio].append(c)

    picos_por_dia = {
        "Lunes": 0, "Martes": 0, "Miercoles": 0, "Jueves": 0, 
        "Viernes": 0, "Sabado": 0, "Domingo": 0
    }

    for dia, clases in clases_por_dia.items():
        eventos = []
        for c in clases:
            if c.horario and c.duracion:
                inicio = (c.horario.hour * 60) + c.horario.minute
                fin = inicio + c.duracion
                eventos.append((inicio, 1, c.cupo or 0))
                eventos.append((fin, -1, c.cupo or 0))
        
        eventos.sort()
        maximo = 0
        actual = 0
        for _, tipo, cupo in eventos:
            actual += (tipo * cupo)
            if actual > maximo:
                maximo = actual
        if dia in picos_por_dia:
            picos_por_dia[dia] = maximo

    # 2. Devolver todo junto en el JSON
    return {
        "id": gimnasio.id,
        "capacidad_total": gimnasio.capacidad_total,
        "capacidad_disponible": gimnasio.capacidad_disponible,
        "cap_lunes": gimnasio.cap_lunes,
        "cap_martes": gimnasio.cap_martes,
        "cap_miercoles": gimnasio.cap_miercoles,
        "cap_jueves": gimnasio.cap_jueves,
        "cap_viernes": gimnasio.cap_viernes,
        "cap_sabado": gimnasio.cap_sabado,
        "cap_domingo": gimnasio.cap_domingo,
        "picos_por_dia": picos_por_dia  # <-- Enviamos los picos reales calculados
    }

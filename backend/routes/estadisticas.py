from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, time as time_type
from typing import Optional
from collections import defaultdict
from sqlalchemy.orm import joinedload

from dependencies.database import get_db
from models.reserva_MIO import Reserva
from models.clase import Clase
from models.Asistencia import Asistencia
 
router = APIRouter(
    prefix="/estadisticas",
    tags=["Estadisticas"]
)
 
DIAS_ES = {
    "lunes": "Lunes", "martes": "Martes", "miercoles": "Miércoles",
    "jueves": "Jueves", "viernes": "Viernes", "sabado": "Sábado", "domingo": "Domingo"
}
 
# Mapeo de nombre de día en inglés (strftime %A) -> clave interna en español sin tilde
DIA_EN_A_ES = {
    "Monday": "lunes", "Tuesday": "martes", "Wednesday": "miercoles",
    "Thursday": "jueves", "Friday": "viernes", "Saturday": "sabado", "Sunday": "domingo"
}
 
 
def _dia_semana_de_fecha(fecha_str: str) -> Optional[str]:
    """Recibe 'YYYY-MM-DD' y devuelve la clave de día en español sin tilde (ej. 'lunes')."""
    try:
        fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
        return DIA_EN_A_ES.get(fecha.strftime("%A"))
    except Exception:
        return None
 
 
def _filtrar_por_rango(query_reservas, fecha_desde, fecha_hasta):
    """Aplica filtros de fecha sobre fecha_clase (string 'YYYY-MM-DD', comparable lexicográficamente)."""
    if fecha_desde:
        query_reservas = query_reservas.filter(Reserva.fecha_clase >= fecha_desde)
    if fecha_hasta:
        query_reservas = query_reservas.filter(Reserva.fecha_clase <= fecha_hasta)
    return query_reservas
 
 
def _parsear_dias(dias: Optional[str]) -> list:
    """'lunes,miercoles' -> ['lunes', 'miercoles']. None o '' -> [] (sin filtro)."""
    if not dias:
        return []
    return [d.strip().lower() for d in dias.split(",") if d.strip()]
 
 
@router.get("/reservas-por-actividad")
def reservas_por_actividad(
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    hora_desde: Optional[str] = Query(None),
    hora_hasta: Optional[str] = Query(None),
    dias: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    dias_filtro = _parsear_dias(dias)

    query = db.query(Reserva).filter(
        Reserva.estado.in_(["confirmada", "pendiente_pago"])
    )
    query = _filtrar_por_rango(query, fecha_desde, fecha_hasta)

    reservas = query.all()

    # ── Traemos TODAS las clases involucradas en una sola query (evita N+1) ──
    clase_ids = {r.clase_id for r in reservas}
    clases_map = {
        c.id: c for c in db.query(Clase).filter(Clase.id.in_(clase_ids)).all()
    } if clase_ids else {}

    conteo = defaultdict(int)

    for r in reservas:
        if dias_filtro:
            dia_reserva = _dia_semana_de_fecha(r.fecha_clase)
            if dia_reserva not in dias_filtro:
                continue

        clase = clases_map.get(r.clase_id)
        if not clase:
            continue

        if hora_desde and hora_hasta:
            h_inicio = time_type.fromisoformat(hora_desde)
            h_fin = time_type.fromisoformat(hora_hasta)
            if not (h_inicio <= clase.horario <= h_fin):
                continue

        conteo[clase.actividad.value if hasattr(clase.actividad, "value") else clase.actividad] += 1

    resultado = [{"actividad": k, "cantidad": v} for k, v in conteo.items()]
    resultado.sort(key=lambda x: x["cantidad"], reverse=True)
    return resultado


@router.get("/ingresos-por-actividad")
def ingresos_por_actividad(
    fecha_desde: Optional[str] = Query(None),
    fecha_hasta: Optional[str] = Query(None),
    hora_desde: Optional[str] = Query(None),
    hora_hasta: Optional[str] = Query(None),
    dias: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    dias_filtro = _parsear_dias(dias)

    query = db.query(Reserva).filter(
        Reserva.estado.in_(["confirmada", "vencida"]),
        Reserva.monto_pagado > 0
    )
    query = _filtrar_por_rango(query, fecha_desde, fecha_hasta)

    reservas = query.all()

    clase_ids = {r.clase_id for r in reservas}
    clases_map = {
        c.id: c for c in db.query(Clase).filter(Clase.id.in_(clase_ids)).all()
    } if clase_ids else {}

    ingresos = defaultdict(float)

    for r in reservas:
        if dias_filtro:
            dia_reserva = _dia_semana_de_fecha(r.fecha_clase)
            if dia_reserva not in dias_filtro:
                continue

        clase = clases_map.get(r.clase_id)
        if not clase:
            continue

        if hora_desde and hora_hasta:
            h_inicio = time_type.fromisoformat(hora_desde)
            h_fin = time_type.fromisoformat(hora_hasta)
            if not (h_inicio <= clase.horario <= h_fin):
                continue

        actividad_key = clase.actividad.value if hasattr(clase.actividad, "value") else clase.actividad
        ingresos[actividad_key] += r.monto_pagado

    resultado = [{"actividad": k, "monto": round(v, 2)} for k, v in ingresos.items()]
    resultado.sort(key=lambda x: x["monto"], reverse=True)
    return resultado
 
 
@router.get("/dia-mas-concurrido")
def dia_mas_concurrido(db: Session = Depends(get_db)):
    """
    Sin filtros: cuenta TODAS las asistencias (QR escaneado) de todas las clases,
    agrupadas por día de la semana, para encontrar el día con mayor concurrencia histórica.
    """
    asistencias = db.query(Asistencia).all()
 
    conteo = defaultdict(int)
 
    for a in asistencias:
        try:
            fecha = datetime.strptime(a.fecha_clase, "%Y-%m-%d").date()
            dia_semana = fecha.strftime("%A")
            dia_es = DIA_EN_A_ES.get(dia_semana, dia_semana)
            conteo[DIAS_ES.get(dia_es, dia_es)] += 1
        except Exception:
            continue
 
    resultado = [{"dia": k, "asistencias": v} for k, v in conteo.items()]
    resultado.sort(key=lambda x: x["asistencias"], reverse=True)
 
    return resultado
 
 
@router.get("/hora-mas-concurrida")
def hora_mas_concurrida(db: Session = Depends(get_db)):
    """
    Sin filtros: cuenta TODAS las asistencias (QR escaneado) de todas las clases,
    agrupadas por hora de inicio de la clase, para encontrar la hora con mayor concurrencia histórica.
    """
    asistencias = db.query(Asistencia).all()
 
    conteo = defaultdict(int)
 
    for a in asistencias:
        clase = db.query(Clase).filter(Clase.id == a.clase_id).first()
        if not clase or not clase.horario:
            continue
 
        hora_label = clase.horario.strftime("%H:00")
        conteo[hora_label] += 1
 
    resultado = [{"hora": k, "asistencias": v} for k, v in conteo.items()]
    resultado.sort(key=lambda x: x["hora"])
 
    return resultado
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta
from calendar import monthrange

from dependencies.database import get_db
from models.socio import Socio
from models.reserva_MIO import Reserva
from models.clase import Clase
from models.enums import TipoReserva
from services.auth import oauth2_scheme, obtener_usuario_actual
from pydantic import BaseModel

router = APIRouter(
    prefix="/membresia",
    tags=["Membresia"]
)

# ── Mapa día español → weekday Python (lunes=0 ... domingo=6) ──
DIA_A_WEEKDAY = {
    "lunes": 0, "martes": 1, "miercoles": 2, "miércoles": 2,
    "jueves": 3, "viernes": 4, "sabado": 5, "sábado": 5, "domingo": 6,
}


def _calcular_fechas_mes(anio: int, mes: int, weekday: int) -> list[str]:
    """Todas las fechas de un mes que caen en el weekday dado."""
    _, dias_en_mes = monthrange(anio, mes)
    return [
        f"{anio}-{mes:02d}-{d:02d}"
        for d in range(1, dias_en_mes + 1)
        if date(anio, mes, d).weekday() == weekday
    ]


def _determinar_mes_renovacion(clase_dia: str, hoy: date) -> tuple[int, int]:
    """
    Devuelve (anio, mes) al que corresponde la renovación.
    - Si quedan ocurrencias futuras del día de clase en el mes actual → mes actual.
    - Si ya pasó la última → mes siguiente.
    """
    weekday = DIA_A_WEEKDAY.get(clase_dia.lower().strip(), -1)
    if weekday == -1:
        # Día desconocido: mes siguiente como fallback
        mes_sig  = hoy.month % 12 + 1
        anio_sig = hoy.year + (1 if hoy.month == 12 else 0)
        return anio_sig, mes_sig

    _, dias_en_mes = monthrange(hoy.year, hoy.month)
    queda_en_mes_actual = any(
        date(hoy.year, hoy.month, d).weekday() == weekday
        and date(hoy.year, hoy.month, d) > hoy
        for d in range(hoy.day + 1, dias_en_mes + 1)
    )

    if queda_en_mes_actual:
        return hoy.year, hoy.month
    else:
        mes_sig  = hoy.month % 12 + 1
        anio_sig = hoy.year + (1 if hoy.month == 12 else 0)
        return anio_sig, mes_sig


# ── Schema ──
class RenovarMembresiaRequest(BaseModel):
    clase_ids: list[int]


# ─────────────────────────────────────────────
# ACTIVAR MEMBRESÍA (sin cambios)
# ─────────────────────────────────────────────

@router.post("/activar")
def activar_membresia(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user  = obtener_usuario_actual(token=token, db=db)
    socio = db.query(Socio).filter(Socio.id == user.id).first()
    hoy   = date.today()

    socio.membresia_activa_hasta  = hoy + timedelta(days=30)
    socio.fecha_membresia_inicio  = hoy
    socio.cuota_al_dia            = True

    db.commit()
    db.refresh(socio)

    return {
        "mensaje":       "Membresía activada",
        "vigente_hasta": socio.membresia_activa_hasta
    }


# ─────────────────────────────────────────────
# RENOVABLES — qué membresías puede renovar el socio
# ─────────────────────────────────────────────

@router.get("/renovables")
def obtener_membresias_renovables(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Devuelve una lista de clases para las que el socio tiene membresía activa,
    con el mes al que correspondería renovar y la última fecha reservada
    (para mostrar el chip "Vence el..." en el perfil).
    """
    socio = obtener_usuario_actual(token=token, db=db)
    hoy   = date.today()

    reservas = db.query(Reserva).filter(
        Reserva.socio_id      == socio.id,
        Reserva.tipo          == TipoReserva.Membresia.value,
        Reserva.estado        == "confirmada",
        Reserva.es_recurrente == True,
    ).all()

    clases_vistas = set()
    resultado     = []

    for r in reservas:
        if r.clase_id in clases_vistas:
            continue
        clases_vistas.add(r.clase_id)

        clase = db.query(Clase).filter(Clase.id == r.clase_id).first()
        if not clase:
            continue

        # Última fecha reservada para esta clase → "Vence el..."
        ultima = db.query(Reserva).filter(
            Reserva.socio_id      == socio.id,
            Reserva.clase_id      == r.clase_id,
            Reserva.tipo          == TipoReserva.Membresia.value,
            Reserva.estado        == "confirmada",
            Reserva.es_recurrente == True,
        ).order_by(Reserva.fecha_clase.desc()).first()

        anio_dest, mes_dest = _determinar_mes_renovacion(clase.dia, hoy)
        weekday             = DIA_A_WEEKDAY.get(clase.dia.lower().strip(), -1)
        fechas_disponibles  = _calcular_fechas_mes(anio_dest, mes_dest, weekday) if weekday != -1 else []

        resultado.append({
            "clase_id":               clase.id,
            "actividad":              clase.actividad,
            "dia":                    clase.dia,
            "horario":                str(clase.horario)[:5],
            "precio_individual":      clase.precio_individual,
            "ultima_fecha_reservada": str(ultima.fecha_clase) if ultima else None,
            "mes_renovacion":         f"{mes_dest:02d}/{anio_dest}",
            "anio_dest":              anio_dest,
            "mes_dest":               mes_dest,
            "fechas_mes":             fechas_disponibles,
            "total_clases":           len(fechas_disponibles),
        })

    return resultado


# ─────────────────────────────────────────────
# COTIZAR RENOVACIÓN — calcula fechas sin persistir
# ─────────────────────────────────────────────

@router.post("/cotizar-renovacion")
def cotizar_renovacion(
    datos: RenovarMembresiaRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Recibe una lista de clase_ids, verifica que el socio tenga membresía activa
    para cada una, y devuelve las fechas + objeto clase listos para navegar
    a ReservaMembresia. No escribe nada en la base de datos.
    """
    socio = obtener_usuario_actual(token=token, db=db)
    hoy   = date.today()

    resultado = []

    for clase_id in datos.clase_ids:
        clase = db.query(Clase).filter(Clase.id == clase_id).first()
        if not clase:
            raise HTTPException(status_code=404, detail=f"Clase {clase_id} no encontrada")

        tiene_membresia = db.query(Reserva).filter(
            Reserva.socio_id      == socio.id,
            Reserva.clase_id      == clase_id,
            Reserva.tipo          == TipoReserva.Membresia.value,
            Reserva.estado        == "confirmada",
            Reserva.es_recurrente == True,
        ).first()

        if not tiene_membresia:
            raise HTTPException(
                status_code=400,
                detail=f"No tenés membresía activa para la clase {clase.actividad}"
            )

        anio_dest, mes_dest = _determinar_mes_renovacion(clase.dia, hoy)
        weekday   = DIA_A_WEEKDAY.get(clase.dia.lower().strip(), -1)
        fechas_mes = _calcular_fechas_mes(anio_dest, mes_dest, weekday) if weekday != -1 else []

        if not fechas_mes:
            raise HTTPException(
                status_code=400,
                detail=f"No se encontraron fechas para renovar la clase {clase.actividad}"
            )

        resultado.append({
            "clase_id":  clase.id,
            "clase": {
                "id":                clase.id,
                "actividad":         clase.actividad,
                "dia":               clase.dia,
                "horario":           str(clase.horario),
                "precio_individual": clase.precio_individual,
            },
            "fechas_mes": fechas_mes,
            "mes_label":  f"{mes_dest:02d}/{anio_dest}",
        })

    return resultado


# ─────────────────────────────────────────────
# PROCESAR VENCIMIENTOS (sin cambios)
# ─────────────────────────────────────────────

@router.post("/procesar-vencimientos")
def procesar_vencimientos(db: Session = Depends(get_db)):
    hoy = date.today()

    socios_vencidos = db.query(Socio).filter(
        Socio.membresia_activa_hasta.isnot(None),
        Socio.membresia_activa_hasta < hoy
    ).all()

    eliminadas = 0

    for socio in socios_vencidos:
        reservas = db.query(Reserva).filter(
            Reserva.socio_id      == socio.id,
            Reserva.es_recurrente == True,
            Reserva.estado        != "cancelada"
        ).all()

        for reserva in reservas:
            reserva.estado = "cancelada"
            eliminadas += 1

        socio.cuota_al_dia = False

    db.commit()

    return {"reservas_eliminadas": eliminadas}

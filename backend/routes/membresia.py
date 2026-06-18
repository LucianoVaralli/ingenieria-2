from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta, datetime
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


def _mes_siguiente(anio: int, mes: int) -> tuple[int, int]:
    """Devuelve (anio, mes) del mes siguiente."""
    if mes == 12:
        return anio + 1, 1
    return anio, mes + 1


def _actualizar_membresia_activa_hasta(socio_id: int, db: Session):
    """
    Recalcula membresia_activa_hasta como la última fecha de reserva
    de membresía confirmada del socio. Se llama después de cada pago/cancelación.
    """
    ultima = (
        db.query(Reserva)
        .filter(
            Reserva.socio_id      == socio_id,
            Reserva.tipo          == TipoReserva.Membresia.value,
            Reserva.estado        == "confirmada",
            Reserva.es_recurrente == True,
        )
        .order_by(Reserva.fecha_clase.desc())
        .first()
    )

    socio = db.query(Socio).filter(Socio.id == socio_id).first()
    if ultima:
        socio.membresia_activa_hasta = datetime.strptime(
            ultima.fecha_clase, "%Y-%m-%d"
        ).date()
        socio.cuota_al_dia = True
    else:
        socio.membresia_activa_hasta = None
        socio.cuota_al_dia = False


# ── Schema ──
class RenovarMembresiaRequest(BaseModel):
    clase_ids: list[int]


# ─────────────────────────────────────────────
# ACTIVAR MEMBRESÍA
# ─────────────────────────────────────────────

@router.post("/activar")
def activar_membresia(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user  = obtener_usuario_actual(token=token, db=db)
    socio = db.query(Socio).filter(Socio.id == user.id).first()
    hoy   = date.today()

    socio.fecha_membresia_inicio = hoy
    socio.cuota_al_dia           = True

    _actualizar_membresia_activa_hasta(socio.id, db)

    if not socio.membresia_activa_hasta:
        _, ultimo_dia = monthrange(hoy.year, hoy.month)
        socio.membresia_activa_hasta = date(hoy.year, hoy.month, ultimo_dia)

    db.commit()
    db.refresh(socio)

    return {
        "mensaje":       "Membresía activada",
        "vigente_hasta": socio.membresia_activa_hasta
    }


# ─────────────────────────────────────────────
# RENOVABLES
# Lógica corregida: el botón solo aparece cuando hoy >= día 1 del mes
# siguiente al último mes reservado, Y el socio no tiene ya reservas
# confirmadas en ese mes destino.
# ─────────────────────────────────────────────

@router.get("/renovables")
def obtener_membresias_renovables(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(token=token, db=db)
    hoy   = date.today()

    # Traer todas las reservas de membresía confirmadas
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

        # Última fecha reservada confirmada para esta clase
        ultima = (
            db.query(Reserva)
            .filter(
                Reserva.socio_id      == socio.id,
                Reserva.clase_id      == r.clase_id,
                Reserva.tipo          == TipoReserva.Membresia.value,
                Reserva.estado        == "confirmada",
                Reserva.es_recurrente == True,
            )
            .order_by(Reserva.fecha_clase.desc())
            .first()
        )

        if not ultima:
            continue

        ultima_fecha = datetime.strptime(ultima.fecha_clase, "%Y-%m-%d").date()
        anio_ult, mes_ult = ultima_fecha.year, ultima_fecha.month
        anio_sig, mes_sig = _mes_siguiente(anio_ult, mes_ult)

        weekday = DIA_A_WEEKDAY.get(clase.dia.lower().strip(), -1)
        if weekday == -1:
            continue

        fechas_mes_sig = _calcular_fechas_mes(anio_sig, mes_sig, weekday)

        # ── Solo ocultar si ya tiene confirmada en el mes destino (ya pagó) ──
        # pendiente_pago NO oculta el botón — el socio todavía tiene que pagar
        ya_confirmado = db.query(Reserva).filter(
            Reserva.socio_id      == socio.id,
            Reserva.clase_id      == r.clase_id,
            Reserva.tipo          == TipoReserva.Membresia.value,
            Reserva.estado        == "confirmada",
            Reserva.es_recurrente == True,
            Reserva.fecha_clase.in_(fechas_mes_sig),
        ).first()

        if ya_confirmado:
            continue

        resultado.append({
            "clase_id":               clase.id,
            "actividad":              clase.actividad,
            "dia":                    clase.dia,
            "horario":                str(clase.horario)[:5],
            "precio_individual":      clase.precio_individual,
            "ultima_fecha_reservada": str(ultima_fecha),
            "mes_renovacion":         f"{mes_sig:02d}/{anio_sig}",
            "anio_dest":              anio_sig,
            "mes_dest":               mes_sig,
            "fechas_mes":             fechas_mes_sig,
            "total_clases":           len(fechas_mes_sig),
        })

    return resultado


# ─────────────────────────────────────────────
# COTIZAR RENOVACIÓN
# ─────────────────────────────────────────────

@router.post("/cotizar-renovacion")
def cotizar_renovacion(
    datos: RenovarMembresiaRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(token=token, db=db)
    hoy   = date.today()

    resultado = []

    for clase_id in datos.clase_ids:
        clase = db.query(Clase).filter(Clase.id == clase_id).first()
        if not clase:
            raise HTTPException(status_code=404, detail=f"Clase {clase_id} no encontrada")

        # Buscar la última reserva confirmada para determinar el mes a renovar
        ultima = (
            db.query(Reserva)
            .filter(
                Reserva.socio_id      == socio.id,
                Reserva.clase_id      == clase_id,
                Reserva.tipo          == TipoReserva.Membresia.value,
                Reserva.estado        == "confirmada",
                Reserva.es_recurrente == True,
            )
            .order_by(Reserva.fecha_clase.desc())
            .first()
        )

        if not ultima:
            raise HTTPException(
                status_code=400,
                detail=f"No tenés membresía activa para la clase {clase.actividad}"
            )

        ultima_fecha = datetime.strptime(ultima.fecha_clase, "%Y-%m-%d").date()
        anio_ult, mes_ult = ultima_fecha.year, ultima_fecha.month
        anio_sig, mes_sig = _mes_siguiente(anio_ult, mes_ult)

        weekday = DIA_A_WEEKDAY.get(clase.dia.lower().strip(), -1)
        if weekday == -1:
            raise HTTPException(status_code=400, detail=f"Dia invalido para la clase {clase.actividad}")

        # Verificar que no tenga ya reservas para el mes destino
        fechas_mes = _calcular_fechas_mes(anio_sig, mes_sig, weekday)
        ya_renovado = db.query(Reserva).filter(
            Reserva.socio_id      == socio.id,
            Reserva.clase_id      == clase_id,
            Reserva.tipo          == TipoReserva.Membresia.value,
            Reserva.estado.in_(["confirmada", "pendiente_pago"]),
            Reserva.es_recurrente == True,
            Reserva.fecha_clase.in_(fechas_mes),
        ).first()
        if ya_renovado:
            raise HTTPException(
                status_code=400,
                detail=f"Ya tenés el cupo reservado para {mes_sig:02d}/{anio_sig}. Podrás pagarlo a partir del 1/{mes_sig:02d}/{anio_sig}."
            )

        fechas_mes = _calcular_fechas_mes(anio_sig, mes_sig, weekday)

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
            "mes_label":  f"{mes_sig:02d}/{anio_sig}",
        })

    return resultado


# ─────────────────────────────────────────────
# PROCESAR VENCIMIENTOS
# Llamado por el scheduler el día 1 de cada mes.
# También queda disponible como endpoint HTTP para forzar manualmente.
# ─────────────────────────────────────────────

@router.post("/procesar-vencimientos")
def procesar_vencimientos(db: Session = Depends(get_db)):
    hoy = date.today()
    primer_dia_mes_actual = date(hoy.year, hoy.month, 1)

    socios_afectados = set()

    # 1. Confirmadas del mes pasado → "vencida" (mantiene historial)
    reservas_confirmadas = db.query(Reserva).filter(
        Reserva.es_recurrente == True,
        Reserva.estado        == "confirmada",
        Reserva.fecha_clase   <  str(primer_dia_mes_actual),
    ).all()

    for reserva in reservas_confirmadas:
        reserva.estado = "vencida"
        socios_afectados.add(reserva.socio_id)

    # 2. Pendientes del mes pasado → "cancelada" (no renovaron, liberar cupo)
    reservas_pendientes = db.query(Reserva).filter(
        Reserva.es_recurrente == True,
        Reserva.estado        == "pendiente_pago",
        Reserva.fecha_clase   <  str(primer_dia_mes_actual),
    ).all()

    for reserva in reservas_pendientes:
        reserva.estado = "cancelada"
        socios_afectados.add(reserva.socio_id)

    db.flush()

    # 3. Recalcular membresía para cada socio afectado
    for socio_id in socios_afectados:
        _actualizar_membresia_activa_hasta(socio_id, db)

    db.commit()

    return {
        "reservas_vencidas":   len(reservas_confirmadas),
        "pendientes_canceladas": len(reservas_pendientes),
    }

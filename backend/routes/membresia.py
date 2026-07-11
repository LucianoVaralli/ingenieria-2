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
from schemas.membresia import RenovarMembresiaRequest

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


def _calcular_clases_perdidas(fechas: list[str]) -> int:
    """Cuenta cuántas fechas de la lista ya pasaron respecto a hoy.
    (Duplicado intencional de reserva.py: no se importa desde ahí para
    evitar import circular, ya que reserva.py importa cosas de este módulo.)
    """
    hoy = date.today()
    return sum(
        1 for f in fechas
        if datetime.strptime(f, "%Y-%m-%d").date() < hoy
    )


def _calcular_monto_membresia(total_clases: int, clases_perdidas: int, precio_por_clase: float) -> dict:
    """Misma fórmula que crear_reserva_membresia en reserva.py:
    20% del monto base del mes, acumulativo por cada clase perdida.
    """
    monto_base_mes = total_clases * precio_por_clase
    descuento_por_clase_perdida = monto_base_mes * 0.20
    descuento_total = clases_perdidas * descuento_por_clase_perdida
    monto_total = max(0, monto_base_mes - descuento_total)

    return {
        "monto_base_mes":     round(monto_base_mes, 2),
        "clases_perdidas":    clases_perdidas,
        "descuento_aplicado": round(descuento_total, 2),
        "monto_total":        round(monto_total, 2),
    }


def _actualizar_membresia_activa_hasta(socio_id: int, db: Session):
    ultima = (
        db.query(Reserva)
        .filter(
            Reserva.socio_id      == socio_id,      # ← socio_id, no socio.id
            Reserva.tipo          == TipoReserva.Membresia.value,
            Reserva.estado        == "confirmada",
            Reserva.es_recurrente == True,
            # No filtra por clase_id — busca la última de CUALQUIER clase
        )
        .order_by(Reserva.fecha_clase.desc())
        .first()
    )

    socio = db.query(Socio).filter(Socio.id == socio_id).first()
    if ultima:
        ultima_fecha = datetime.strptime(ultima.fecha_clase, "%Y-%m-%d").date()
        anio_sig, mes_sig = _mes_siguiente(ultima_fecha.year, ultima_fecha.month)
        socio.membresia_activa_hasta = date(anio_sig, mes_sig, 1)
        socio.cuota_al_dia = True
    else:
        socio.membresia_activa_hasta = None
        socio.cuota_al_dia = False


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
#
# Regla de anticipación:
#   - Se busca la última reserva confirmada para determinar hasta qué mes llegó el socio.
#   - El mes destino es siempre el mes siguiente a esa última reserva confirmada.
#   - Si ese mes destino ya tiene reservas CONFIRMADAS → ya pagó, no mostrar.
#   - Si tiene pendiente_pago → todavía no pagó ese mes, mostrar botón para pagar.
#   - Límite EXPLÍCITO de 1 mes de anticipación respecto a hoy:
#     Si el mes destino es posterior al mes siguiente al actual, se bloquea.
#     Esto evita que al renovar anticipadamente se habilite el siguiente mes
#     indefinidamente (ya que pagar crea pendiente_pago del mes subsiguiente).
# ─────────────────────────────────────────────

@router.get("/renovables")
def obtener_membresias_renovables(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(token=token, db=db)
    hoy   = date.today()

    # Traer todas las reservas de membresía confirmadas o pendiente_pago
    reservas = db.query(Reserva).filter(
        Reserva.socio_id      == socio.id,
        Reserva.tipo          == TipoReserva.Membresia.value,
        Reserva.estado.in_(["confirmada", "pendiente_pago"]),
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

        # última fecha considerando confirmada Y pendiente_pago
        # Así si pagó julio anticipado (confirmada) y tiene agosto en pendiente_pago,
        # la "ultima" apunta a agosto → propone renovar septiembre... pero agosto
        # aún no existe como pendiente_pago de septiembre, así que no aparece.
        # Si tiene junio confirmada y julio pendiente_pago → propone julio → lo muestra.
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

        # ── Calcular el monto real con el mismo criterio que cotizar-renovacion:
        # 20% acumulativo del monto base por cada clase del mes destino que
        # ya haya pasado (puede pasar si el socio abre el modal después de
        # que ya arrancó el mes que está renovando). Sin esto, la vista previa
        # del modal mostraba precio_individual * total_clases sin descuento. ──
        clases_perdidas_preview = _calcular_clases_perdidas(fechas_mes_sig)
        calculo_preview = _calcular_monto_membresia(
            total_clases     = len(fechas_mes_sig),
            clases_perdidas  = clases_perdidas_preview,
            precio_por_clase = clase.precio_individual,
        )

        # ── LÍMITE EXPLÍCITO: máximo 1 mes de anticipación desde hoy ──
        # Aunque existan pendiente_pago para meses futuros (creados al pagar
        # el mes anterior con anticipo), no se permite renovar más de 1 mes adelante.
        anio_limite, mes_limite = _mes_siguiente(hoy.year, hoy.month)
        mes_destino_inicio = date(anio_sig, mes_sig, 1)
        mes_limite_inicio  = date(anio_limite, mes_limite, 1)

        if mes_destino_inicio > mes_limite_inicio:
            continue

        # Solo ocultar si el mes destino ya tiene reservas CONFIRMADAS (ya pagó).
        # pendiente_pago en el mes destino → todavía no pagó, mostrar botón.
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

        # Verificar que exista al menos un pendiente_pago en el mes destino
        # (límite natural: solo se puede pagar el mes que ya tiene cupo pre-reservado)
        tiene_pendiente = db.query(Reserva).filter(
            Reserva.socio_id      == socio.id,
            Reserva.clase_id      == r.clase_id,
            Reserva.tipo          == TipoReserva.Membresia.value,
            Reserva.estado        == "pendiente_pago",
            Reserva.es_recurrente == True,
            Reserva.fecha_clase.in_(fechas_mes_sig),
        ).first()

        if not tiene_pendiente:
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
            "clases_perdidas":        calculo_preview["clases_perdidas"],
            "descuento_aplicado":     calculo_preview["descuento_aplicado"],
            "monto_base_mes":         calculo_preview["monto_base_mes"],
            "monto_total":            calculo_preview["monto_total"],
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

        # Buscar última reserva confirmada para determinar el mes a renovar.
        ultima = (
            db.query(Reserva)
            .filter(
                Reserva.socio_id      == socio.id,
                Reserva.clase_id      == clase_id,
                Reserva.tipo          == TipoReserva.Membresia.value,
                Reserva.estado        == "confirmada",   # ← solo confirmada
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

        fechas_mes = _calcular_fechas_mes(anio_sig, mes_sig, weekday)

        # ── LÍMITE EXPLÍCITO: máximo 1 mes de anticipación desde hoy ──
        anio_limite, mes_limite = _mes_siguiente(hoy.year, hoy.month)
        mes_destino_inicio = date(anio_sig, mes_sig, 1)
        mes_limite_inicio  = date(anio_limite, mes_limite, 1)

        if mes_destino_inicio > mes_limite_inicio:
            raise HTTPException(
                status_code=400,
                detail=f"Solo podés renovar hasta 1 mes de anticipación. "
                       f"El mes {mes_sig:02d}/{anio_sig} todavía no está disponible para renovar."
            )

        # Solo bloquear si el mes destino ya está CONFIRMADO (ya pagó).
        # Si está en pendiente_pago → es el mes a pagar, continuar normalmente.
        ya_confirmado = db.query(Reserva).filter(
            Reserva.socio_id      == socio.id,
            Reserva.clase_id      == clase_id,
            Reserva.tipo          == TipoReserva.Membresia.value,
            Reserva.estado        == "confirmada",
            Reserva.es_recurrente == True,
            Reserva.fecha_clase.in_(fechas_mes),
        ).first()

        if ya_confirmado:
            raise HTTPException(
                status_code=400,
                detail=f"Ya tenés la membresía confirmada para {mes_sig:02d}/{anio_sig}."
            )

        # Verificar que exista pendiente_pago en el mes destino (límite de 1 mes)
        tiene_pendiente = db.query(Reserva).filter(
            Reserva.socio_id      == socio.id,
            Reserva.clase_id      == clase_id,
            Reserva.tipo          == TipoReserva.Membresia.value,
            Reserva.estado        == "pendiente_pago",
            Reserva.es_recurrente == True,
            Reserva.fecha_clase.in_(fechas_mes),
        ).first()

        if not tiene_pendiente:
            raise HTTPException(
                status_code=400,
                detail=f"No hay cupo pre-reservado para {mes_sig:02d}/{anio_sig}. Solo podés pagar 1 mes de anticipación."
            )

        if not fechas_mes:
            raise HTTPException(
                status_code=400,
                detail=f"No se encontraron fechas para renovar la clase {clase.actividad}"
            )

        # ── Calcular clases perdidas y monto con el mismo criterio que
        # una membresía nueva (20% acumulativo del monto base por cada
        # clase ya pasada dentro del mes que se está renovando) ──
        clases_perdidas = _calcular_clases_perdidas(fechas_mes)
        calculo = _calcular_monto_membresia(
            total_clases     = len(fechas_mes),
            clases_perdidas  = clases_perdidas,
            precio_por_clase = clase.precio_individual,
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
            "fechas_mes":         fechas_mes,
            "mes_label":          f"{mes_sig:02d}/{anio_sig}",
            "clases_perdidas":    calculo["clases_perdidas"],
            "descuento_aplicado": calculo["descuento_aplicado"],
            "monto_base_mes":     calculo["monto_base_mes"],
            "monto_total":        calculo["monto_total"],
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
        "reservas_vencidas":     len(reservas_confirmadas),
        "pendientes_canceladas": len(reservas_pendientes),
    }
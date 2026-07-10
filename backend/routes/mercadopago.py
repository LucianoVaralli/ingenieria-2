from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, date, timedelta

from dependencies.database import get_db
from models.reserva_MIO import Reserva
from models.clase import Clase
from schemas.mercadopago import (
    PreferenciaIndividualRequest,
    PreferenciaIndividualDirectaRequest,
    PreferenciaMembresiaRequest,
)
from services.auth import oauth2_scheme, obtener_usuario_actual
from services.mercadopago_service import (
    crear_preferencia_individual,
    crear_preferencia_individual_directa,
    crear_preferencia_membresia,
    procesar_pago_aprobado,
    FRONTEND_URL,
)

from models.enums import TipoReserva
from fastapi.responses import RedirectResponse
from typing import Optional

router = APIRouter(prefix="/mp", tags=["MercadoPago"])


@router.post("/preferencia/individual")
def preferencia_individual(
    datos: PreferenciaIndividualRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    LEGADO — usado únicamente por el flujo de "aceptar cupo desde
    lista de espera", donde sí existe una reserva pendiente_pago real
    (creada por /reservas/aceptar-cupo) que necesita el hold previo.
    Para el flujo normal de reserva individual, ver
    preferencia_individual_directa más abajo.
    """
    socio = obtener_usuario_actual(token=token, db=db)

    reserva = db.query(Reserva).filter(
        Reserva.id       == datos.reserva_id,
        Reserva.socio_id == socio.id,
        Reserva.estado   == "pendiente_pago",
    ).first()

    if not reserva:
        raise HTTPException(404, "Reserva no encontrada o ya procesada")

    clase = db.query(Clase).filter(Clase.id == reserva.clase_id).first()
    if not clase:
        raise HTTPException(404, "Clase no encontrada")

    # Confiamos en reserva.monto_pagado, ya calculado correctamente
    # al crear la reserva — no lo recalculamos acá con datos del cliente.
    if reserva.monto_pagado is None or reserva.monto_pagado <= 0:
        raise HTTPException(400, "La reserva no tiene un monto válido para pagar")

    pref = crear_preferencia_individual(reserva, clase)

    if "id" not in pref:
        raise HTTPException(500, f"Error de MP: {pref}")

    reserva.mp_preference_id = pref["id"]
    db.commit()

    init_point = pref.get("sandbox_init_point") or pref.get("init_point")
    return {"init_point": init_point}


@router.post("/preferencia/individual-directa")
def preferencia_individual_directa(
    datos: PreferenciaIndividualDirectaRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    🌟 NUEVO — flujo normal de reserva individual. No recibe ni crea
    ninguna reserva: solo valida y arma la preferencia de MP. La
    reserva real se crea en el webhook cuando el pago se aprueba
    (ver _confirmar_individual_directo en mercadopago_service.py).
    """
    socio = obtener_usuario_actual(token=token, db=db)

    clase = db.query(Clase).filter(Clase.id == datos.clase_id).first()
    if not clase:
        raise HTTPException(404, "Clase no encontrada")

    if datos.tipo_pago not in ["sena", "total"]:
        raise HTTPException(400, "Tipo de pago inválido")

    # Re-validamos acá: pudo pasar tiempo entre la cotización
    # (/reservas/individual/cotizar) y este click de pagar.
    fecha = datetime.strptime(datos.fecha_clase, "%Y-%m-%d").date()
    hoy   = date.today()
    if fecha < hoy or fecha > hoy + timedelta(days=7):
        raise HTTPException(400, "Fecha fuera de rango")

    conflicto = db.query(Reserva).join(Clase).filter(
        Reserva.socio_id    == socio.id,
        Clase.dia           == clase.dia,
        Clase.horario       == clase.horario,
        Reserva.fecha_clase == datos.fecha_clase,
        Reserva.estado.in_(["confirmada", "en_espera", "notificado"])
    ).first()
    if conflicto:
        raise HTTPException(400, "Ya tiene una reserva en ese horario")

    ocupadas = db.query(Reserva).filter(
        Reserva.clase_id    == clase.id,
        Reserva.fecha_clase == datos.fecha_clase,
        Reserva.estado      == "confirmada"
    ).count()
    if ocupadas >= clase.cupo:
        raise HTTPException(409, "El cupo ya no está disponible")

    monto = clase.precio_individual * 0.5 if datos.tipo_pago == "sena" else clase.precio_individual

    pref = crear_preferencia_individual_directa(
        socio_id    = socio.id,
        clase       = clase,
        fecha_clase = datos.fecha_clase,
        tipo_pago   = datos.tipo_pago,
        monto       = monto,
    )

    if "id" not in pref:
        raise HTTPException(500, f"Error de MP: {pref}")

    init_point = pref.get("sandbox_init_point") or pref.get("init_point")
    return {"init_point": init_point}


@router.post("/preferencia/membresia")
def preferencia_membresia(
    datos: PreferenciaMembresiaRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    socio = obtener_usuario_actual(token=token, db=db)

    clase = db.query(Clase).filter(Clase.id == datos.clase_id).first()
    if not clase:
        raise HTTPException(404, "Clase no encontrada")

    if not datos.fechas_con_cupo:
        raise HTTPException(400, "No hay fechas con cupo para reservar")

    if datos.monto_total <= 0:
        raise HTTPException(400, "El monto debe ser mayor a 0")

    pref = crear_preferencia_membresia(
        socio_id        = socio.id,
        clase           = clase,
        fechas_con_cupo = datos.fechas_con_cupo,
        monto_total     = datos.monto_total,
        creditos_a_usar = datos.creditos_a_usar,
    )

    print("PREF MEMBRESIA:", pref)

    if "id" not in pref:
        raise HTTPException(500, f"Error de MP: {pref}")

    init_point = pref.get("sandbox_init_point") or pref.get("init_point")
    return {
        "init_point":    init_point,
        "preference_id": pref["id"],
    }


@router.post("/webhook")
async def webhook_mp(request: Request, db: Session = Depends(get_db)):
    data = await request.json()

    if data.get("type") != "payment":
        return {"status": "ignored"}

    payment_id = str(data["data"]["id"])
    resultado  = await procesar_pago_aprobado(payment_id, db)

    return {"status": "ok", "resultado": resultado}


@router.get("/resultado-redirect")
async def resultado_redirect(
    status:     str,
    tipo:       str,
    payment_id: Optional[str] = None,
    clase_id:   Optional[int] = None,
    reserva_id: Optional[int] = None,
    db:         Session = Depends(get_db),
):
    if status == "approved" and payment_id:
        try:
            await procesar_pago_aprobado(payment_id, db)
        except Exception as e:
            print(f"Error procesando pago: {e}")

    # ── Si el usuario volvió sin pagar, cancelamos la reserva ──
    #
    # 🌟 Esto ahora solo puede aplicar al flujo LEGADO de aceptar-cupo
    # (reserva_id viene seteado). En el flujo directo nuevo no hay
    # reserva_id porque nunca se creó nada — no hace falta cancelar.
    elif status in ("failure", "pending") and reserva_id:
        reserva = db.query(Reserva).filter(
            Reserva.id     == reserva_id,
            Reserva.estado == "pendiente_pago",
            Reserva.tipo   == TipoReserva.Individual.value,
        ).first()
        if reserva:
            reserva.estado = "cancelada"
            db.commit()

    url = f"{FRONTEND_URL}/pago/resultado?status={status}&tipo={tipo}"
    if clase_id:
        url += f"&clase_id={clase_id}"
    if reserva_id:
        url += f"&reserva_id={reserva_id}"
    return RedirectResponse(url)
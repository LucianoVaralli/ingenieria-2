from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from dependencies.database import get_db
from models.reserva_MIO import Reserva
from models.clase import Clase
from schemas.mercadopago import PreferenciaIndividualRequest, PreferenciaMembresiaRequest
from services.auth import oauth2_scheme, obtener_usuario_actual
from services.mercadopago_service import (
    crear_preferencia_individual,
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

    if reserva.tipo == TipoReserva.Membresia.value:
        monto = clase.precio_individual  # membresía siempre 100%
    else:
        monto = (
            clase.precio_individual * 0.5
            if datos.tipo_pago == "sena"
            else clase.precio_individual
        )

    reserva.monto_pagado = monto

    pref = crear_preferencia_individual(reserva, clase)

    if "id" not in pref:
        raise HTTPException(500, f"Error de MP: {pref}")

    reserva.mp_preference_id = pref["id"]
    db.commit()

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

    print("PREF MEMBRESIA:", pref)  # ← para debug

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
    resultado  =await procesar_pago_aprobado(payment_id, db)

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
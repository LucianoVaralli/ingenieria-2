# services/mercadopago_service.py
import os
import mercadopago
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from dateutil.relativedelta import relativedelta
from dotenv import load_dotenv

from models.reserva_MIO import Reserva
from models.clase import Clase
from models.socio import Socio
from models.membresia import Membresia
from models.enums import TipoReserva
from routes.membresia import (
    _actualizar_membresia_activa_hasta,
    _calcular_fechas_mes,
    _mes_siguiente,
    DIA_A_WEEKDAY,
)
from services.mail_service import enviar_mail_pago_exitoso, enviar_mail_membresia

# ── Configuración ─────────────────────────────────────────────
load_dotenv()

# Todas estas variables se leen del .env (ver .env.example) — nunca hardcodeadas.
ACCESS_TOKEN = os.environ["MP_ACCESS_TOKEN"]
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
BACKEND_URL  = os.environ["BACKEND_URL"]          # ej: https://tu-url.ngrok-free.dev
WEBHOOK_URL  = f"{BACKEND_URL}/mp/webhook"
PAYER_EMAIL  = os.environ.get("MP_TEST_PAYER_EMAIL", "TESTUSER6649020759030573532@testuser.com")

sdk = mercadopago.SDK(ACCESS_TOKEN)


# ── Crear preferencia individual ──────────────────────────────

def crear_preferencia_individual(reserva: Reserva, clase: Clase) -> dict:
    preference_data = {
        "items": [{
            "title":       f"Clase individual: {clase.actividad.value}",
            "quantity":    1,
            "unit_price":  float(reserva.monto_pagado),
            "currency_id": "ARS",
        }],
        "payer": {
            "email": PAYER_EMAIL
        },
        "payment_methods": {
            "excluded_payment_types": [
                {"id": "ticket"},       # efectivo
                {"id": "prepaid_card"}, # tarjetas prepagas
            ]
        },
        "external_reference": f"individual:{reserva.id}",
        "back_urls": {
            "success": f"{BACKEND_URL}/mp/resultado-redirect?status=approved&tipo=individual&reserva_id={reserva.id}",
            "failure": f"{BACKEND_URL}/mp/resultado-redirect?status=failure&tipo=individual&reserva_id={reserva.id}",
            "pending": f"{BACKEND_URL}/mp/resultado-redirect?status=pending&tipo=individual&reserva_id={reserva.id}",
        },
        "auto_return": "approved",
        "notification_url":   WEBHOOK_URL,
    }

    result = sdk.preference().create(preference_data)
    print("RESPUESTA COMPLETA MP:", result)  # ← agregá esta línea
    pref = result["response"]
    return pref


# ── Crear preferencia membresía ───────────────────────────────

def crear_preferencia_membresia(
    socio_id: int,
    clase: Clase,
    fechas_con_cupo: list[str],
    monto_total: float,
    creditos_a_usar: int,
) -> dict:
    fechas_str = ",".join(fechas_con_cupo)
    preference_data = {
        "items": [{
            "title":       f"Membresía: {clase.actividad.value} — {clase.dia.value}",
            "quantity":    1,
            "unit_price":  float(monto_total),
            "currency_id": "ARS",
        }],
        "payer": {
            "email": PAYER_EMAIL
        },
        # Guardamos todo lo que necesitamos para confirmar en el webhook
        "external_reference": f"membresia:{socio_id}:{clase.id}:{fechas_str}:{creditos_a_usar}",
        "back_urls": {
            "success": f"{BACKEND_URL}/mp/resultado-redirect?status=approved&tipo=membresia&clase_id={clase.id}",
            "failure": f"{BACKEND_URL}/mp/resultado-redirect?status=failure&tipo=membresia&clase_id={clase.id}",
            "pending": f"{BACKEND_URL}/mp/resultado-redirect?status=pending&tipo=membresia&clase_id={clase.id}",
        },
        "auto_return": "approved",
        "notification_url": WEBHOOK_URL,
    }

    result = sdk.preference().create(preference_data)
    print("RESPUESTA COMPLETA MP:", result)  # ← agregá esta línea
    pref = result["response"]
    return pref


# ── Procesar webhook ──────────────────────────────────────────

async def procesar_pago_aprobado(payment_id: str, db: Session) -> str:
    """
    Consulta el pago a MP, verifica que esté aprobado,
    y confirma la reserva correspondiente.
    Retorna un string describiendo qué se procesó.
    """
    payment_info = sdk.payment().get(payment_id)
    payment      = payment_info["response"]

    if payment.get("status") != "approved":
        return "no_aprobado"

    external_ref = payment.get("external_reference", "")
    partes       = external_ref.split(":")

    if not external_ref or not partes:
        return "referencia_invalida"

    tipo = partes[0]

    # ¡Acá es donde necesitás agregar el await!
    if tipo == "individual":
        return await _confirmar_individual(partes, payment, db)

    elif tipo == "membresia":
        return await _confirmar_membresia(partes, payment, db)

    return "tipo_desconocido"


async def _confirmar_individual(partes: list[str], payment: dict, db: Session) -> str:
    reserva_id = int(partes[1])
    reserva    = db.query(Reserva).filter(Reserva.id == reserva_id).first()

    if not reserva or reserva.estado != "pendiente_pago":
        return "reserva_no_encontrada_o_ya_procesada"

    reserva.estado       = "confirmada"
    reserva.monto_pagado = payment["transaction_amount"]
    db.commit()
    
    socio = db.query(Socio).filter(Socio.id == reserva.socio_id).first()
    clase = db.query(Clase).filter(Clase.id == reserva.clase_id).first()
    try:
        await enviar_mail_pago_exitoso(socio, clase, reserva)
    except Exception as e:
        print(f"Mail no enviado: {e}")

    return f"individual:{reserva_id}:confirmada"


async def _confirmar_membresia(partes: list[str], payment: dict, db: Session) -> str:
    socio_id        = int(partes[1])
    clase_id        = int(partes[2])
    fechas_con_cupo = partes[3].split(",")
    creditos_a_usar = int(partes[4]) if len(partes) > 4 else 0
    monto_total     = payment["transaction_amount"]
    payment_id      = str(payment["id"])

    ya_procesado = db.query(Reserva).filter(
        Reserva.socio_id         == socio_id,
        Reserva.clase_id         == clase_id,
        Reserva.fecha_clase.in_(fechas_con_cupo),
        Reserva.estado           == "confirmada",
        Reserva.mp_preference_id == payment_id,
    ).first()

    if ya_procesado:
        return "ya_procesado"

    socio = db.query(Socio).filter(Socio.id == socio_id).first()
    clase = db.query(Clase).filter(Clase.id == clase_id).first()

    if not socio or not clase:
        return "socio_o_clase_no_encontrado"

    if creditos_a_usar > 0:
        socio.creditos_disponibles = max(0, socio.creditos_disponibles - creditos_a_usar)

    for fecha in fechas_con_cupo:
        ocupadas = db.query(Reserva).filter(
            Reserva.clase_id    == clase_id,
            Reserva.fecha_clase == fecha,
            Reserva.estado.in_(["confirmada", "pendiente_pago"])
        ).count()

        if ocupadas < clase.cupo:
            db.add(Reserva(
                socio_id         = socio_id,
                clase_id         = clase_id,
                tipo             = TipoReserva.Membresia.value,
                estado           = "confirmada",
                fecha_clase      = fecha,
                monto_total      = monto_total,
                monto_pagado     = monto_total,
                es_recurrente    = True,
                mp_preference_id = payment_id,
            ))

    weekday = DIA_A_WEEKDAY.get(clase.dia.lower().strip(), -1)
    if weekday != -1 and fechas_con_cupo:
        primera = datetime.strptime(sorted(fechas_con_cupo)[0], "%Y-%m-%d").date()
        anio_sig, mes_sig = _mes_siguiente(primera.year, primera.month)
        for fecha in _calcular_fechas_mes(anio_sig, mes_sig, weekday):
            ya_existe = db.query(Reserva).filter(
                Reserva.socio_id    == socio_id,
                Reserva.clase_id    == clase_id,
                Reserva.fecha_clase == fecha,
                Reserva.estado.in_(["confirmada", "pendiente_pago", "en_espera"])
            ).first()
            if ya_existe:
                continue
            ocupadas_sig = db.query(Reserva).filter(
                Reserva.clase_id    == clase_id,
                Reserva.fecha_clase == fecha,
                Reserva.estado.in_(["confirmada", "pendiente_pago"])
            ).count()
            if ocupadas_sig < clase.cupo:
                db.add(Reserva(
                    socio_id      = socio_id,
                    clase_id      = clase_id,
                    tipo          = TipoReserva.Membresia.value,
                    estado        = "pendiente_pago",
                    fecha_clase   = fecha,
                    monto_total   = 0,
                    monto_pagado  = 0,
                    es_recurrente = True,
                ))

    db.flush()
    _actualizar_membresia_activa_hasta(socio_id, db)

    membresia = db.query(Membresia).filter(
        Membresia.socio_id == socio_id,
        Membresia.clase_id == clase_id,
    ).first()

    ahora = datetime.now()
    if membresia:
        membresia.mes_vigente      = ahora.month
        membresia.anio_vigente     = ahora.year
        membresia.activa           = True
        membresia.fecha_expiracion = datetime(ahora.year, ahora.month, 1) + relativedelta(months=1)
    else:
        db.add(Membresia(
            socio_id     = socio_id,
            clase_id     = clase_id,
            mes_vigente  = ahora.month,
            anio_vigente = ahora.year,
            activa       = True,
        ))

    db.commit()

    try:
        await enviar_mail_membresia(
            socio=socio,
            clase=clase,
            fechas_confirmadas=fechas_con_cupo,
            fechas_lista_espera=[],
            monto_total=monto_total,
        )
    except Exception as e:
        print(f"Mail de membresía no enviado: {e}")

    return f"membresia:{socio_id}:{clase_id}:confirmada"
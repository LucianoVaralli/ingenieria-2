from models.socio import Socio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, datetime, time
from dependencies.database import get_db
from models.reserva_MIO      import Reserva
from models.lista_espera import ListaEspera
from models.clase        import Clase
from services.auth       import oauth2_scheme, obtener_usuario_actual
from schemas.reserva     import (
    ReservaMembresiaCreate,
    ConfirmarPagoMembresia,
    ListaEsperaMembresiaCreate,
)
from models.enums import Rol, TipoReserva
from sqlalchemy import func, case
from datetime import datetime
from dateutil.relativedelta import relativedelta


from schemas.reserva import (
    ReservaIndividualCreate,
    ConfirmarPagoIndividual,
    ListaEsperaIndividualCreate,
    ConfirmarPagoIndividualDirecto,  # 🌟 NUEVO — agregar en schemas/reserva.py
)
from schemas.reserva import ConfirmarPagoCupo

from models.membresia import Membresia

from models.tarjeta_simulada import TarjetaSimulada
from services.auth import validar_membresia
from services.mail_service import (
    enviar_mail_pago_exitoso,
    enviar_mail_lista_espera,
    enviar_mail_membresia,
    enviar_mail_error_pago,
    enviar_mail_cupo_disponible,
    enviar_mail_cancelacion_individual,
    enviar_mail_cancelacion_membresia,
    enviar_mail_cancelacion_sin_beneficio,
)
from datetime import timedelta

from routes.membresia import _actualizar_membresia_activa_hasta, _calcular_fechas_mes, _mes_siguiente, DIA_A_WEEKDAY

router = APIRouter(
    prefix="/reservas",
    tags=["Reservas"]
)


def _ya_tiene_reserva_en_horario(
    db: Session,
    socio_id: int,
    dia: str,
    horario: time,
    fechas: list[str]
) -> bool:
    return db.query(Reserva).join(Clase).filter(
        Reserva.socio_id == socio_id,
        Clase.dia        == dia,
        Clase.horario    == horario,
        Reserva.fecha_clase.in_(fechas),
        Reserva.estado.in_(["confirmada", "pendiente_pago", "en_espera"])
    ).first() is not None


def _calcular_clases_perdidas(fechas: list[str]) -> int:
    hoy = date.today()
    return sum(
        1 for f in fechas
        if datetime.strptime(f, "%Y-%m-%d").date() < hoy
    )


# ──────────────────────────────────────────────────────────────
# Endpoint 1: iniciar reserva con membresía (cotizar)
# ──────────────────────────────────────────────────────────────

@router.post("/membresia/crear")
def crear_reserva_membresia(
    datos: ReservaMembresiaCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = obtener_usuario_actual(token=token, db=db)
    socio = db.query(Socio).filter(Socio.id == user.id).first()

    hoy = date.today()

    if socio.membresia_activa_hasta and socio.membresia_activa_hasta < hoy:
        raise HTTPException(403, "Membresía vencida")

    clase = db.query(Clase).filter(Clase.id == datos.clase_id).first()

    if not clase or not clase.activa:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    fechas_pasadas = [f for f in datos.fechas_clase if datetime.strptime(f, "%Y-%m-%d").date() < hoy]
    
    limite = hoy + timedelta(days=7)

    fechas_futuras = []

    for f in datos.fechas_clase:
        fecha = datetime.strptime(f, "%Y-%m-%d").date()

        if fecha >= hoy:
            fechas_futuras.append(f)

    if not fechas_futuras:
        raise HTTPException(
            400,
            "No quedan clases futuras para este mes"
        )

    primera_fecha = datetime.strptime(
        fechas_futuras[0],
        "%Y-%m-%d"
    ).date()

    if primera_fecha < hoy:
        raise HTTPException(
            400,
            "No podés iniciar una membresía con una fecha pasada"
        )

    if primera_fecha > limite:
        raise HTTPException(
            400,
            "La primera clase de la membresía debe estar dentro de los próximos 7 días"
        )

    # ── FIX: verificar conflicto SOLO contra fechas que no sean del mismo
    # mes/clase que ya tiene reservada (para no bloquear renovaciones) ──
    fechas_sin_reserva_previa = []
    for fecha in fechas_futuras:
        ya_tiene = db.query(Reserva).join(Clase).filter(
            Reserva.socio_id    == socio.id,
            Clase.dia           == clase.dia,
            Clase.horario       == clase.horario,
            Reserva.fecha_clase == fecha,
            Reserva.estado.in_(["confirmada", "pendiente_pago", "en_espera"])
        ).first()
        if ya_tiene:
            if ya_tiene.clase_id != datos.clase_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Ya tiene una reserva en ese horario para el {fecha}."
                )
            if ya_tiene.estado == "pendiente_pago":
                fechas_sin_reserva_previa.append(fecha)
        else:
            fechas_sin_reserva_previa.append(fecha)

    fechas_a_procesar = fechas_sin_reserva_previa

    if not fechas_a_procesar:
        raise HTTPException(
            status_code=400,
            detail="Todas las fechas ya están reservadas para esta clase."
        )

    fechas_con_cupo = []
    fechas_sin_cupo = []

    for fecha in fechas_a_procesar:
        ocupadas = db.query(Reserva).filter(
            Reserva.clase_id    == datos.clase_id,
            Reserva.fecha_clase == fecha,
            Reserva.estado.in_(["confirmada", "pendiente_pago"])
        ).count()

        personas_en_espera = db.query(ListaEspera).filter(
            ListaEspera.clase_id == datos.clase_id,
            ListaEspera.fecha_clase == fecha,
            ListaEspera.estado == "esperando"
        ).count()


        if ocupadas < clase.cupo and personas_en_espera == 0:
            fechas_con_cupo.append(fecha)
        else:
            fechas_sin_cupo.append(fecha)

    total_clases    = len(datos.fechas_clase)
    clases_validas  = len(fechas_a_procesar)
    clases_perdidas = total_clases - clases_validas
    clases_a_reservar = len(fechas_a_procesar)

    creditos_disponibles = socio.creditos_disponibles
    creditos_a_usar = min(creditos_disponibles, clases_a_reservar)

    precio_por_clase = clase.precio_individual
    monto_base_mes   = total_clases * precio_por_clase

    descuento_por_clase_perdida = monto_base_mes * 0.20
    descuento_total             = clases_perdidas * descuento_por_clase_perdida
    monto_sin_creditos          = max(0, monto_base_mes - descuento_total)

    if clases_a_reservar > 0:
        precio_efectivo_por_clase = monto_sin_creditos / clases_a_reservar
        descuento_creditos        = creditos_a_usar * precio_efectivo_por_clase
    else:
        descuento_creditos = 0

    monto_total = max(0, monto_sin_creditos - descuento_creditos)

    return {
        "fechas_con_cupo":    fechas_con_cupo,
        "fechas_sin_cupo":    fechas_sin_cupo,
        "fechas_pasadas":     fechas_pasadas,
        "clases_perdidas":    clases_perdidas,
        "descuento_aplicado": round(descuento_total, 2),
        "creditos_a_usar":    creditos_a_usar,
        "descuento_creditos": round(descuento_creditos, 2),
        "monto_total":        round(monto_total, 2),
        "hay_lista_espera":   len(fechas_sin_cupo) > 0,
    }


# ──────────────────────────────────────────────────────────────
# Endpoint: agregar a lista de espera de membresía sin pago
# ──────────────────────────────────────────────────────────────

@router.post("/membresia/lista-espera")
def agregar_lista_espera_membresia(
    datos: ListaEsperaMembresiaCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = obtener_usuario_actual(token=token, db=db)
    socio = db.query(Socio).filter(Socio.id == user.id).first()

    clase = db.query(Clase).filter(Clase.id == datos.clase_id).first()
    if not clase:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    for fecha in datos.fechas_sin_cupo:
        ya_en_espera = db.query(ListaEspera).filter(
            ListaEspera.socio_id    == socio.id,
            ListaEspera.clase_id    == datos.clase_id,
            ListaEspera.fecha_clase == fecha,
            ListaEspera.estado      == "esperando"
        ).first()

        if ya_en_espera:
            continue

        reserva_espera = Reserva(
            socio_id      = socio.id,
            clase_id      = datos.clase_id,
            tipo          = TipoReserva.Membresia.value,
            estado        = "en_espera",
            fecha_clase   = fecha,
            monto_total   = 0,
            monto_pagado  = 0,
        )
        db.add(reserva_espera)
        db.add(ListaEspera(
            socio_id    = socio.id,
            clase_id    = datos.clase_id,
            fecha_clase = fecha,
            tipo        = TipoReserva.Membresia.value,
            estado      = "esperando"
        ))

    db.commit()

    return {"mensaje": "Agregado a lista de espera correctamente"}


# ──────────────────────────────────────────────────────────────
# Endpoint: confirmar pago membresía
# ──────────────────────────────────────────────────────────────

@router.post("/membresia/pagar")
async def confirmar_pago_membresia(
    datos: ConfirmarPagoMembresia,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = db.query(Socio).filter(
        Socio.id == obtener_usuario_actual(token=token, db=db).id
    ).first()

    clase = db.query(Clase).filter(Clase.id == datos.clase_id).first()
    if not clase:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    if datos.creditos_a_usar > 0:
        if socio.creditos_disponibles < datos.creditos_a_usar:
            raise HTTPException(status_code=400, detail="No tenés créditos suficientes.")
        socio.creditos_disponibles -= datos.creditos_a_usar

    if datos.monto_total > 0:
        if datos.numero_tarjeta:
            numero_limpio      = datos.numero_tarjeta.replace(" ", "")
            titular_normalized = " ".join(datos.titular.split())

            tarjeta = db.query(TarjetaSimulada).filter(
                TarjetaSimulada.numero == numero_limpio,
                func.lower(TarjetaSimulada.titular) == titular_normalized.lower(),
                TarjetaSimulada.cvv == datos.cvv,
                TarjetaSimulada.fecha_vencimiento == datos.fecha_vencimiento
            ).first()

            if not tarjeta:
                raise HTTPException(status_code=400, detail="Tarjeta inválida")
            if not tarjeta.conexion_exitosa:
                raise HTTPException(status_code=400, detail="Hay inconvenientes con la conexión al banco")
            if tarjeta.saldo < datos.monto_total:
                raise HTTPException(status_code=400, detail="La cuenta no tiene saldo suficiente")

            tarjeta.saldo -= datos.monto_total
        elif not datos.pago_exitoso:
            raise HTTPException(status_code=402, detail="No se pudo procesar el pago.")

    reservas_creadas = []
    for fecha in datos.fechas_con_cupo:
        ocupadas = db.query(Reserva).filter(
            Reserva.clase_id    == datos.clase_id,
            Reserva.fecha_clase == fecha,
            Reserva.estado.in_(["confirmada", "pendiente_pago"]),
            Reserva.socio_id    != socio.id,
        ).count()

        if ocupadas < clase.cupo:
            reserva_existente = db.query(Reserva).filter(
                Reserva.socio_id    == socio.id,
                Reserva.clase_id    == datos.clase_id,
                Reserva.fecha_clase == fecha,
                Reserva.estado      == "pendiente_pago",
                Reserva.es_recurrente == True,
            ).first()

            if reserva_existente:
                reserva_existente.estado       = "confirmada"
                reserva_existente.monto_total  = datos.monto_total
                reserva_existente.monto_pagado = datos.monto_total
                reservas_creadas.append(reserva_existente)
            else:
                r = Reserva(
                    socio_id      = socio.id,
                    clase_id      = datos.clase_id,
                    tipo          = TipoReserva.Membresia.value,
                    estado        = "confirmada",
                    fecha_clase   = fecha,
                    monto_total   = datos.monto_total,
                    monto_pagado  = datos.monto_total,
                    es_recurrente = True,
                )
                db.add(r)
                reservas_creadas.append(r)

    weekday = DIA_A_WEEKDAY.get(clase.dia.lower().strip(), -1)
    if weekday != -1 and datos.fechas_con_cupo:
        primera_fecha_pagada = datetime.strptime(
            sorted(datos.fechas_con_cupo)[0], "%Y-%m-%d"
        ).date()
        anio_sig, mes_sig = _mes_siguiente(primera_fecha_pagada.year, primera_fecha_pagada.month)
        fechas_mes_sig    = _calcular_fechas_mes(anio_sig, mes_sig, weekday)

        for fecha in fechas_mes_sig:
            ya_existe = db.query(Reserva).filter(
                Reserva.socio_id    == socio.id,
                Reserva.clase_id    == datos.clase_id,
                Reserva.fecha_clase == fecha,
                Reserva.estado.in_(["confirmada", "pendiente_pago", "en_espera"])
            ).first()
            if ya_existe:
                continue

            ocupadas_sig = db.query(Reserva).filter(
                Reserva.clase_id    == datos.clase_id,
                Reserva.fecha_clase == fecha,
                Reserva.estado.in_(["confirmada", "pendiente_pago"]),
                Reserva.socio_id    != socio.id,
            ).count()

            if ocupadas_sig < clase.cupo:
                db.add(Reserva(
                    socio_id      = socio.id,
                    clase_id      = datos.clase_id,
                    tipo          = TipoReserva.Membresia.value,
                    estado        = "pendiente_pago",
                    fecha_clase   = fecha,
                    monto_total   = 0,
                    monto_pagado  = 0,
                    es_recurrente = True,
                ))

    db.commit()

    _actualizar_membresia_activa_hasta(socio.id, db)
    db.commit()

    membresia = db.query(Membresia).filter(
        Membresia.socio_id == socio.id,
        Membresia.clase_id == datos.clase_id
    ).first()

    if membresia:

        membresia.mes_vigente = datetime.now().month
        membresia.anio_vigente = datetime.now().year
        membresia.activa = True
        membresia.fecha_expiracion = datetime(
            membresia.anio_vigente,
            membresia.mes_vigente,
            1
        ) + relativedelta(months=1)

    else:

        membresia = Membresia(
            socio_id=socio.id,
            clase_id=datos.clase_id,
            mes_vigente=datetime.now().month,
            anio_vigente=datetime.now().year,
            activa=True
        )

        db.add(membresia)

    db.commit()


    try:
        await enviar_mail_membresia(
            socio=socio,
            clase=clase,
            fechas_confirmadas=datos.fechas_con_cupo,
            fechas_lista_espera=[],
            monto_total=datos.monto_total
        )
    except Exception as e:
        print(f" Mail no enviado: {e}")

    return {
        "mensaje":              "Reserva procesada",
        "reservas_confirmadas": len(reservas_creadas),
        "monto_pagado":         datos.monto_total,
    }
 
# ──────────────────────────────────────────────────────────────
# Función auxiliar: notificar al siguiente en lista de espera
# ──────────────────────────────────────────────────────────────

def _notificar_siguiente_en_espera(
    db: Session,
    clase_id: int,
    fecha_clase: str
) -> ListaEspera | None:
    siguiente = db.query(ListaEspera).filter(
        ListaEspera.clase_id    == clase_id,
        ListaEspera.fecha_clase == fecha_clase,
        ListaEspera.estado      == "esperando"
    ).order_by(
        case(
            (ListaEspera.tipo == TipoReserva.Membresia.value, 0),
            else_=1
        ),
        ListaEspera.fecha_ingreso.asc()
    ).first()

    if siguiente:
        siguiente.estado = "notificado"

        reserva_espera = db.query(Reserva).filter(
            Reserva.socio_id    == siguiente.socio_id,
            Reserva.clase_id    == siguiente.clase_id,
            Reserva.fecha_clase == siguiente.fecha_clase,
            Reserva.estado      == "en_espera"
        ).first()

        if reserva_espera:
            reserva_espera.estado = "notificado"
        db.commit()

    return siguiente


# ──────────────────────────────────────────────────────────────
# Endpoint: cancelar reserva de membresía confirmada
# ──────────────────────────────────────────────────────────────

@router.post("/membresia/cancelar/{reserva_id}")
async def cancelar_reserva_membresia(
    reserva_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(db=db, token=token)

    reserva = db.query(Reserva).filter(
        Reserva.id       == reserva_id,
        Reserva.socio_id == socio.id,
        Reserva.estado   == "confirmada"
    ).first()

    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    if reserva.tipo != TipoReserva.Membresia.value:
        raise HTTPException(status_code=400, detail="Esta reserva no es de membresía")

    clase = db.query(Clase).filter(Clase.id == reserva.clase_id).first()
    horario_str = str(clase.horario)[:5]
    fecha_hora_clase = datetime.strptime(
        f"{reserva.fecha_clase} {horario_str}",
        "%Y-%m-%d %H:%M"
    )

    ahora = datetime.now()

    if ahora >= fecha_hora_clase:
        raise HTTPException(
            status_code=400,
            detail="No se puede cancelar una clase que ya comenzó"
        )

    horas_restantes = (fecha_hora_clase - ahora).total_seconds() / 3600
    credito_otorgado = horas_restantes >= 48

    if credito_otorgado:
        socio.creditos_disponibles += 1
        reserva.credito_generado = True

    reserva.estado = "cancelada"
    reserva.tipo_cancelacion = "socio"
    reserva.motivo_cancelacion = "Cancelación voluntaria"

    db.commit()

    siguiente = _notificar_siguiente_en_espera(db, reserva.clase_id, reserva.fecha_clase)
    db.commit()

    # Enviar mail de cancelación
    try:
        if credito_otorgado:
            await enviar_mail_cancelacion_membresia(
                socio=socio,
                clase=clase,
                reserva=reserva
            )
        else:
            await enviar_mail_cancelacion_sin_beneficio(
                socio=socio,
                clase=clase,
                reserva=reserva
            )
    except Exception as e:
        print(f"Mail de cancelación no enviado: {e}")

    if siguiente:
        siguiente_socio = db.query(Socio).filter(Socio.id == siguiente.socio_id).first()
        if siguiente_socio:
            try:
                await enviar_mail_cupo_disponible(siguiente_socio, clase, siguiente.fecha_clase)
            except Exception as e:
                print(f" Mail de cupo disponible no enviado: {e}")

    mensaje = (
        "Cancelación exitosa con crédito otorgado"
        if credito_otorgado
        else "Cancelación exitosa sin crédito otorgado"
    )

    return {
        "mensaje": mensaje,
        "credito_otorgado": credito_otorgado,
        "creditos_disponibles": socio.creditos_disponibles,
        "notificado": siguiente is not None
    }


# ──────────────────────────────────────────────────────────────
# Endpoint: cancelar reserva individual confirmada
# ──────────────────────────────────────────────────────────────

@router.delete("/individual/cancelar-confirmada/{reserva_id}")
async def cancelar_reserva_individual_confirmada(
    reserva_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(db=db, token=token)

    reserva = db.query(Reserva).filter(
        Reserva.id       == reserva_id,
        Reserva.socio_id == socio.id,
        Reserva.tipo     == TipoReserva.Individual.value,
        Reserva.estado   == "confirmada"
    ).first()

    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    clase = db.query(Clase).filter(Clase.id == reserva.clase_id).first()
    horario_str = str(clase.horario)[:5]
    fecha_hora_clase = datetime.strptime(
        f"{reserva.fecha_clase} {horario_str}",
        "%Y-%m-%d %H:%M"
    )

    ahora = datetime.now()

    if ahora >= fecha_hora_clase:
        raise HTTPException(
            status_code=400,
            detail="No se puede cancelar una clase que ya comenzó"
        )

    horas_restantes = (fecha_hora_clase - ahora).total_seconds() / 3600
    reembolso = horas_restantes >= 24

    reserva.estado = "cancelada"
    reserva.tipo_cancelacion = "socio"
    reserva.motivo_cancelacion = "Cancelación voluntaria"

    if reembolso:
        reserva.reembolso_realizado = True

    db.commit()

    siguiente = _notificar_siguiente_en_espera(db, reserva.clase_id, reserva.fecha_clase)
    db.commit()

    # Enviar mail de cancelación
    try:
        if reembolso:
            await enviar_mail_cancelacion_individual(
                socio=socio,
                clase=clase,
                reserva=reserva,
                monto_devolucion=reserva.monto_pagado
            )
        else:
            await enviar_mail_cancelacion_sin_beneficio(
                socio=socio,
                clase=clase,
                reserva=reserva
            )
    except Exception as e:
        print(f"Mail de cancelación no enviado: {e}")

    if siguiente:
        siguiente_socio = db.query(Socio).filter(Socio.id == siguiente.socio_id).first()
        if siguiente_socio:
            try:
                await enviar_mail_cupo_disponible(siguiente_socio, clase, siguiente.fecha_clase)
            except Exception as e:
                print(f" Mail de cupo disponible no enviado: {e}")

    mensaje = (
        "Cancelación exitosa con devolución"
        if reembolso
        else "Cancelación exitosa sin devolución"
    )

    return {
        "mensaje": mensaje,
        "reembolso": reembolso,
        "notificado": siguiente is not None
    }


# ──────────────────────────────────────────────────────────────
# Endpoint: aceptar cupo notificado desde lista de espera
# 🌟 Este flujo SIGUE usando pendiente_pago con hold — acá sí
# hace falta reservarle el lugar al socio con prioridad mientras
# paga, porque viene de una notificación de cupo liberado.
# ──────────────────────────────────────────────────────────────

@router.post("/aceptar-cupo/{reserva_id}")
def aceptar_cupo(
    reserva_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Solo cambia a pendiente_pago y devuelve datos. NO procesa pago."""
    socio = obtener_usuario_actual(db=db, token=token)

    reserva = db.query(Reserva).filter(
        Reserva.id       == reserva_id,
        Reserva.socio_id == socio.id,
        Reserva.estado.in_(["pendiente_pago", "notificado"])
    ).first()

    if not reserva:
        raise HTTPException(
            status_code=404,
            detail="Reserva no encontrada o ya fue procesada"
        )

    if reserva.estado == "confirmada":
        raise HTTPException(
            status_code=409,
            detail="Esta reserva ya fue confirmada"
        )

    clase = db.query(Clase).filter(Clase.id == reserva.clase_id).first()

    ocupadas = db.query(Reserva).filter(
        Reserva.clase_id    == clase.id,
        Reserva.fecha_clase == reserva.fecha_clase,
        Reserva.estado      == "confirmada"
    ).count()

    if ocupadas >= clase.cupo:
        reserva.estado = "en_espera"

        entrada_lista = db.query(ListaEspera).filter(
            ListaEspera.socio_id    == socio.id,
            ListaEspera.clase_id    == reserva.clase_id,
            ListaEspera.fecha_clase == reserva.fecha_clase,
            ListaEspera.estado      == "notificado"
        ).first()

        if entrada_lista:
            entrada_lista.estado = "esperando"

        db.commit()

        raise HTTPException(
            status_code=409,
            detail="El cupo ya no está disponible"
        )

    reserva.estado = "pendiente_pago"

    if reserva.tipo == TipoReserva.Membresia.value:
        monto_total = clase.precio_individual
        monto_50 = 0
    else:
        monto_total = clase.precio_individual
        monto_50 = clase.precio_individual * 0.5

    entrada_lista = db.query(ListaEspera).filter(
        ListaEspera.socio_id    == socio.id,
        ListaEspera.clase_id    == reserva.clase_id,
        ListaEspera.fecha_clase == reserva.fecha_clase,
        ListaEspera.estado      == "notificado"
    ).first()

    if entrada_lista:
        db.delete(entrada_lista)

    db.commit()

    return {
        "mensaje": "Listo para pagar",
        "reserva_id": reserva.id,
        "tipo_reserva": reserva.tipo.value if hasattr(reserva.tipo, 'value') else str(reserva.tipo).lower(),
        "clase": {
            "id": clase.id,
            "actividad": clase.actividad,
            "dia": clase.dia,
            "horario": str(clase.horario),
            "precio_individual": clase.precio_individual
        },
        "fecha_clase": reserva.fecha_clase,
        "monto_100": monto_total,
        "monto_50": monto_50
    }

@router.post("/rechazar-cupo/{reserva_id}")
async def rechazar_cupo(
    reserva_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(db=db, token=token)

    reserva = db.query(Reserva).filter(
        Reserva.id       == reserva_id,
        Reserva.socio_id == socio.id,
        Reserva.estado   == "notificado"
    ).first()

    if not reserva:
        raise HTTPException(
            status_code=404,
            detail="No se encontró una reserva notificada para rechazar"
        )

    clase = db.query(Clase).filter(Clase.id == reserva.clase_id).first()

    reserva.estado = "cancelada"
    reserva.tipo_cancelacion = "socio"
    reserva.motivo_cancelacion = "Rechazó cupo ofrecido"

    entrada_lista = db.query(ListaEspera).filter(
        ListaEspera.socio_id    == socio.id,
        ListaEspera.clase_id    == reserva.clase_id,
        ListaEspera.fecha_clase == reserva.fecha_clase,
        ListaEspera.estado      == "notificado"
    ).first()

    if entrada_lista:
        db.delete(entrada_lista)

    db.commit()

    siguiente = _notificar_siguiente_en_espera(db, reserva.clase_id, reserva.fecha_clase)
    db.commit()

    try:
        await enviar_mail_pago_exitoso(socio, clase, reserva)
    except Exception as e:
        print(f"⚠️ Mail no enviado: {e}")

    if siguiente:
        siguiente_socio = db.query(Socio).filter(Socio.id == siguiente.socio_id).first()
        if siguiente_socio:
            try:
                await enviar_mail_cupo_disponible(siguiente_socio, clase, siguiente.fecha_clase)
            except Exception as e:
                print(f" Mail de cupo disponible no enviado: {e}")

    return {
        "mensaje": "Cupo rechazado",
        "reserva_id": reserva.id,
        "clase": clase.actividad,
        "fecha": reserva.fecha_clase
    }


@router.post("/pagar-cupo/{reserva_id}")
async def pagar_cupo(
    reserva_id: int,
    datos: ConfirmarPagoCupo,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """Procesa el pago cuando alguien acepta un cupo notificado"""
    socio = obtener_usuario_actual(db=db, token=token)

    reserva = db.query(Reserva).filter(
        Reserva.id       == reserva_id,
        Reserva.socio_id == socio.id,
        Reserva.estado   == "pendiente_pago"
    ).first()

    if not reserva:
        raise HTTPException(
            status_code=404,
            detail="Reserva no encontrada o ya fue procesada"
        )

    clase = db.query(Clase).filter(Clase.id == reserva.clase_id).first()

    if reserva.tipo == TipoReserva.Membresia.value:
        monto = clase.precio_individual
    elif reserva.tipo == TipoReserva.Individual.value:
        monto = clase.precio_individual * 0.5 if datos.tipo_pago == "sena" else clase.precio_individual
    else:
        raise HTTPException(status_code=400, detail="Tipo de reserva inválido")

    if datos.usa_credito:
        if socio.creditos_disponibles < 1:
            raise HTTPException(status_code=400, detail="No tenés créditos disponibles")

        socio.creditos_disponibles -= 1
        reserva.estado = "confirmada"
        reserva.monto_pagado = 0

        db.commit()

        try:
            await enviar_mail_pago_exitoso(socio, clase, reserva)
        except Exception as e:
            print(f"⚠️ Mail no enviado: {e}")

        siguiente = _notificar_siguiente_en_espera(db, reserva.clase_id, reserva.fecha_clase)
        db.commit()

        if siguiente:
            siguiente_socio = db.query(Socio).filter(Socio.id == siguiente.socio_id).first()
            if siguiente_socio:
                try:
                    await enviar_mail_cupo_disponible(siguiente_socio, clase, siguiente.fecha_clase)
                except Exception as e:
                    print(f"⚠️ Mail de cupo disponible no enviado: {e}")

        return {"mensaje": "Cupo confirmado con crédito"}

    numero_limpio = datos.numero_tarjeta.replace(" ", "")
    titular_normalizado = " ".join(datos.titular.split())

    tarjeta = db.query(TarjetaSimulada).filter(
        TarjetaSimulada.numero == numero_limpio,
        func.lower(TarjetaSimulada.titular) == titular_normalizado.lower(),
        TarjetaSimulada.cvv == datos.cvv,
        TarjetaSimulada.fecha_vencimiento == datos.fecha_vencimiento
    ).first()

    if not tarjeta:
        raise HTTPException(status_code=400, detail="Tarjeta inválida")

    if not tarjeta.conexion_exitosa:
        raise HTTPException(status_code=400, detail="Hay inconvenientes con la conexión al banco")

    if tarjeta.saldo < monto:
        raise HTTPException(status_code=400, detail="La cuenta no tiene saldo suficiente")

    ocupadas = db.query(Reserva).filter(
        Reserva.clase_id    == clase.id,
        Reserva.fecha_clase == reserva.fecha_clase,
        Reserva.estado.in_(["confirmada", "notificado"])
    ).count()

    if ocupadas >= clase.cupo:
        raise HTTPException(
            status_code=409,
            detail="El cupo se llenó mientras procesabas el pago"
        )

    reserva.estado = "confirmada"
    reserva.monto_pagado = monto
    reserva.tarjeta_ultimos = tarjeta.numero
    reserva.tipo_tarjeta = tarjeta.tipo
    tarjeta.saldo -= monto

    db.commit()

    try:
        await enviar_mail_pago_exitoso(socio, clase, reserva)
    except Exception as e:
        print(f"⚠️ Mail no enviado: {e}")

    siguiente = _notificar_siguiente_en_espera(db, reserva.clase_id, reserva.fecha_clase)
    db.commit()

    if siguiente:
        siguiente_socio = db.query(Socio).filter(Socio.id == siguiente.socio_id).first()
        if siguiente_socio:
            try:
                await enviar_mail_cupo_disponible(siguiente_socio, clase, siguiente.fecha_clase)
            except Exception as e:
                print(f"⚠️ Mail de cupo disponible no enviado: {e}")

    return {
        "mensaje": "Cupo confirmado y reserva completada",
        "reserva_id": reserva.id,
        "clase": clase.actividad,
        "fecha": reserva.fecha_clase
    }

# Endpoint 4: mis reservas
@router.get("/mis-reservas")
def mis_reservas(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    db.rollback()
    socio = obtener_usuario_actual(db=db, token=token)
    hoy   = date.today()

    reservas = db.query(Reserva).filter(
        Reserva.socio_id == socio.id,
        Reserva.estado.in_(["confirmada", "en_espera", "pendiente_pago", "notificado"]),
        Reserva.fecha_clase >= str(hoy),
    ).order_by(Reserva.fecha_clase.asc()).all()

    resultado = []
    for r in reservas:
        clase = db.query(Clase).filter(Clase.id == r.clase_id).first()
        lista_espera = db.query(ListaEspera).filter(

        ListaEspera.socio_id == socio.id,

        ListaEspera.clase_id == r.clase_id,

        ListaEspera.fecha_clase == r.fecha_clase,

        ListaEspera.estado.in_(["esperando", "notificado"])

        ).first()

        resultado.append({
            "id":           r.id,
            "clase_id":     r.clase_id,
            "tipo":         r.tipo,
            "estado":       r.estado,
            "lista_espera": lista_espera is not None,
            "notificado":   lista_espera is not None and lista_espera.estado == "notificado",
            "fecha_clase":  str(r.fecha_clase),
            "monto_total":  r.monto_total,
            "monto_pagado": r.monto_pagado,
            "tipo_pago":    r.tipo_pago,
            "fecha_pago":   str(r.fecha_creacion) if r.fecha_creacion else None,
            "clase": {
                "actividad": clase.actividad if clase else None,
                "horario":   str(clase.horario) if clase else None,
                "dia":       clase.dia if clase else None,
                "duracion":  clase.duracion if clase else None,
            }
        })
    return resultado


# ──────────────────────────────────────────────────────────────
# Endpoint: lista de espera (admin)
# ──────────────────────────────────────────────────────────────

@router.get("/lista-espera")
def ver_lista_espera(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(db=db, token=token)

    entradas = db.query(ListaEspera).all()
    resultado = []
    for e in entradas:
        clase = db.query(Clase).filter(Clase.id == e.clase_id).first()
        from models.socio import Socio
        s = db.query(Socio).filter(Socio.id == e.socio_id).first()
        resultado.append({
            "id":            e.id,
            "socio":         f"{s.nombre} {s.apellido}" if s else e.socio_id,
            "clase":         clase.actividad if clase else e.clase_id,
            "fecha_clase":   e.fecha_clase,
            "tipo":          e.tipo,
            "estado":        e.estado,
            "fecha_ingreso": e.fecha_ingreso,
        })
    return resultado


# ──────────────────────────────────────────────────────────────
# Endpoint: verificar cupo individual
# 🌟 FIX: excluye la propia clase del chequeo de conflicto — ya no
# debería hacer falta en el flujo normal (no queda nada pendiente
# de Individual), pero se mantiene por las dudas / compatibilidad
# con el flujo de aceptar-cupo.
# ──────────────────────────────────────────────────────────────

@router.post("/individual/verificar-cupo")
def verificar_cupo(
    datos: ReservaIndividualCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(db=db, token=token)

    clase = db.query(Clase).filter(Clase.id == datos.clase_id).first()

    if not clase:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    conflicto = db.query(Reserva).join(Clase).filter(
        Reserva.socio_id    == socio.id,
        Clase.dia           == clase.dia,
        Clase.horario       == clase.horario,
        Reserva.fecha_clase == datos.fecha_clase,
        Reserva.estado.in_(["confirmada", "pendiente_pago", "en_espera"]),
    ).first()

    if conflicto:
        raise HTTPException(status_code=400, detail="Ya tiene una reserva en ese horario")

    ocupadas = db.query(Reserva).filter(
        Reserva.clase_id    == clase.id,
        Reserva.fecha_clase == datos.fecha_clase,
        Reserva.estado      == "confirmada"
    ).count()

    hay_cupo = ocupadas < clase.cupo

    return {
        "hay_cupo":             hay_cupo,
        "debe_lista_espera":    not hay_cupo,
        "creditos_disponibles": socio.creditos_disponibles,
        "puede_usar_credito":   socio.creditos_disponibles > 0
    }


# ──────────────────────────────────────────────────────────────
# Endpoint: agregar a lista de espera individual sin pago
# ──────────────────────────────────────────────────────────────

@router.post("/individual/lista-espera")
def agregar_lista_espera_individual(
    datos: ListaEsperaIndividualCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(db=db, token=token)

    clase = db.query(Clase).filter(Clase.id == datos.clase_id).first()
    if not clase:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    ya_en_espera = db.query(ListaEspera).filter(
        ListaEspera.socio_id    == socio.id,
        ListaEspera.clase_id    == datos.clase_id,
        ListaEspera.fecha_clase == datos.fecha_clase,
        ListaEspera.estado      == "esperando"
    ).first()

    if ya_en_espera:
        raise HTTPException(status_code=400, detail="Ya estás en lista de espera para esta clase")

    reserva_espera = Reserva(
        socio_id     = socio.id,
        clase_id     = datos.clase_id,
        tipo         = TipoReserva.Individual.value,
        estado       = "en_espera",
        fecha_clase  = datos.fecha_clase,
        monto_total  = 0,
        monto_pagado = 0,
    )
    db.add(reserva_espera)
    db.add(ListaEspera(
        socio_id    = socio.id,
        clase_id    = datos.clase_id,
        fecha_clase = datos.fecha_clase,
        tipo        = TipoReserva.Individual.value,
        estado      = "esperando"
    ))

    db.commit()

    return {"mensaje": "Agregado a lista de espera correctamente"}


# ──────────────────────────────────────────────────────────────
# 🌟 NUEVO: cotizar reserva individual (reemplaza a /individual/crear)
#
# Ya NO crea ninguna fila en la base. Solo valida (fechas, conflicto
# de horario, cupo disponible) y devuelve los datos necesarios para
# que el frontend arme el pago. La reserva real recién se crea:
#   - vía webhook de MP (_confirmar_individual_directo), o
#   - en /individual/pagar-directo si es tarjeta simulada / crédito.
# ──────────────────────────────────────────────────────────────

@router.post("/individual/cotizar")
def cotizar_reserva_individual(
    datos: ReservaIndividualCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(db=db, token=token)

    if socio.rol not in [Rol.Miembro.value, Rol.NoMiembro.value]:
        raise HTTPException(status_code=403, detail="No tiene permisos para reservar")

    clase = db.query(Clase).filter(Clase.id == datos.clase_id).first()

    if not clase:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    hoy = date.today()
    limite = hoy + timedelta(days=7)
    fecha = datetime.strptime(datos.fecha_clase, "%Y-%m-%d").date()

    if fecha < hoy:
        raise HTTPException(400, "No podés reservar fechas pasadas")

    if fecha > limite:
        raise HTTPException(400, "Solo podés reservar hasta 7 días en adelante")

    horario_str = str(clase.horario)[:5]
    fecha_hora  = datetime.strptime(f"{datos.fecha_clase} {horario_str}", "%Y-%m-%d %H:%M")

    if datetime.now() >= fecha_hora:
        raise HTTPException(status_code=400, detail="La clase ya comenzó")

    conflicto = db.query(Reserva).join(Clase).filter(
        Reserva.socio_id    == socio.id,
        Clase.dia           == clase.dia,
        Clase.horario       == clase.horario,
        Reserva.fecha_clase == datos.fecha_clase,
        Reserva.estado.in_(["confirmada", "en_espera", "notificado"])
    ).first()

    if conflicto:
        raise HTTPException(status_code=400, detail="Ya tiene una reserva en ese horario")

    membresia_existente = db.query(Reserva).filter(
        Reserva.socio_id    == socio.id,
        Reserva.clase_id    == clase.id,
        Reserva.fecha_clase == datos.fecha_clase,
        Reserva.tipo        == TipoReserva.Membresia.value,
        Reserva.estado.in_(["confirmada", "pendiente_pago"])
    ).first()

    if membresia_existente:
        raise HTTPException(status_code=400, detail="Ya posee una membresía para esta clase")

    ocupadas = db.query(Reserva).filter(
        Reserva.clase_id    == clase.id,
        Reserva.fecha_clase == datos.fecha_clase,
        Reserva.estado      == "confirmada"
    ).count()

    hay_cupo = ocupadas < clase.cupo

    personas_en_espera = db.query(ListaEspera).filter(
        ListaEspera.clase_id == clase.id,
        ListaEspera.fecha_clase == datos.fecha_clase,
        ListaEspera.estado == "esperando"
    ).count()

    if personas_en_espera > 0:
        hay_cupo = False

    if not hay_cupo:
        return {
            "mensaje": "No hay cupo disponible",
            "hay_cupo": False,
            "debe_lista_espera": True,
            "monto_a_pagar": 0
        }

    if datos.tipo_pago not in ["sena", "total"]:
        raise HTTPException(status_code=400, detail="Tipo de pago inválido")

    monto = clase.precio_individual * 0.5 if datos.tipo_pago == "sena" else clase.precio_individual

    return {
        "mensaje":           "Cotización válida",
        "clase_id":          clase.id,
        "fecha_clase":       datos.fecha_clase,
        "tipo_pago":         datos.tipo_pago,
        "monto_a_pagar":     monto,
        "hay_cupo":          True,
        "debe_lista_espera": False
    }


# ──────────────────────────────────────────────────────────────
# 🌟 NUEVO: pagar reserva individual directo (tarjeta simulada o
# crédito). Crea y confirma la reserva en un solo paso atómico,
# sin pasar nunca por "pendiente_pago" — porque este pago se
# resuelve en el momento, no hay espera de webhook externo.
# ──────────────────────────────────────────────────────────────

@router.post("/individual/pagar-directo")
async def pagar_reserva_individual_directo(
    datos: ConfirmarPagoIndividualDirecto,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(db=db, token=token)

    clase = db.query(Clase).filter(Clase.id == datos.clase_id).first()
    if not clase:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    hoy = date.today()
    fecha = datetime.strptime(datos.fecha_clase, "%Y-%m-%d").date()
    if fecha < hoy or fecha > hoy + timedelta(days=7):
        raise HTTPException(400, "Fecha fuera de rango")

    horario_str = str(clase.horario)[:5]
    fecha_hora  = datetime.strptime(f"{datos.fecha_clase} {horario_str}", "%Y-%m-%d %H:%M")
    if datetime.now() >= fecha_hora:
        raise HTTPException(400, "La clase ya comenzó")

    conflicto = db.query(Reserva).join(Clase).filter(
        Reserva.socio_id    == socio.id,
        Clase.dia           == clase.dia,
        Clase.horario       == clase.horario,
        Reserva.fecha_clase == datos.fecha_clase,
        Reserva.estado.in_(["confirmada", "en_espera", "notificado"])
    ).first()
    if conflicto:
        raise HTTPException(400, "Ya tiene una reserva en ese horario")

    tarjeta = None

    if datos.usa_credito:
        if socio.creditos_disponibles < 1:
            raise HTTPException(400, "No tenés créditos disponibles")
        monto = 0
    else:
        if datos.tipo_pago not in ["sena", "total"]:
            raise HTTPException(400, "Tipo de pago inválido")
        monto = clase.precio_individual * 0.5 if datos.tipo_pago == "sena" else clase.precio_individual

        numero_limpio       = (datos.numero_tarjeta or "").replace(" ", "")
        titular_normalizado = " ".join((datos.titular or "").split())

        tarjeta = db.query(TarjetaSimulada).filter(
            TarjetaSimulada.numero              == numero_limpio,
            func.lower(TarjetaSimulada.titular) == titular_normalizado.lower(),
            TarjetaSimulada.cvv                 == datos.cvv,
            TarjetaSimulada.fecha_vencimiento    == datos.fecha_vencimiento
        ).first()

        if not tarjeta:
            raise HTTPException(400, "Tarjeta inválida")
        if not tarjeta.conexion_exitosa:
            raise HTTPException(400, "Hay inconvenientes con la conexión al banco")
        if tarjeta.saldo < monto:
            raise HTTPException(400, "La cuenta no tiene saldo suficiente")

    # Chequeo de cupo justo antes de confirmar (ventana muy chica acá,
    # todo pasa en el mismo request, pero igual lo validamos).
    ocupadas = db.query(Reserva).filter(
        Reserva.clase_id    == clase.id,
        Reserva.fecha_clase == datos.fecha_clase,
        Reserva.estado      == "confirmada"
    ).count()

    if ocupadas >= clase.cupo:
        raise HTTPException(
            409,
            "El cupo se llenó mientras procesabas el pago. Podés anotarte en lista de espera."
        )

    if datos.usa_credito:
        socio.creditos_disponibles -= 1
    else:
        tarjeta.saldo -= monto

    reserva = Reserva(
        socio_id     = socio.id,
        clase_id     = clase.id,
        tipo         = TipoReserva.Individual.value,
        estado       = "confirmada",
        fecha_clase  = datos.fecha_clase,
        monto_total  = clase.precio_individual,
        monto_pagado = monto,
        tipo_pago    = datos.tipo_pago if not datos.usa_credito else "credito",
    )

    if not datos.usa_credito:
        reserva.tarjeta_ultimos = tarjeta.numero
        reserva.tipo_tarjeta    = tarjeta.tipo

    db.add(reserva)
    db.commit()
    db.refresh(reserva)

    try:
        await enviar_mail_pago_exitoso(socio, clase, reserva)
    except Exception as e:
        print(f"Mail no enviado: {e}")

    return {"mensaje": "El pago se realizó correctamente", "reserva_id": reserva.id}


# ──────────────────────────────────────────────────────────────
# Endpoint LEGADO: confirmar pago individual
# Usado únicamente por el flujo de aceptar-cupo (reserva_id ya
# existe como pendiente_pago).
# ──────────────────────────────────────────────────────────────

@router.post("/individual/pagar")
async def pagar_reserva_individual(
    datos: ConfirmarPagoIndividual,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(db=db, token=token)

    reserva = db.query(Reserva).filter(
        Reserva.id       == datos.reserva_id,
        Reserva.socio_id == socio.id,
        Reserva.tipo     == TipoReserva.Individual.value,
        Reserva.estado   == "pendiente_pago"
    ).first()

    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    clase = db.query(Clase).filter(Clase.id == reserva.clase_id).first()

    if datos.usa_credito:
        if socio.creditos_disponibles < 1:
            reserva.estado = "cancelada"
            db.commit()
            raise HTTPException(status_code=400, detail="No tenés créditos disponibles")

        socio.creditos_disponibles -= 1
        reserva.estado       = "confirmada"
        reserva.monto_pagado = 0
        db.commit()

        try:
            await enviar_mail_pago_exitoso(socio, clase, reserva)
        except Exception as e:
            print(f" Mail no enviado: {e}")

        return {"mensaje": "Reserva confirmada con crédito"}

    numero_limpio       = datos.numero_tarjeta.replace(" ", "")
    titular_normalizado = " ".join(datos.titular.split())

    tarjeta = db.query(TarjetaSimulada).filter(
        TarjetaSimulada.numero              == numero_limpio,
        func.lower(TarjetaSimulada.titular) == titular_normalizado.lower(),
        TarjetaSimulada.cvv                 == datos.cvv,
        TarjetaSimulada.fecha_vencimiento   == datos.fecha_vencimiento
    ).first()

    if not tarjeta:
        reserva.estado = "cancelada"
        db.commit()
        raise HTTPException(status_code=400, detail="Tarjeta inválida")

    if not tarjeta.conexion_exitosa:
        reserva.estado = "cancelada"
        db.commit()
        raise HTTPException(status_code=400, detail="Hay inconvenientes con la conexión al banco")

    if tarjeta.saldo < reserva.monto_pagado:
        reserva.estado = "cancelada"
        db.commit()
        raise HTTPException(status_code=400, detail="La cuenta no tiene saldo suficiente")

    ocupadas = db.query(Reserva).filter(
        Reserva.clase_id    == clase.id,
        Reserva.fecha_clase == reserva.fecha_clase,
        Reserva.estado      == "confirmada"
    ).count()

    if ocupadas >= clase.cupo:
        reserva.estado = "cancelada"
        db.commit()
        raise HTTPException(
            status_code=400,
            detail="El cupo se llenó mientras procesabas el pago. Podés intentar anotarte en lista de espera."
        )

    reserva.estado          = "confirmada"
    reserva.tarjeta_ultimos = tarjeta.numero
    reserva.tipo_tarjeta    = tarjeta.tipo
    tarjeta.saldo          -= reserva.monto_pagado

    db.commit()

    try:
        await enviar_mail_pago_exitoso(socio, clase, reserva)
    except Exception as e:
        print(f" Mail no enviado: {e}")

    return {"mensaje": "El pago se realizó correctamente"}


# ──────────────────────────────────────────────────────────────
# Endpoint: cancelar reserva individual pendiente
# (queda para el flujo legado de aceptar-cupo)
# ──────────────────────────────────────────────────────────────

@router.delete("/individual/cancelar/{reserva_id}")
def cancelar_reserva_individual(
    reserva_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(db=db, token=token)

    reserva = db.query(Reserva).filter(
        Reserva.id       == reserva_id,
        Reserva.socio_id == socio.id,
        Reserva.tipo     == TipoReserva.Individual.value,
        Reserva.estado   == "pendiente_pago"
    ).first()

    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    reserva.estado = "cancelada"
    db.commit()

    return {"mensaje": "Reserva cancelada"}


# ──────────────────────────────────────────────────────────────
# Endpoint: cancelar entrada de lista de espera
# ──────────────────────────────────────────────────────────────

@router.delete("/lista-espera/cancelar/{reserva_id}")
def cancelar_lista_espera(
    reserva_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(db=db, token=token)

    reserva = db.query(Reserva).filter(
        Reserva.id       == reserva_id,
        Reserva.socio_id == socio.id
    ).first()

    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    entrada_lista = db.query(ListaEspera).filter(
        ListaEspera.socio_id    == socio.id,
        ListaEspera.clase_id    == reserva.clase_id,
        ListaEspera.fecha_clase == reserva.fecha_clase,
        ListaEspera.estado      == "esperando"
    ).first()

    if not entrada_lista:
        raise HTTPException(status_code=400, detail="La reserva no está en lista de espera")

    db.delete(entrada_lista)
    db.delete(reserva)
    db.commit()

    return {"mensaje": "Se dio de baja de la lista de espera"}


# ──────────────────────────────────────────────────────────────
# Endpoint: alertas individuales
# ──────────────────────────────────────────────────────────────

@router.get("/alertas-individuales")
def obtener_alertas_individuales(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(db=db, token=token)

    alertas = db.query(Reserva).filter(
        Reserva.socio_id      == socio.id,
        Reserva.tipo          == TipoReserva.Individual.value,
        Reserva.mensaje_admin != None
    ).order_by(Reserva.id.desc()).all()

    return [
        {
            "reserva_id": r.id,
            "mensaje":    r.mensaje_admin,
            "clase_id":   r.clase_id,
            "fecha":      r.fecha_clase
        }
        for r in alertas
    ]
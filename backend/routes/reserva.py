from models.socio import Socio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, datetime, time
from dependencies.database import get_db
from models.reserva_MIO      import Reserva
from models.lista_espera import ListaEspera
from models.clase        import Clase
from services.auth       import oauth2_scheme, obtener_usuario_actual
from schemas.reserva     import ReservaMembresiaCreate, ConfirmarPagoMembresia

from schemas.reserva_individual import (
    ReservaIndividualCreate,
    ConfirmarPagoIndividual
)

from models.tarjeta_simulada import TarjetaSimulada

from services.mail_service import (
    enviar_mail_pago_exitoso,
    enviar_mail_lista_espera,
    enviar_mail_error_pago
)

from datetime import timedelta

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
    """
    Escenario 5: verifica si el socio ya tiene una reserva confirmada o
    pendiente de pago para ESE día y horario, sin importar la clase.
    Esto cubre la regla: no se puede reservar más de una clase en el mismo día y horario.
    Pero SÍ puede reservar otra clase de otro horario (múltiples membresías).
    """
    return db.query(Reserva).join(Clase).filter(
        Reserva.socio_id == socio_id,
        Clase.dia        == dia,
        Clase.horario    == horario,
        Reserva.fecha_clase.in_(fechas),
        Reserva.estado.in_(["confirmada", "pendiente_pago"])
    ).first() is not None
 
 
def _calcular_clases_perdidas(fechas: list[str]) -> int:
    """
    Escenario 2: cuenta cuántas fechas del mes ya pasaron.
    El socio se inscribe tarde y se pierde esas clases → 20% de descuento por cada una.
    """
    hoy = date.today()
    return sum(
        1 for f in fechas
        if datetime.strptime(f, "%Y-%m-%d").date() < hoy
    )
 
 
# ──────────────────────────────────────────────────────────────
# Endpoint 1: iniciar reserva con membresía
# Cubre: escenarios 1, 2, 3, 5 y primer paso del 4
# ──────────────────────────────────────────────────────────────

@router.post("/membresia/crear")
def crear_reserva_membresia(
    datos: ReservaMembresiaCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(db=db, token=token)
    clase = db.query(Clase).filter(Clase.id == datos.clase_id).first()
    
    if not clase or not clase.activa:
        raise HTTPException(status_code=404, detail="Clase no encontrada")
 
    hoy = date.today()
    for fecha_str in datos.fechas_clase:
        if datetime.strptime(fecha_str, "%Y-%m-%d").date() < hoy:
            raise HTTPException(
                status_code=400, 
                detail=f"No se pueden reservar clases en fechas pasadas ({fecha_str}). Proceso cancelado."
            )

    if _ya_tiene_reserva_en_horario(db, socio.id, clase.dia, clase.horario, datos.fechas_clase):
        raise HTTPException(
            status_code=400,
            detail="Ya tiene una reserva confirmada o pendiente para este horario en los días solicitados."
        )
 
    clases_perdidas  = _calcular_clases_perdidas(datos.fechas_clase)
    precio_por_clase = clase.precio_individual
    total_clases     = len(datos.fechas_clase)
    descuento        = clases_perdidas * (precio_por_clase * 0.20)
    monto_total      = (precio_por_clase * total_clases) - descuento
 
    fechas_con_cupo = []
    fechas_sin_cupo = []
 
    for fecha in datos.fechas_clase:
        ocupadas = db.query(Reserva).filter(
            Reserva.clase_id    == datos.clase_id,
            Reserva.fecha_clase == fecha,
            Reserva.estado.in_(["confirmada", "pendiente_pago"])
        ).count()
 
        if ocupadas < clase.cupo:
            fechas_con_cupo.append(fecha)
        else:
            fechas_sin_cupo.append(fecha)
 
    if not fechas_con_cupo:
        return {
            "reservas_ids":       [],
            "fechas_con_cupo":    [],
            "fechas_sin_cupo":    fechas_sin_cupo,
            "clases_perdidas":    clases_perdidas,
            "descuento_aplicado": round(descuento, 2),
            "monto_total":        0.0, # Lista de espera pura siempre es costo 0
            "hay_lista_espera":   len(fechas_sin_cupo) > 0,
            "mensaje_espera": f"¿Desea estar en lista de espera para la clase de {clase.actividad.capitalize()} en las fechas sin cupo?"
        }
    
    # Si el usuario tiene créditos suficientes para cubrir las clases con cupo
    cantidad_clases_a_reservar = len(fechas_con_cupo)
    if socio.creditos_disponibles >= cantidad_clases_a_reservar:
        monto_total = 0.0 # Se setea a cero porque el pago real se hará con créditos

    # Crear reservas pendiente_pago
    reservas_creadas = []
    for fecha in fechas_con_cupo:
        r = Reserva(
            socio_id = socio.id,
            clase_id = datos.clase_id,
            tipo = "membresia",
            estado = "pendiente_pago",
            fecha_clase = fecha,
            monto_total = monto_total, 
        )
        db.add(r)
        reservas_creadas.append(r)
 
    db.commit()
    for r in reservas_creadas:
        db.refresh(r)
 
    respuesta = {
        "reservas_ids":       [r.id for r in reservas_creadas],
        "fechas_con_cupo":    fechas_con_cupo,
        "fechas_sin_cupo":    fechas_sin_cupo,
        "clases_perdidas":    clases_perdidas,
        "descuento_aplicado": round(descuento, 2),
        "monto_total":        round(monto_total, 2)
    }
 
    if fechas_sin_cupo:
        respuesta["mensaje_espera"] = f"¿Desea estar en lista de espera para las fechas: {', '.join(fechas_sin_cupo)}?"
 
    return respuesta


@router.post("/membresia/confirmar-pago")
def confirmar_pago_membresia(
    datos: ConfirmarPagoMembresia,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = db.query(Socio).filter(Socio.id == obtener_usuario_actual(db=db, token=token).id).first()

    reservas = db.query(Reserva).filter(
        Reserva.id.in_(datos.reservas_ids),
        Reserva.socio_id == socio.id,
        Reserva.estado   == "pendiente_pago"
    ).all()

    if not reservas and datos.fechas_sin_cupo and datos.clase_id:
        if datos.acepta_lista_espera:
            for fecha in datos.fechas_sin_cupo:
                entrada = ListaEspera(
                    socio_id    = socio.id,
                    clase_id    = datos.clase_id,
                    fecha_clase = fecha,
                    tipo        = "membresia",
                    estado      = "esperando"
                )
                db.add(entrada)
            db.commit()
            return {
                "mensaje":      "registrado en lista de espera",
                "clases":       [],
                "monto_pagado": 0.0
            }
        else:
            raise HTTPException(status_code=400, detail="Se rechazó la lista de espera.")

    if not reservas:
        raise HTTPException(status_code=404, detail="Reservas pendientes no encontradas")

    if not datos.acepta_lista_espera:
        for r in reservas:
            db.delete(r)
        db.commit()
        raise HTTPException(status_code=400, detail="Reserva cancelada por el usuario")
    
    # Evaluar si la reserva vino bonificada con créditos por el endpoint de creación
    es_pago_con_creditos = reservas[0].monto_total == 0.0

    # Si requería pago real monetario y la pasarela reportó un fallo genuino
    if not es_pago_con_creditos and not datos.pago_exitoso:
        clases_ya_devueltas = set()
        for r in reservas:
            r.estado = "cancelada"
            if r.clase_id not in clases_ya_devueltas:
                clase = db.query(Clase).filter(Clase.id == r.clase_id).first()
                clases_ya_devueltas.add(r.clase_id)
        db.commit()
        raise HTTPException(status_code=402, detail="No se pudo procesar el pago. Reserva cancelada.")

    # 🌟 REGLA DE NEGOCIO: Si es un pago con créditos, descontamos físicamente del socio
    if es_pago_con_creditos:
        cantidad_clases = len(reservas)
        if socio.creditos_disponibles < cantidad_clases:
            raise HTTPException(status_code=400, detail="No disponés de los créditos suficientes para realizar esta operación.")
        
        # Restamos los créditos de la bolsa del socio
        socio.creditos_disponibles -= cantidad_clases

    detalle = []
    monto_abonado = reservas[0].monto_total
    clases_ya_descontadas = set()

    for r in reservas:
        clase = db.query(Clase).filter(Clase.id == r.clase_id).first()
        if clase.id not in clases_ya_descontadas:
            clases_ya_descontadas.add(clase.id)
        r.estado       = "confirmada"
        r.monto_pagado = r.monto_total
        
        # Si pagó con créditos, dejamos constancia interna en la reserva
        if es_pago_con_creditos:
            r.credito_generado = False # Se consumió, no se generó
            r.mensaje_admin = "Clase abonada exitosamente utilizando créditos pendientes."
            
        detalle.append({
            "fecha":     r.fecha_clase,
            "actividad": clase.actividad if clase else "Actividad",
            "horario":   clase.horario.strftime("%H:%M") if (clase and clase.horario) else None,
        })
        
    if datos.fechas_sin_cupo:
        clase_id = reservas[0].clase_id if reservas else datos.clase_id
        for fecha in datos.fechas_sin_cupo:
            entrada = ListaEspera(
                socio_id    = socio.id,
                clase_id    = clase_id,
                fecha_clase = fecha,
                tipo        = "membresia",
                estado      = "esperando"
            )
            db.add(entrada)
            
    db.commit()
    
    # Mensaje adaptado según el canal de pago procesado
    if es_pago_con_creditos:
        mensaje = "reserva exitosa utilizando tus créditos"
    else:
        mensaje = "reserva exitosa con lista de espera" if datos.fechas_sin_cupo else "reserva exitosa"

    return {
        "mensaje":      mensaje,
        "clases":       detalle,
        "monto_pagado": round(monto_abonado, 2)
    }
 
# Endpoint 3: cancelar reserva y notificar al siguiente en lista de espera
@router.post("/membresia/cancelar/{reserva_id}")
def cancelar_reserva(
    reserva_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(db, token)
 
    reserva = db.query(Reserva).filter(
        Reserva.id       == reserva_id,
        Reserva.socio_id == socio.id,
        Reserva.estado   == "confirmada"
    ).first()
 
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
 
    # Liberar el cupo
    clase = db.query(Clase).filter(Clase.id == reserva.clase_id).first()
    reserva.estado = "cancelada"
    db.commit()
 
    # Buscar el siguiente con prioridad:
    # 1ro: membresía ordenados por fecha_ingreso (más antiguo primero)
    # 2do: individual ordenados por fecha_ingreso (más antiguo primero)
    siguiente = db.query(ListaEspera).filter(
        ListaEspera.clase_id    == reserva.clase_id,
        ListaEspera.fecha_clase == reserva.fecha_clase,
        ListaEspera.estado      == "esperando"
    ).order_by(
        ListaEspera.tipo.desc(),         # "membresia" > "individual" alfabéticamente
        ListaEspera.fecha_ingreso.asc()  # más antiguo primero dentro del mismo tipo
    ).first()
 
    if siguiente:
        siguiente.estado = "notificado"
        db.commit()
        # TODO: enviar mail al socio notificándole que se liberó un cupo
 
    return {"mensaje": "Reserva cancelada, cupo liberado"}
 
# Endpoint 4: mis reservas
@router.get("/mis-reservas")
def mis_reservas(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(db=db, token=token)
    reservas = db.query(Reserva).filter(
        Reserva.socio_id == socio.id
    ).all()
    return reservas

 
# Endpoint 4: Lista de espera
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
            "id":           e.id,
            "socio":        f"{s.nombre} {s.apellido}" if s else e.socio_id,
            "clase":        clase.actividad if clase else e.clase_id,
            "fecha_clase":  e.fecha_clase,
            "tipo":         e.tipo,
            "estado":       e.estado,
            "fecha_ingreso": e.fecha_ingreso,           
        })
    return resultado

# ──────────────────────────────────────────────────────────────
# Endpoint: crear reserva individual
# ──────────────────────────────────────────────────────────────

@router.post("/individual/crear")
def crear_reserva_individual(

    datos: ReservaIndividualCreate,

    token: str = Depends(oauth2_scheme),

    db: Session = Depends(get_db)
):

    # Obtenemos usuario autenticado
    socio = obtener_usuario_actual(db=db, token=token)

    # Solo miembros y no_miembros pueden reservar
    if socio.rol not in [Rol.Miembro.value, Rol.NoMiembro.value]:

        raise HTTPException(
            status_code=403,
            detail="No tiene permisos para reservar"
        )

    # Verificamos que la clase exista
    clase = db.query(Clase).filter(
        Clase.id == datos.clase_id
    ).first()

    if not clase:

        raise HTTPException(
            status_code=404,
            detail="Clase no encontrada"
        )

    # ─────────────────────────────────────────────
    # Regla:
    # no puede reservar una clase ya iniciada
    # ─────────────────────────────────────────────

    fecha_hora = datetime.strptime(
        f"{datos.fecha_clase} {clase.horario}",
        "%Y-%m-%d %H:%M"
    )

    if datetime.now() >= fecha_hora:

        raise HTTPException(
            status_code=400,
            detail="La clase ya comenzó"
        )

    # ─────────────────────────────────────────────
    # Regla:
    # no puede reservar 2 clases mismo horario
    # ─────────────────────────────────────────────

    conflicto = db.query(Reserva).join(Clase).filter(

        Reserva.socio_id == socio.id,

        Clase.dia == clase.dia,

        Clase.horario == clase.horario,

        Reserva.fecha_clase == datos.fecha_clase,

        Reserva.estado.in_(["pendiente_pago", "confirmada"])

    ).first()

    if conflicto:

        raise HTTPException(
            status_code=400,
            detail="Ya tiene una reserva en ese horario"
        )

    # ─────────────────────────────────────────────
    # Regla:
    # no puede reservar individual si ya tiene
    # membresía para esa clase
    # ─────────────────────────────────────────────

    membresia_existente = db.query(Reserva).filter(

        Reserva.socio_id == socio.id,

        Reserva.clase_id == clase.id,

        Reserva.fecha_clase == datos.fecha_clase,

        Reserva.tipo == "membresia",

        Reserva.estado.in_(["confirmada", "pendiente_pago"])

    ).first()

    if membresia_existente:

        raise HTTPException(
            status_code=400,
            detail="Ya posee una membresía para esta clase"
        )

    # ─────────────────────────────────────────────
    # Verificamos cupos
    # ─────────────────────────────────────────────

    ocupadas = db.query(Reserva).filter(

        Reserva.clase_id == clase.id,

        Reserva.fecha_clase == datos.fecha_clase,

        Reserva.estado.in_(["confirmada", "pendiente_pago"])

    ).count()

    hay_cupo = ocupadas < clase.cupo

    # ─────────────────────────────────────────────
    # Regla:
    # individual paga solo el 50%
    # ─────────────────────────────────────────────

    monto = clase.precio_individual * 0.5

    # Creamos reserva pendiente
    reserva = Reserva(

        socio_id=socio.id,

        clase_id=clase.id,

        tipo="individual",

        estado="pendiente_pago",

        fecha_clase=datos.fecha_clase,

        monto_total=clase.precio_individual,

        monto_pagado=monto
    )

    db.add(reserva)

    db.commit()

    db.refresh(reserva)

    return {

        "mensaje": "Reserva creada correctamente",

        "reserva_id": reserva.id,

        "monto_a_pagar": monto,

        "hay_cupo": hay_cupo,

        "debe_lista_espera": not hay_cupo
    }

# ──────────────────────────────────────────────────────────────
# Endpoint: confirmar pago individual
# ──────────────────────────────────────────────────────────────

@router.post("/individual/pagar")
async def pagar_reserva_individual(

    datos: ConfirmarPagoIndividual,

    token: str = Depends(oauth2_scheme),

    db: Session = Depends(get_db)
):

    socio = obtener_usuario_actual(db=db, token=token)

    reserva = db.query(Reserva).filter(

        Reserva.id == datos.reserva_id,

        Reserva.socio_id == socio.id,

        Reserva.tipo == "individual",

        Reserva.estado == "pendiente_pago"

    ).first()

    if not reserva:

        raise HTTPException(
            status_code=404,
            detail="Reserva no encontrada"
        )

    clase = db.query(Clase).filter(
        Clase.id == reserva.clase_id
    ).first()

    # ─────────────────────────────────────────────
    # Buscamos tarjeta simulada
    # ─────────────────────────────────────────────

    tarjeta = db.query(TarjetaSimulada).filter(
        TarjetaSimulada.numero == datos.numero_tarjeta
    ).first()

    if not tarjeta:

        raise HTTPException(
            status_code=400,
            detail="Tarjeta inválida"
        )

    # ─────────────────────────────────────────────
    # Simulación:
    # error conexión banco
    # ─────────────────────────────────────────────

    if not tarjeta.conexion_exitosa:

        reserva.estado = "cancelada"

        db.commit()

        await enviar_mail_error_pago(socio)

        raise HTTPException(
            status_code=400,
            detail="Hay inconvenientes con la conexión al banco"
        )

    # ─────────────────────────────────────────────
    # Simulación:
    # saldo insuficiente
    # ─────────────────────────────────────────────

    if tarjeta.saldo < reserva.monto_pagado:

        reserva.estado = "cancelada"

        db.commit()

        await enviar_mail_error_pago(socio)

        raise HTTPException(
            status_code=400,
            detail="La cuenta no tiene saldo suficiente"
        )

    # ─────────────────────────────────────────────
    # Verificamos nuevamente cupo
    # porque pudo ocuparse mientras pagaba
    # ─────────────────────────────────────────────

    ocupadas = db.query(Reserva).filter(

        Reserva.clase_id == clase.id,

        Reserva.fecha_clase == reserva.fecha_clase,

        Reserva.estado == "confirmada"

    ).count()

    hay_cupo = ocupadas < clase.cupo

    # ─────────────────────────────────────────────
    # Caso SIN CUPO
    # ─────────────────────────────────────────────

    if not hay_cupo:

        # Usuario NO quiere lista espera
        if not datos.acepta_lista_espera:

            reserva.estado = "cancelada"

            db.commit()

            raise HTTPException(
                status_code=400,
                detail="No hay cupo disponible"
            )

        # Usuario acepta lista espera
        entrada = ListaEspera(

            socio_id=socio.id,

            clase_id=clase.id,

            fecha_clase=reserva.fecha_clase,

            tipo="individual",

            estado="esperando"
        )

        db.add(entrada)

        # Se guarda el pago
        reserva.estado = "confirmada"

        reserva.tarjeta_ultimos = tarjeta.numero

        reserva.tipo_tarjeta = tarjeta.tipo

        tarjeta.saldo -= reserva.monto_pagado

        db.commit()

        await enviar_mail_lista_espera(
            socio,
            clase,
            reserva.fecha_clase
        )

        return {
            "mensaje": "Pago realizado y agregado a lista de espera"
        }

    # ─────────────────────────────────────────────
    # Pago exitoso
    # ─────────────────────────────────────────────

    reserva.estado = "confirmada"

    reserva.tarjeta_ultimos = tarjeta.numero

    reserva.tipo_tarjeta = tarjeta.tipo

    tarjeta.saldo -= reserva.monto_pagado

    db.commit()

    await enviar_mail_pago_exitoso(
        socio,
        clase,
        reserva
    )

    return {
        "mensaje": "El pago se realizó correctamente"
    }
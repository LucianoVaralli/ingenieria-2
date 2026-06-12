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
from models.enums import Rol, TipoReserva
from sqlalchemy import func
from schemas.reserva_individual import (
    ReservaIndividualCreate,
    ConfirmarPagoIndividual
)

from models.tarjeta_simulada import TarjetaSimulada
from services.auth import validar_membresia

from services.mail_service import (
    enviar_mail_pago_exitoso,
    enviar_mail_lista_espera,
    enviar_mail_membresia,
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
        Reserva.estado.in_(["confirmada", "pendiente_pago", "en_espera"])
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
    user = obtener_usuario_actual(token=token, db=db)
    socio = db.query(Socio).filter(Socio.id == user.id).first()

    print("SOCIO:", socio.id)
    print("MEMBRESIA:", socio.membresia_activa_hasta)
    print("HOY:", date.today())
    print("TIPO MEMBRESIA:", type(socio.membresia_activa_hasta))
    hoy = date.today()

    if socio.membresia_activa_hasta and socio.membresia_activa_hasta < hoy: 
            raise HTTPException(403, "Membresía vencida")
    
    clase = db.query(Clase).filter(Clase.id == datos.clase_id).first()
    
    if not clase or not clase.activa:
        raise HTTPException(status_code=404, detail="Clase no encontrada")


    # Separamos fechas pasadas y futuras
    # Las pasadas no se reservan pero sí generan descuento
    fechas_pasadas  = [f for f in datos.fechas_clase if datetime.strptime(f, "%Y-%m-%d").date() < hoy]
    fechas_futuras  = [f for f in datos.fechas_clase if datetime.strptime(f, "%Y-%m-%d").date() >= hoy]

    if not fechas_futuras:
        raise HTTPException(
            status_code=400,
            detail="No quedan clases futuras para este mes. No se puede crear la membresía."
        )

    # Verificar solapamiento de horario solo en fechas futuras
    if _ya_tiene_reserva_en_horario(db, socio.id, clase.dia, clase.horario, fechas_futuras):
        raise HTTPException(
            status_code=400,
            detail="Ya tiene una reserva confirmada o pendiente para este horario en los días solicitados."
        )
    
    # Verificar cupos solo en fechas futuras
    fechas_con_cupo = []
    fechas_sin_cupo = []

    for fecha in fechas_futuras:
        ocupadas = db.query(Reserva).filter(
            Reserva.clase_id    == datos.clase_id,
            Reserva.fecha_clase == fecha,
            Reserva.estado.in_(["confirmada", "pendiente_pago"])
        ).count()

        if ocupadas < clase.cupo:
            fechas_con_cupo.append(fecha)
        else:
            fechas_sin_cupo.append(fecha)

    total_clases = len(datos.fechas_clase)
    clases_validas = len(fechas_futuras)
    clases_perdidas = total_clases - clases_validas

    # Tomamos todas las clases futuras 
    clases_a_reservar = len(fechas_futuras) 

    creditos_disponibles = socio.creditos_disponibles
    creditos_a_usar = min(creditos_disponibles, clases_a_reservar)
    
    precio_por_clase = clase.precio_individual
    
    # 1. Monto base sobre total del mes
    monto_base_mes = total_clases * precio_por_clase
    
    # 2. Descuento por clases perdidas
    descuento_por_clase_perdida = monto_base_mes * 0.20
    descuento_total = clases_perdidas * descuento_por_clase_perdida
    monto_sin_creditos = max(0, monto_base_mes - descuento_total)
    
    # 3. Descuento por créditos seguro (Evitamos divisiones raras)
    if clases_a_reservar > 0:
        precio_efectivo_por_clase = monto_sin_creditos / clases_a_reservar
        descuento_creditos = creditos_a_usar * precio_efectivo_por_clase
    else:
        descuento_creditos = 0
        
    monto_total = max(0, monto_sin_creditos - descuento_creditos)
    
    # Redondeamos todo de forma limpia para evitar floats con infinitos decimales
    respuesta = {
        "fechas_con_cupo":    fechas_con_cupo,
        "fechas_sin_cupo":    fechas_sin_cupo,
        "fechas_pasadas":     fechas_pasadas,
        "clases_perdidas":    clases_perdidas,
        "descuento_aplicado": round(descuento_total, 2),
        "creditos_a_usar":    creditos_a_usar,
        "descuento_creditos": round(descuento_creditos, 2),
        "monto_total":        round(monto_total, 2),
        "hay_lista_espera":   len(fechas_sin_cupo) > 0,
        **({"mensaje_espera": "¿Desea estar en lista de espera?"} if fechas_sin_cupo else {})
    }
    
    return respuesta


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

    # 1. Descontar créditos primero (si aplica)
    if datos.creditos_a_usar > 0:
        if socio.creditos_disponibles < datos.creditos_a_usar:
            raise HTTPException(status_code=400, detail="No tenés créditos suficientes.")
        socio.creditos_disponibles -= datos.creditos_a_usar

    # 2. VALIDACIÓN Y COBRO DE TARJETA (Solo una vez y si hay monto a pagar)
    if datos.monto_total > 0:
        if datos.numero_tarjeta:
            numero_limpio = datos.numero_tarjeta.replace(" ", "")
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

            # Descontamos el saldo real acá
            tarjeta.saldo -= datos.monto_total
        elif not datos.pago_exitoso:
            raise HTTPException(status_code=402, detail="No se pudo procesar el pago.")

    # 3. Creación de reservas confirmadas (con cupo)
    reservas_creadas = []
    for fecha in datos.fechas_con_cupo:
        ocupadas = db.query(Reserva).filter(
            Reserva.clase_id    == datos.clase_id,
            Reserva.fecha_clase == fecha,
            Reserva.estado.in_(["confirmada", "pendiente_pago"])
        ).count()
        
        if ocupadas < clase.cupo:
            r = Reserva(
                socio_id     = socio.id,
                clase_id     = datos.clase_id,
                tipo         = TipoReserva.Membresia.value,
                estado       = "confirmada",
                fecha_clase  = fecha,
                monto_total  = datos.monto_total,
                monto_pagado = datos.monto_total,
                es_recurrente = True,
            )
            db.add(r)
            reservas_creadas.append(r)
        else:
            # Si se quedó sin cupo en el medio, pasa a la lista de espera
            datos.fechas_sin_cupo.append(fecha)

    # 4. Lista de espera (Se guardan como "en_espera" para no ocupar cupo real)
    if datos.acepta_lista_espera:
        for fecha in datos.fechas_sin_cupo:
            reserva_espera = Reserva(
                socio_id     = socio.id,
                clase_id     = datos.clase_id,
                tipo         = TipoReserva.Membresia.value,
                estado       = "en_espera",  # <-- CORREGIDO: Antes decía "confirmada"
                fecha_clase  = fecha,
                monto_total  = datos.monto_total,
                monto_pagado = datos.monto_total,
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

    try:
        await enviar_mail_membresia(
            socio=socio,
            clase=clase,
            fechas_confirmadas=datos.fechas_con_cupo,
            fechas_lista_espera=datos.fechas_sin_cupo,
            monto_total=datos.monto_total
        )
    except Exception as e:
        print(f"⚠️ Mail no enviado: {e}")

    return {
        "mensaje": "Reserva procesada",
        "reservas_confirmadas": len(reservas_creadas),
        "monto_pagado": datos.monto_total,
    }
 
# Endpoint 3: cancelar reserva y notificar al siguiente en lista de espera
@router.post("/membresia/cancelar/{reserva_id}")
def cancelar_reserva(
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
def mis_reservas(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    socio = obtener_usuario_actual(db=db, token=token)
    reservas = db.query(Reserva).filter(Reserva.socio_id == socio.id).all()
    
    resultado = []
    for r in reservas:
        clase = db.query(Clase).filter(Clase.id == r.clase_id).first()
        lista_espera = db.query(ListaEspera).filter(

        ListaEspera.socio_id == socio.id,

        ListaEspera.clase_id == r.clase_id,

        ListaEspera.fecha_clase == r.fecha_clase,

        ListaEspera.estado == "esperando"

        ).first()

        resultado.append({
            "id":           r.id,
            "clase_id":     r.clase_id,
            "tipo":         r.tipo,
            "estado":       r.estado,
            "lista_espera": lista_espera is not None,
            "fecha_clase":  str(r.fecha_clase),
            "monto_total":  r.monto_total,
            "monto_pagado": r.monto_pagado,        # ← agregar
            "fecha_pago":   str(r.fecha_creacion) if r.fecha_creacion else None,  # ← agregar
            "clase": {
                "actividad": clase.actividad if clase else None,
                "horario":   str(clase.horario) if clase else None,
                "dia":       clase.dia if clase else None,
            }
        })
    return resultado

 
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

# Endpoint: para la lista de espera
@router.post("/individual/verificar-cupo")
def verificar_cupo(
    datos: ReservaIndividualCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(db=db, token=token)

    clase = db.query(Clase).filter(
        Clase.id == datos.clase_id
    ).first()

    if not clase:
        raise HTTPException(
            status_code=404,
            detail="Clase no encontrada"
        )
    
    conflicto = db.query(Reserva).join(Clase).filter(
        Reserva.socio_id == socio.id,
        Clase.dia == clase.dia,
        Clase.horario == clase.horario,
        Reserva.fecha_clase == datos.fecha_clase,
        Reserva.estado.in_(["confirmada", "pendiente_pago", "en_espera"])
    ).first()

    if conflicto:
        raise HTTPException(
            status_code=400,
            detail="Ya tiene una reserva en ese horario"
        )


    ocupadas = db.query(Reserva).filter(
        Reserva.clase_id == clase.id,
        Reserva.fecha_clase == datos.fecha_clase,
        Reserva.estado.in_(["confirmada", "pendiente_pago"])
    ).count()

    hay_cupo = ocupadas < clase.cupo

    return {
        "hay_cupo": hay_cupo,
        "debe_lista_espera": not hay_cupo,
        "creditos_disponibles": socio.creditos_disponibles,  
        "puede_usar_credito":   socio.creditos_disponibles > 0 
    }

# ──────────────────────────────────────────────────────────────
# Endpoint: crear reserva individual
# ──────────────────────────────────────────────────────────────

@router.post("/individual/crear")
def crear_reserva_individual(
    datos: ReservaIndividualCreate,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(db=db, token=token)

    # Solo miembros y no_miembros pueden reservar
    if socio.rol not in [Rol.Miembro.value, Rol.NoMiembro.value]:
        raise HTTPException(status_code=403, detail="No tiene permisos para reservar")

    # CORREGIDO: Traemos la clase acá arriba para que esté disponible si entra al 'if' de abajo
    clase = db.query(Clase).filter(Clase.id == datos.clase_id).first()
    if not clase:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    # Si ya tiene una reserva pendiente, la reutilizamos
    reserva_existente = db.query(Reserva).filter(
        Reserva.socio_id == socio.id,
        Reserva.clase_id == datos.clase_id,
        Reserva.fecha_clase == datos.fecha_clase,
        Reserva.tipo == TipoReserva.Individual.value,
        Reserva.estado == "pendiente_pago"
    ).first()

    if reserva_existente:
        monto = (clase.precio_individual * 0.5 
                 if datos.tipo_pago == "sena" 
                 else clase.precio_individual)
        reserva_existente.tipo_pago = datos.tipo_pago
        reserva_existente.monto_pagado = monto
        db.commit()
        db.refresh(reserva_existente)
        return {
            "mensaje": "Reserva retomada",
            "reserva_id": reserva_existente.id,
            "monto_a_pagar": monto,
            "hay_cupo": True,
            "debe_lista_espera": False
        }

    # Regla: no puede reservar una clase ya iniciada
    horario_str = str(clase.horario)[:5]  # "16:30:00" → "16:30"
    fecha_hora = datetime.strptime(
        f"{datos.fecha_clase} {horario_str}",
        "%Y-%m-%d %H:%M"
    )

    if datetime.now() >= fecha_hora:
        raise HTTPException(status_code=400, detail="La clase ya comenzó")

    # Regla: no puede reservar 2 clases mismo horario
    conflicto = db.query(Reserva).join(Clase).filter(
        Reserva.socio_id == socio.id,
        Clase.dia == clase.dia,
        Clase.horario == clase.horario,
        Reserva.fecha_clase == datos.fecha_clase,
        Reserva.estado.in_(["confirmada", "pendiente_pago", "en_espera"])
    ).first()

    if conflicto:
        raise HTTPException(status_code=400, detail="Ya tiene una reserva en ese horario")

    # Regla: no puede reservar individual si ya tiene membresía activa para esa clase
    membresia_existente = db.query(Reserva).filter(
        Reserva.socio_id == socio.id,
        Reserva.clase_id == clase.id,
        Reserva.fecha_clase == datos.fecha_clase,
        Reserva.tipo == TipoReserva.Membresia.value,
        Reserva.estado.in_(["confirmada", "pendiente_pago"])
    ).first()

    if membresia_existente:
        raise HTTPException(status_code=400, detail="Ya posee una membresía para esta clase")

    # Verificamos cupos actuales
    ocupadas = db.query(Reserva).filter(
        Reserva.clase_id == clase.id,
        Reserva.fecha_clase == datos.fecha_clase,
        Reserva.estado.in_(["confirmada", "pendiente_pago"])
    ).count()

    hay_cupo = ocupadas < clase.cupo

    # Validamos tipo de pago
    if datos.tipo_pago not in ["sena", "total"]:
        raise HTTPException(status_code=400, detail="Tipo de pago inválido")
    
    monto = clase.precio_individual * 0.5 if datos.tipo_pago == "sena" else clase.precio_individual

    # Creamos la reserva inicial en estado pendiente
    reserva = Reserva(
        socio_id=socio.id,
        clase_id=clase.id,
        tipo=TipoReserva.Individual.value,
        estado="pendiente_pago",
        fecha_clase=datos.fecha_clase,
        monto_total=clase.precio_individual,
        monto_pagado=monto,
        tipo_pago=datos.tipo_pago
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

        Reserva.tipo == TipoReserva.Individual.value,

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

    if datos.usa_credito:
        if socio.creditos_disponibles < 1:
            reserva.estado = "cancelada"
            db.commit()
            raise HTTPException(status_code=400, detail="No tenés créditos disponibles")

        socio.creditos_disponibles -= 1
        reserva.estado = "confirmada"
        reserva.monto_pagado = 0
        db.commit()

        try:
            await enviar_mail_pago_exitoso(socio, clase, reserva)
        except Exception as e:
            print(f"⚠️ Mail no enviado: {e}")

        return {"mensaje": "Reserva confirmada con crédito"}
    
    # ─────────────────────────────────────────────
    # Buscamos tarjeta simulada
    # ─────────────────────────────────────────────

    numero_limpio = datos.numero_tarjeta.replace(" ", "")

    titular_normalizado = " ".join(datos.titular.split())

    tarjeta = db.query(TarjetaSimulada).filter(
         TarjetaSimulada.numero == numero_limpio,
         func.lower(TarjetaSimulada.titular) == titular_normalizado.lower(),
         TarjetaSimulada.cvv == datos.cvv,
         TarjetaSimulada.fecha_vencimiento == datos.fecha_vencimiento
    ).first()

    if not tarjeta:
        reserva.estado = "cancelada"

        db.commit()

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
        if not datos.acepta_lista_espera:
            reserva.estado = "cancelada"
            db.commit()
            raise HTTPException(status_code=400, detail="No hay cupo disponible")

        # Usuario acepta lista de espera
        entrada = ListaEspera(
            socio_id=socio.id,
            clase_id=clase.id,
            fecha_clase=reserva.fecha_clase,
            tipo=TipoReserva.Individual.value,
            estado="esperando"
        )
        db.add(entrada)

        # CORREGIDO: Pasa a "en_espera", no "confirmada", para no bloquear cupo físico
        reserva.estado = "en_espera" 
        reserva.tarjeta_ultimos = tarjeta.numero
        reserva.tipo_tarjeta = tarjeta.tipo
        tarjeta.saldo -= reserva.monto_pagado
        db.commit()

        try:
            await enviar_mail_lista_espera(socio, clase, reserva.fecha_clase)
        except Exception as e:
            print(f"⚠️ Mail no enviado: {e}")

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

    try:
        await enviar_mail_pago_exitoso(socio, clase, reserva)
    except Exception as e:
        print(f"⚠️ Mail no enviado: {e}")

    alerta = None

    return {
        "mensaje": "El pago se realizó correctamente",
        "alerta": alerta,
    }

@router.delete("/individual/cancelar/{reserva_id}")
def cancelar_reserva_individual(

    reserva_id: int,

    token: str = Depends(oauth2_scheme),

    db: Session = Depends(get_db)
):

    socio = obtener_usuario_actual(db=db, token=token)

    reserva = db.query(Reserva).filter(

        Reserva.id == reserva_id,

        Reserva.socio_id == socio.id,

        Reserva.tipo == TipoReserva.Individual.value,

        Reserva.estado == "pendiente_pago"

    ).first()

    if not reserva:

        raise HTTPException(
            status_code=404,
            detail="Reserva no encontrada"
        )

    reserva.estado = "cancelada"

    db.commit()

    return {
        "mensaje": "Reserva cancelada"
    }

@router.get("/alertas-individuales")
def obtener_alertas_individuales(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(db=db, token=token)

    alertas = db.query(Reserva).filter(
        Reserva.socio_id == socio.id,
        Reserva.tipo == TipoReserva.Individual.value,
        Reserva.mensaje_admin != None
    ).order_by(Reserva.id.desc()).all()

    return [
        {
            "reserva_id": r.id,
            "mensaje": r.mensaje_admin,
            "clase_id": r.clase_id,
            "fecha": r.fecha_clase
        }
        for r in alertas
    ]


@router.delete("/lista-espera/cancelar/{reserva_id}")
def cancelar_lista_espera(
    reserva_id: int,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    socio = obtener_usuario_actual(db=db, token=token)

    reserva = db.query(Reserva).filter(
        Reserva.id == reserva_id,
        Reserva.socio_id == socio.id
    ).first()

    if not reserva:
        raise HTTPException(
            status_code=404,
            detail="Reserva no encontrada"
        )

    entrada_lista = db.query(ListaEspera).filter(
        ListaEspera.socio_id == socio.id,
        ListaEspera.clase_id == reserva.clase_id,
        ListaEspera.fecha_clase == reserva.fecha_clase,
        ListaEspera.estado == "esperando"
    ).first()

    if not entrada_lista:
        raise HTTPException(
            status_code=400,
            detail="La reserva no está en lista de espera"
        )

    db.delete(entrada_lista)
    db.delete(reserva)

    db.commit()

    return {
        "mensaje": "Se dio de baja de la lista de espera"
    }
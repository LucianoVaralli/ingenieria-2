from schemas import clase
from services.sugerencias import sugerir_bloques_libres
from models.lista_espera import ListaEspera
from models.reserva_MIO import Reserva
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from models.enums import Rol, TipoReserva
from models.clase import Clase
from models.gimnasio import Gimnasio
from models.socio import Socio
from schemas.clase import (
    ClaseCreate,
    CancelarClaseDia,
    EliminarClase,
    CambioProfesorTemporal,
    CambioProfesorPermanente,
    EscanearQRRequest 
)
from routes.membresia import _actualizar_membresia_activa_hasta
from sqlalchemy import func 
from calendar import monthrange
from datetime import date, timedelta

from dependencies.database import get_db
from services.notificaciones import crear_notificacion

from models.cambioTemporal import CambioProfesorTemporal as CambioProfesorTemporalDB
from models.cambioPermanente import CambioProfesorPermanente as CambioProfesorPermanenteDB
from models.cancelacion_clase import CancelacionClaseDia

from services.auth import (
    obtener_usuario_actual,
    oauth2_scheme)

import uuid
from models.Asistencia import Asistencia
router = APIRouter(
    prefix="/clases",
    tags=["Clases"]
)

from collections import defaultdict

from fastapi import BackgroundTasks
from services.mail_service import (
    enviar_mail_nueva_clase,
    enviar_mail_clase_eliminada,
    enviar_mail_cambio_permanente,
    enviar_mail_cambio_temporal,
    notificar_eliminar_clase_membresia,
    notificar_eliminar_clase_individual,
    notificar_cancelar_dia_membresia,
    notificar_cancelar_dia_individual,

)

def validar_capacidad_horaria(
    db,
    dia,
    horario,
    duracion,
    cupo_nuevo
):
    gimnasio = db.query(Gimnasio).first()

    clases = db.query(Clase).filter(
        Clase.activa == True,
        Clase.dia == dia
    ).all()

    eventos = []

    for c in clases:
        inicio = c.horario.hour * 60 + c.horario.minute
        fin = inicio + c.duracion

        eventos.append((inicio, 1, c.cupo))
        eventos.append((fin, -1, c.cupo))

    nuevo_inicio = horario.hour * 60 + horario.minute
    nuevo_fin = nuevo_inicio + duracion

    eventos.append((nuevo_inicio, 1, cupo_nuevo))
    eventos.append((nuevo_fin, -1, cupo_nuevo))

    eventos.sort()

    actual = 0

    for tiempo, tipo, cupo in eventos:
        actual += tipo * cupo

        if actual > gimnasio.capacidad_total:

            hora_conflicto = f"{tiempo // 60:02}:{tiempo % 60:02}"

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Capacidad excedida el {dia} a las "
                    f"{hora_conflicto}. "
                    f"Se requieren {actual} lugares y el gimnasio posee "
                    f"{gimnasio.capacidad_total}."
                )
            )

def validar_superposicion_profesor(
    db,
    profesor_id,
    dia,
    horario,
    duracion,
    clase_excluir_id=None, 
    fecha=None
):
    nuevo_inicio = datetime.combine(
        datetime.today(),
        horario
    )

    nuevo_fin = nuevo_inicio + timedelta(
        minutes=duracion
    )

    query = db.query(Clase).filter(
        Clase.profesor_id == profesor_id,
        Clase.dia == dia,
        Clase.activa == True
    )

    # Para edición/cambio permanente evita compararse consigo misma
    if clase_excluir_id is not None:
        query = query.filter(
            Clase.id != clase_excluir_id
        )

    clases_profesor = query.all()

    # 1) Validar contra clases normales
    for clase_existente in clases_profesor:

        existente_inicio = datetime.combine(
            datetime.today(),
            clase_existente.horario
        )

        existente_fin = existente_inicio + timedelta(
            minutes=clase_existente.duracion
        )

        nuevo_inicio = nuevo_inicio.replace(
            tzinfo=None
        )

        nuevo_fin = nuevo_fin.replace(
            tzinfo=None
        )

        existente_inicio = existente_inicio.replace(
            tzinfo=None
        )

        existente_fin = existente_fin.replace(
            tzinfo=None
        )

        if (
            nuevo_inicio < existente_fin and
            nuevo_fin > existente_inicio
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    f"El profesor ya tiene una clase "
                    f"los {dia.value.capitalize()} "
                    f"de {clase_existente.horario.strftime('%H:%M')} "
                    f"a {existente_fin.strftime('%H:%M')}"
                )
            )

    # 2) Validar contra reemplazos temporales
    if fecha is not None:

        cambios_temporales = db.query(
            CambioProfesorTemporalDB
        ).filter(
            CambioProfesorTemporalDB.profesor_reemplazo_id == profesor_id,
            CambioProfesorTemporalDB.fecha == fecha
        ).all()

        for cambio in cambios_temporales:

            clase_temporal = db.query(Clase).filter(
                Clase.id == cambio.clase_id
            ).first()

            if not clase_temporal:
                continue

            existente_inicio = datetime.combine(
                datetime.today(),
                clase_temporal.horario
            )

            existente_fin = existente_inicio + timedelta(
                minutes=clase_temporal.duracion
            )

            if (
                nuevo_inicio < existente_fin and
                nuevo_fin > existente_inicio
            ):
                raise HTTPException(
                    status_code=400,
                    detail="El profesor ya tiene un reemplazo temporal asignado en ese horario"
                )

@router.post("/crear")
async def crear_clase(
    clase: ClaseCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    # Validaciones estructurales
    gimnasio = db.query(Gimnasio).first()
    if not gimnasio:
        raise HTTPException(status_code=404, detail="No existe configuración del gimnasio")

    if clase.cupo <= 0:
        raise HTTPException(status_code=400, detail="El cupo debe ser mayor a 0")

    if clase.precio_individual <= 0:
        raise HTTPException(status_code=400, detail="El precio debe ser mayor a 0")

    if clase.duracion <= 0:
        raise HTTPException(status_code=400, detail="La duración debe ser mayor a 0")

    if clase.duracion < 30:
        raise HTTPException(status_code=400, detail="La duración mínima es de 30 minutos")

    if clase.duracion > 240:
        raise HTTPException(status_code=400, detail="La duración máxima es de 4 horas")  

    try:
        validar_capacidad_horaria(
            db=db,
            dia=clase.dia,
            horario=clase.horario,
            duracion=clase.duracion,
            cupo_nuevo=clase.cupo
        )
    except HTTPException:
        huecos = sugerir_bloques_libres(db, clase.dia, clase.duracion)

        raise HTTPException(
            status_code=400,
            detail={
                "error": "No hay capacidad en ese horario",
                "horarios_libres": huecos
            }
        )

    # Buscar profesor por ID
    profesor = db.query(Socio).filter(
        Socio.id == clase.profesor_id,
        Socio.rol == Rol.Profesor.value
    ).first()

    if not profesor:
        raise HTTPException(status_code=400, detail="Creación de clase fallido por profesor inexistente")
    
    # VALIDACIÓN DE SUPERPOSICIÓN HORARIA
    validar_superposicion_profesor(
        db=db,
        profesor_id=profesor.id,
        dia=clase.dia,
        horario=clase.horario,
        duracion=clase.duracion
    )
        
    # Crear la clase si todo está OK 
    nueva_clase = Clase(
        actividad=clase.actividad,
        dia=clase.dia,
        horario=clase.horario,
        profesor_id=profesor.id,
        cupo=clase.cupo,
        precio_individual=clase.precio_individual,
        duracion=clase.duracion
    )

    db.add(nueva_clase)
    db.commit()
    db.refresh(nueva_clase)

    try:
        background_tasks.add_task(
            enviar_mail_nueva_clase,
            profesor=profesor,
            clase=nueva_clase
        )
    except Exception as e:
        print(f"⚠️ Mail profesor no enviado: {e}")

    return {"mensaje": "Creación de clase exitosa", "clase_id": nueva_clase.id}

@router.get("/ocupacion/{dia}")
def obtener_ocupacion_dia(dia: str, db: Session = Depends(get_db)):
    gimnasio = db.query(Gimnasio).first()

    if not gimnasio:
        raise HTTPException(
            status_code=404,
            detail="No existe configuración del gimnasio"
        )
    
    clases = db.query(Clase).filter(
        Clase.activa == True,
        Clase.dia == dia
    ).all()

    eventos = []

    for c in clases:
        inicio = c.horario.hour * 60 + c.horario.minute
        fin = inicio + c.duracion

        eventos.append((inicio, c.cupo))   # +cupo
        eventos.append((fin, -c.cupo))     # -cupo

    eventos.sort()

    ocupacion = 0
    resultado = []

    hora_actual = 6 * 60
    hora_fin = 22 * 60

    i = 0
    while hora_actual <= hora_fin:
        while i < len(eventos) and eventos[i][0] <= hora_actual:
            _, cambio = eventos[i]
            ocupacion += cambio
            i += 1

        resultado.append({
            "hora": f"{hora_actual//60:02}:{hora_actual%60:02}",
            "ocupacion": ocupacion,
            "capacidad": gimnasio.capacidad_total
        })

        hora_actual += 60  # o 30 si querés más detalle

    return resultado


@router.get("/eliminar/{clase_id}/info")
def obtener_info_eliminacion(
    clase_id: int,
    db: Session = Depends(get_db)
):
    clase = db.query(Clase).filter(
        Clase.id == clase_id,
        Clase.activa == True
    ).first()

    if not clase:
        raise HTTPException(
            status_code=404,
            detail="Clase no encontrada"
        )

    hoy_str = date.today().strftime("%Y-%m-%d")

    reservas_futuras = db.query(Reserva).filter(
        Reserva.clase_id == clase.id,
        Reserva.estado.in_(["confirmada", "pendiente_pago"]),
        Reserva.fecha_clase >= hoy_str
    ).all()

    socios_membresia = set()
    socios_individual = set()

    for reserva in reservas_futuras:
        if reserva.tipo == TipoReserva.Membresia.value:
            socios_membresia.add(reserva.socio_id)

        elif reserva.tipo == TipoReserva.Individual.value:
            socios_individual.add(reserva.socio_id)

    return {
        "clase_id": clase.id,
        "actividad": clase.actividad,
        "alumnos_afectados": len(socios_membresia | socios_individual),
        "reservas_afectadas": len(reservas_futuras),
        "socios_membresia": len(socios_membresia),
        "socios_individual": len(socios_individual),
    }    

@router.put("/eliminar/{clase_id}")
async def eliminar_clase(
    clase_id: int,
    datos: EliminarClase,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    clase = db.query(Clase).filter(Clase.id == clase_id, Clase.activa == True).first()
    
    if not clase:
        raise HTTPException(status_code=404, detail="Clase no encontrada")
    
    gimnasio = db.query(Gimnasio).first()
    if not gimnasio:
        raise HTTPException(status_code=404, detail="Configuración de gimnasio no encontrada")
 
    hoy_str = date.today().strftime("%Y-%m-%d")
 
    reservas_futuras = db.query(Reserva).filter(
        Reserva.clase_id == clase.id,
        Reserva.estado.in_(["confirmada", "pendiente_pago"]),
        Reserva.fecha_clase >= hoy_str
    ).all()

    profesor= db.query(Socio).filter(Socio.id == clase.profesor_id).first()
 
    # ── CASO 1: Sin alumnos → eliminación física ──
    if not reservas_futuras:
        db.delete(clase)
        db.commit()
        if profesor:
            try:
                background_tasks.add_task(
                    enviar_mail_clase_eliminada,
                    profesor=profesor,
                    clase=clase
                )
            except Exception as e:
                print(f"⚠️ Mail profesor no enviado: {e}")

        return {"mensaje": "Eliminación completada exitosamente"}
 
    # ── CASO 2: Con alumnos → baja lógica + compensaciones ──
    clase.activa      = False
    clase.motivo_baja = datos.motivo
 
    socios_afectados = set()  # ← NUEVO: para recalcular membresía al final
    
    creditos_por_socio = defaultdict(int)
    reembolsos_por_socio = defaultdict(float)
    pendiente_pago = defaultdict(int)

    for reserva in reservas_futuras:
        estado_previo = reserva.estado
        reserva.estado             = "cancelada"
        reserva.tipo_cancelacion   = "eliminacion_definitiva"
        reserva.motivo_cancelacion = datos.motivo
 
        # Pendiente de pago → solo notificar, sin compensación económica
        if estado_previo == "pendiente_pago":
            pendiente_pago[reserva.socio_id] += 1
            reserva.mensaje_admin = "Cancelada sin impacto económico"
            socios_afectados.add(reserva.socio_id) 
            continue
 
        # Confirmada de membresía → crédito
        if reserva.tipo == TipoReserva.Membresia.value:
            socio = db.query(Socio).filter(Socio.id == reserva.socio_id).first()
            if socio:
                socio.creditos_disponibles += 1
                creditos_por_socio[socio.id] += 1
            reserva.credito_generado = True
            reserva.mensaje_admin    = "Crédito otorgado por eliminación de clase"
            socios_afectados.add(reserva.socio_id)  # ← NUEVO
 
        # Confirmada individual → reembolso
        elif reserva.tipo == TipoReserva.Individual.value:
            socio = db.query(Socio).filter(Socio.id == reserva.socio_id).first()
            if socio:
                reembolsos_por_socio[socio.id] = reserva.porcentaje_pagado
            reserva.reembolso_realizado = True
            reserva.mensaje_admin       = "Reembolso procesado"
    
    for socio_id, creditos in creditos_por_socio.items():
        socio = db.query(Socio).filter(
            Socio.id == socio_id
        ).first()

        crear_notificacion(
            db,
            socio_id,
            "Clase Eliminada",
            f"Se eliminó la clase de los {clase.dia.value} a las {clase.horario.strftime('%H:%M')}.\n\n "
            f"Se te otorgó 1 crédito como compensación por cada clase faltante de mes. Total de creditos: {creditos}"
        )

        if socio:
            background_tasks.add_task(
                notificar_eliminar_clase_membresia,
                socio,
                clase,
                creditos
            )

    for socio_id, seña in reembolsos_por_socio.items():
        socio = db.query(Socio).filter(
            Socio.id == socio_id
        ).first()       

        crear_notificacion(
            db,
            socio_id,
            "Clase Eliminada",
            f"Se eliminó la clase de los {clase.dia.value} a las {clase.horario.strftime('%H:%M')}. "
            f"Se te devolvió el {seña}% del pago."
        )
        if socio:
            background_tasks.add_task(
                notificar_eliminar_clase_individual,
                socio,
                clase,
                seña
            )

    for socio_id, creditos in pendiente_pago.items():

        crear_notificacion(
            db,
            socio_id,
            "Clase Eliminada",
            f"La clase de los {clase.dia.value} a las {clase.horario.strftime('%H:%M')} "
            f"fue eliminada antes de tu pago."
        )

    # Avisar lista de espera
    espera = db.query(ListaEspera).filter(
        ListaEspera.clase_id    == clase.id,
        ListaEspera.fecha_clase >= hoy_str,
        ListaEspera.estado      == "esperando"
    ).all()
 
    for item in espera:
        item.estado = "clase_eliminada"
        crear_notificacion(
            db,
            item.socio_id,
            "Clase Eliminada",
            f"La clase de los {clase.dia.value} a las {clase.horario.strftime('%H:%M')} "
            f"fue eliminada y ya no estará disponible."
        )
 
    db.flush()  # aplicar todo antes de recalcular
 
    # ── NUEVO: recalcular membresia_activa_hasta para cada socio afectado ──
    # Esto limpia la fecha y el flag cuota_al_dia si no le quedan reservas confirmadas
    for socio_id in socios_afectados:
        _actualizar_membresia_activa_hasta(socio_id, db)
 
    db.commit()

    try:
        background_tasks.add_task(
            enviar_mail_clase_eliminada,
            profesor=profesor,
            clase=clase
        )
    except Exception as e:
        print(f"⚠️ Mail profesor no enviado: {e}")

    return {"mensaje": "Clase dada de baja correctamente con notificaciones y compensaciones"}

@router.get("/cancelar-dia/{clase_id}/fechas")
async def obtener_fechas_cancelables(
    clase_id: int,
    db: Session = Depends(get_db)
):
    clase = db.query(Clase).filter(
        Clase.id == clase_id,
        Clase.activa == True
    ).first()

    if not clase:
        raise HTTPException(
            status_code=404,
            detail="Clase no encontrada"
        )

    dias_map = {
        "lunes": 0,
        "martes": 1,
        "miercoles": 2,
        "jueves": 3,
        "viernes": 4,
        "sabado": 5,
        "domingo": 6
    }

    hoy = date.today()

    # Último día del mes actual
    ultimo_dia = monthrange(hoy.year, hoy.month)[1]

    fechas_disponibles = []

    for dia in range(hoy.day, ultimo_dia + 1):
        fecha = date(hoy.year, hoy.month, dia)

        if fecha.weekday() != dias_map[clase.dia.value]:
            continue

        # Verificar si esa fecha ya fue cancelada
        ya_cancelada = db.query(Reserva).filter(
            Reserva.clase_id == clase.id,
            Reserva.fecha_clase == fecha.strftime("%Y-%m-%d"),
            Reserva.estado == "cancelada",
            Reserva.tipo_cancelacion == "cancelacion_dia"
        ).first()

        if ya_cancelada:
            continue

        fechas_disponibles.append(
            fecha.strftime("%Y-%m-%d")
        )

    return fechas_disponibles

@router.put("/cancelar-dia/{clase_id}")
async def cancelar_clase_dia(
    clase_id: int,
    background_tasks: BackgroundTasks,
    datos: CancelarClaseDia,
    db: Session = Depends(get_db)
):
    clase = db.query(Clase).filter(Clase.id == clase_id, Clase.activa == True).first()
    
    if not clase:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    if not datos.fecha_clase:
        raise HTTPException(
            status_code=400,
            detail="Debe seleccionar una fecha"
        )
    
    if not datos.motivo.strip():
        raise HTTPException(status_code=400, detail="Debe ingresar un motivo de cancelación")
    
    if len(datos.motivo.strip()) < 5:
        raise HTTPException(
            status_code=400,
            detail="El motivo debe tener al menos 5 caracteres"
        )

    fecha = datetime.strptime(
        datos.fecha_clase,
        "%Y-%m-%d"
    ).date()

    dias = {
        0: "Lunes",
        1: "Martes",
        2: "Miercoles",
        3: "Jueves",
        4: "Viernes",
        5: "Sabado",
        6: "Domingo"
    }

    dia_fecha = dias[fecha.weekday()]

    if dia_fecha.lower() != clase.dia.value.lower():
        raise HTTPException(
            status_code=400,
            detail=f"La fecha seleccionada corresponde a {dia_fecha} y esta clase se dicta los {clase.dia.value.capitalize()}"
        )
    
    if fecha < date.today():
        raise HTTPException(
        status_code=400,
        detail="No se puede cancelar una clase de una fecha pasada"
    )

    ya_cancelada = db.query(CancelacionClaseDia).filter(
        CancelacionClaseDia.clase_id == clase.id,
        CancelacionClaseDia.fecha_clase == fecha
    ).first()

    if ya_cancelada:
        raise HTTPException(
            status_code=400,
            detail="Esa clase ya fue cancelada anteriormente."
        )

    # Buscar reservas tanto "confirmada" como "pendiente_pago" para ESE día puntual
    reservas = db.query(Reserva).filter(
        Reserva.clase_id == clase.id,
        Reserva.fecha_clase == datos.fecha_clase,
        Reserva.estado.in_(["confirmada", "pendiente_pago"])
    ).all()

    cancelacion = CancelacionClaseDia(
        clase_id=clase.id,
        fecha_clase=fecha,
        motivo=datos.motivo.strip()
    )

    db.add(cancelacion)

    creditos_por_socio = defaultdict(int)
    reembolsos_por_socio = defaultdict(float)
    pendientes_por_socio = defaultdict(int)

    if reservas:
        # Procesar alumnos anotados para esa fecha
        for reserva in reservas:
            estado_previo = reserva.estado
            
            reserva.estado = "cancelada"
            reserva.tipo_cancelacion = "cancelacion_dia"
            reserva.motivo_cancelacion = datos.motivo
            
            
            # Si estaba colgada sin pagar, solo la cancelamos sin otorgar beneficios
            if estado_previo == "pendiente_pago":
                pendientes_por_socio[reserva.socio.id] += 1
                reserva.mensaje_admin = f"La clase del día {clase.dia.value.capitalize()} {datos.fecha_clase} fue cancelada por el administrador antes de tu pago."
                continue
            
            # Si estaba CONFIRMADA, aplicamos devoluciones según tipo de usuario
            if reserva.tipo == TipoReserva.Membresia.value:
                socio = db.query(Socio).filter(Socio.id == reserva.socio_id).first()
                if socio:
                    socio.creditos_disponibles += 1
                    creditos_por_socio[socio.id] +=1

                reserva.credito_generado = True
                reserva.mensaje_admin = f"La clase del día {clase.dia.value.capitalize()} {datos.fecha_clase} fue cancelada. Tenés 1 crédito pendiente disponible."
                
            elif reserva.tipo == TipoReserva.Individual.value:
                socio = db.query(Socio).filter(Socio.id == reserva.socio_id).first()

                if socio:
                    reembolsos_por_socio[socio.id] = reserva.porcentaje_pagado

                reserva.reembolso_realizado = True
                reserva.mensaje_admin = f"La clase del día {clase.dia.value.capitalize()} {datos.fecha_clase} fue cancelada. Se devolvió el pago del {reserva.porcentaje_pagado}%."
        
    # No alteramos 'gimnasio.capacidad_disponible' porque la clase base sigue activa en la grilla.
    for socio_id, creditos in creditos_por_socio.items():
        socio = db.query(Socio).filter(
            Socio.id == socio_id
        ).first()

        crear_notificacion(
            db,
            socio_id,
            "Clase cancelada",
            f"Se canceló la clase del día {clase.dia.value.capitalize()} {datos.fecha_clase}. "
            f"Motivo: {datos.motivo.strip().capitalize()}. "
            f"Se te otorgó 1 crédito como compensación. Total de creditos: {creditos}. "
            f"La clase sigue activa en el resto del calendario."
        )

        if socio:
            background_tasks.add_task(
                notificar_cancelar_dia_membresia,
                socio,
                clase,
                datos.fecha_clase,
                datos.motivo.strip().capitalize()
            )

    for socio_id, seña in reembolsos_por_socio.items():
        socio = db.query(Socio).filter(
            Socio.id == socio_id
        ).first()       

        crear_notificacion(
            db,
            socio_id,
            "Clase cancelada",
            f"La clase del día {clase.dia.value.capitalize()} {datos.fecha_clase} fue cancelada. "
            f"Motivo: {datos.motivo.strip().capitalize()}. "
            f"Se devolvió el {seña}% del pago. La actividad continúa normalmente."
        )
        if socio:
            background_tasks.add_task(
                notificar_cancelar_dia_individual,
                socio,
                clase,
                seña,
                datos.fecha_clase,
                datos.motivo.strip().capitalize()
            )

    for socio_id, creditos in pendientes_por_socio.items():

        crear_notificacion(
            db,
            socio_id,
            "Clase cancelada",
            f"La clase del día {clase.dia.value.capitalize()} {datos.fecha_clase} fue cancelada."
            f"Motivo: {datos.motivo.strip().capitalize()}. La actividad continúa normalmente en los próximos días."
        )

    db.commit()
    return {"mensaje": f"Clase del día {clase.dia.value.capitalize()} {datos.fecha_clase} cancelada correctamente. Alumnos notificados."}

@router.get("/cancelar-dia/{clase_id}/info/{fecha}")
def info_cancelacion_dia(
    clase_id: int,
    fecha: str,
    db: Session = Depends(get_db)
):
    reservas = db.query(Reserva).filter(
        Reserva.clase_id == clase_id,
        Reserva.fecha_clase == fecha,
        Reserva.estado.in_(["confirmada", "pendiente_pago"])
    ).all()

    membresia = 0
    individuales = 0

    for reserva in reservas:
        if reserva.tipo == TipoReserva.Membresia.value:
            membresia += 1
        elif reserva.tipo == TipoReserva.Individual.value:
            individuales += 1

    return {
        "total": len(reservas),
        "membresia": membresia,
        "individuales": individuales
    }

@router.get("/")
def obtener_clases(db: Session = Depends(get_db)):
    clases = db.query(Clase).filter(
        Clase.activa == True
    ).all()

    resultado = []

    for c in clases:

        hoy_str = date.today().strftime("%Y-%m-%d")

        cantidad_alumnos = db.query(Reserva.socio_id).filter(
            Reserva.clase_id == c.id,
            Reserva.estado.in_(["confirmada", "pendiente_pago"]),
            Reserva.fecha_clase >= hoy_str
        ).distinct().count()

        # 🌟 Desglose por tipo (membresía vs individual)
        alumnos_membresia = db.query(Reserva.socio_id).filter(
            Reserva.clase_id == c.id,
            Reserva.estado.in_(["confirmada", "pendiente_pago"]),
            Reserva.fecha_clase >= hoy_str,
            func.lower(Reserva.tipo) == "membresia"
        ).distinct().count()

        alumnos_individual = db.query(Reserva.socio_id).filter(
            Reserva.clase_id == c.id,
            Reserva.estado.in_(["confirmada", "pendiente_pago"]),
            Reserva.fecha_clase >= hoy_str,
            func.lower(Reserva.tipo) != "membresia"
        ).distinct().count()

        profesor = db.query(Socio).filter(
            Socio.id == c.profesor_id
        ).first()

        resultado.append({
            "id": c.id,
            "actividad": c.actividad,
            "dia": c.dia,
            "horario": c.horario,
            "cupo": c.cupo,
            "precio_individual": c.precio_individual,
            "duracion": c.duracion,
            "profesor_id": c.profesor_id,
            "profesor_nombre": f"{profesor.nombre} {profesor.apellido}" if profesor else "Sin asignar",
            "alumnos_inscriptos": cantidad_alumnos,
            "alumnos_membresia": alumnos_membresia,
            "alumnos_individual": alumnos_individual
        })

    return resultado


@router.get("/calendario")
def obtener_calendario(
    fecha_inicio: str,  # Ej: "2026-06-01"
    fecha_fin: str,     # Ej: "2026-06-30"
    db: Session = Depends(get_db)
):
    try:
        f_inicio = datetime.strptime(fecha_inicio, "%Y-%m-%d").date()
        f_fin = datetime.strptime(fecha_fin, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")

    if f_inicio > f_fin:
        raise HTTPException(status_code=400, detail="La fecha de inicio no puede ser mayor a la de fin")

    # Mapeo de tu Enum DiaSemana al weekday de Python (0=Lunes, 2=Miércoles, etc.)
    # AJUSTA los nombres (.value o strings) según cómo se guarden en tu base de datos
    mapa_dias = {
        "Lunes": 0, "Martes": 1, "Miercoles": 2, "Jueves": 3, "Viernes": 4, "Sabado": 5, "Domingo": 6,
        "lunes": 0, "martes": 1, "miercoles": 2, "jueves": 3, "viernes": 4, "sabado": 5, "domingo": 6
    }

    # 1. Obtener todas las clases base activas
    clases_base = db.query(Clase).filter(Clase.activa == True).all()
    
    calendario_eventos = []
    
    # 2. Iterar día por día en el rango solicitado
    dias_totales = (f_fin - f_inicio).days + 1
    for i in range(dias_totales):
        fecha_actual = f_inicio + timedelta(days=i)
        weekday_actual = fecha_actual.weekday() # 0 a 6
        fecha_actual_str = fecha_actual.strftime("%Y-%m-%d")

        for cb in clases_base:
            # Verificar si la clase base corresponde al día de la semana actual
            # Usamos cb.dia.name o cb.dia.value según manejes el Enum de SQLAlchemy
            dia_nombre = cb.dia.value if hasattr(cb.dia, 'value') else cb.dia
            cambio_temporal = db.query(
                    CambioProfesorTemporalDB
                ).filter(
                    CambioProfesorTemporalDB.clase_id == cb.id,
                    CambioProfesorTemporalDB.fecha == fecha_actual
                ).first()
            
            if mapa_dias.get(dia_nombre) == weekday_actual:
                
                # 3. Buscar si hay reservas de CUALQUIER tipo para esta clase en esta fecha
                reservas_dia = db.query(Reserva).filter(
                    Reserva.clase_id == cb.id,
                    Reserva.fecha_clase == fecha_actual_str
                ).all()

                # Verificar si el ADMIN canceló este día específico (usando el estado de las reservas)
                dia_cancelado_por_admin = any(
                    r.estado == "cancelada" and r.tipo_cancelacion == "cancelacion_dia" 
                    for r in reservas_dia
                )

                # Si el día fue explícitamente cancelado por el administrador, NO lo mostramos en el calendario
                if dia_cancelado_por_admin:
                    continue

                # Contar cuántas reservas CONFIRMADAS o PENDIENTES DE PAGO restan cupo ese día
                cupos_ocupados = sum(
                    1 for r in reservas_dia 
                    if r.estado in ["confirmada", "pendiente_pago"]
                )
                
                cupo_disponible = max(0, cb.cupo - cupos_ocupados)

                # Obtener info del profesor para el objeto visual
                profesor_id = cb.profesor_id

                if cambio_temporal:
                    profesor_id = cambio_temporal.profesor_reemplazo_id

                profesor = db.query(Socio).filter(
                    Socio.id == profesor_id
                ).first()

                calendario_eventos.append({
                    "clase_id": cb.id,
                    "actividad": cb.actividad,
                    "fecha": fecha_actual_str,  # "2026-06-03" (Miércoles concreto)
                    "horario": cb.horario.strftime("%H:%M") if cb.horario else None,
                    "duracion": cb.duracion,
                    "precio_individual": cb.precio_individual,
                    "cupo_maximo": cb.cupo,
                    "cupo_disponible": cupo_disponible,
                    "profesor_nombre": f"{profesor.nombre} {profesor.apellido}" if profesor else "Sin asignar"
                })

    return calendario_eventos

@router.get("/mis-clases")
def obtener_clases_profesor(
    usuario=Depends(obtener_usuario_actual),
    db: Session = Depends(get_db)
):
    profesor = db.query(Socio).filter(
        Socio.id == usuario.id,
        Socio.rol == Rol.Profesor.value
    ).first()
    

    if not profesor:
        raise HTTPException(
            status_code=403,
            detail="Solo los profesores pueden acceder a este recurso"
        )

    clases = db.query(Clase).filter(
        Clase.profesor_id == profesor.id,
        Clase.activa == True
    ).all()

    reemplazos = db.query(CambioProfesorTemporalDB).filter(
        CambioProfesorTemporalDB.profesor_reemplazo_id == profesor.id,
        CambioProfesorTemporalDB.fecha >= date.today()
    ).all()

    resultado = []

    for c in clases:

        hoy = date.today()
        dias_map = {
            "lunes": 0, "martes": 1, "miercoles": 2, "jueves": 3,
            "viernes": 4, "sabado": 5, "domingo": 6
        }
        dia_clase = dias_map.get(c.dia.value if hasattr(c.dia, 'value') else c.dia, -1)

        # Inscriptos HOY
        cantidad_hoy = (
            db.query(Reserva.socio_id)
            .filter(
                Reserva.clase_id == c.id,
                Reserva.estado == "confirmada",
                Reserva.fecha_clase == str(hoy)
            )
            .distinct()
            .count()
        )
        
        # Inscriptos PRÓXIMA SEMANA ver si va o no
        dias_hasta_proxima = (dia_clase - hoy.weekday()) % 7
        if dias_hasta_proxima == 0:
            dias_hasta_proxima = 7

        proxima_fecha = hoy + timedelta(days=dias_hasta_proxima)

        reemplazo_proximo = db.query(CambioProfesorTemporalDB).filter(
            CambioProfesorTemporalDB.clase_id == c.id,
            CambioProfesorTemporalDB.profesor_original_id == profesor.id,
            CambioProfesorTemporalDB.fecha == proxima_fecha
        ).first()

        nombre_reemplazo_proximo = None

        if reemplazo_proximo:
            profesor_reemplazo = db.query(Socio).filter(
                Socio.id == reemplazo_proximo.profesor_reemplazo_id
            ).first()

            if profesor_reemplazo:
                nombre_reemplazo_proximo = (
                    f"{profesor_reemplazo.nombre} "
                    f"{profesor_reemplazo.apellido}"
                )

        cantidad_proxima = (
            db.query(Reserva.socio_id)
            .filter(
                Reserva.clase_id == c.id,
                Reserva.estado == "confirmada",
                Reserva.fecha_clase == str(proxima_fecha),
            )
            .distinct()
            .count()
        )
        reemplazo_hoy = db.query(CambioProfesorTemporalDB).filter(
            CambioProfesorTemporalDB.clase_id == c.id,
            CambioProfesorTemporalDB.profesor_original_id == profesor.id,
            CambioProfesorTemporalDB.fecha == hoy
        ).first()

        nombre_reemplazo = None

        if reemplazo_hoy:
            profesor_reemplazo = db.query(Socio).filter(
                Socio.id == reemplazo_hoy.profesor_reemplazo_id
            ).first()

            if profesor_reemplazo:
                nombre_reemplazo = (
                    f"{profesor_reemplazo.nombre} "
                    f"{profesor_reemplazo.apellido}"
                )

        resultado.append({
            "id": c.id,
            "actividad": c.actividad,
            "dia": c.dia,
            "horario": c.horario,
            "cupo": c.cupo,
            "precio_individual": c.precio_individual,
            "duracion": c.duracion,
            "profesor_id": c.profesor_id,
            "profesor_nombre": f"{profesor.nombre} {profesor.apellido}",
            "alumnos_inscriptos": cantidad_proxima,        # para clase de hoy
            "alumnos_proxima": cantidad_hoy,         # para clase futura
            "codigo_qr": c.codigo_qr,
            "tiene_reemplazo": reemplazo_hoy is not None,
            "profesor_reemplazo": nombre_reemplazo,
            "motivo_reemplazo": reemplazo_hoy.motivo if reemplazo_hoy else None,
            "tiene_reemplazo_proximo": reemplazo_proximo is not None,
            "profesor_reemplazo_proximo": nombre_reemplazo_proximo,
            "motivo_reemplazo_proximo": (
                reemplazo_proximo.motivo
                if reemplazo_proximo
                else None
            ),
            "fecha_reemplazo": (
                str(proxima_fecha)
                if reemplazo_proximo
                else None
            ),

        })

    clases_temporales = []

    for cambio in reemplazos:
        clase = db.query(Clase).filter(
            Clase.id == cambio.clase_id
        ).first()

        if not clase:
            continue

        alumnos = (
            db.query(Reserva.socio_id)
            .filter(
                Reserva.clase_id == clase.id,
                Reserva.fecha_clase == cambio.fecha,
                Reserva.estado.in_(["confirmada", "pendiente_pago"])
            )
            .distinct()
            .count()
        )
        hoy = date.today()
        if cambio.fecha == hoy:

            resultado.append({
                "id": clase.id,
                "actividad": clase.actividad,
                "dia": clase.dia,
                "horario": clase.horario,
                "cupo": clase.cupo,
                "precio_individual": clase.precio_individual,
                "duracion": clase.duracion,
                "profesor_id": profesor.id,
                "profesor_nombre": f"{profesor.nombre} {profesor.apellido}",
                "alumnos_inscriptos": alumnos,
                "alumnos_proxima": alumnos,
                "codigo_qr": clase.codigo_qr,
                "es_temporal": True,
                "fecha": cambio.fecha,
            })
        else:
            clases_temporales.append({
                "id": clase.id,
                "actividad": clase.actividad.value,
                "dia": clase.dia.value,
                "fecha": cambio.fecha,
                "horario": clase.horario.strftime("%H:%M"),
                "cupo": clase.cupo,
                "alumnos": alumnos,
                "es_temporal": True
            })
    return {
        "clases": resultado, 
        "clases_temporales": clases_temporales}

@router.get("/dias-cancelados")
def obtener_dias_cancelados(db: Session = Depends(get_db)):
    resultados = db.query(
        Reserva.clase_id, Reserva.fecha_clase
    ).filter(
        Reserva.estado == "cancelada",
        Reserva.tipo_cancelacion == "cancelacion_dia"
    ).distinct().all()

    return [
        {"clase_id": r[0], "fecha": str(r[1])}
        for r in resultados
    ]

@router.get("/{clase_id}/alumnos")
def obtener_alumnos_de_clase(
    clase_id: int,
    fecha: date,
    db: Session = Depends(get_db)
):
    clase = db.query(Clase).filter(Clase.id == clase_id).first()

    if not clase:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    hoy = date.today()

    # Traer reservas confirmadas para ESA fecha específica.
    # Si la fecha consultada es futura (la clase ya pasó a "próxima"),
    # solo cuentan los socios con reserva por MEMBRESÍA: los que reservaron
    # como "Individual" pagaron por esa única clase, no por las siguientes.
    reservas_query = db.query(Reserva).filter(
        Reserva.clase_id == clase_id,
        Reserva.estado == "confirmada",
        Reserva.fecha_clase == fecha
    )

    reservas_fecha = reservas_query.all()

    alumnos = []

    for reserva in reservas_fecha:
        socio = db.query(Socio).filter(Socio.id == reserva.socio_id).first()
        if not socio:
            continue

        # Verificar asistencia solo si la fecha es hoy o anterior
        if fecha <= hoy:
            asistencia = (
                db.query(Asistencia)
                .filter(
                    Asistencia.clase_id == clase_id,
                    Asistencia.socio_id == socio.id,
                    Asistencia.fecha_clase == fecha
                )
                .first()
            )
            asistio = asistencia is not None
        else:
            # Fecha futura: no se sabe si va a asistir
            asistio = None

        alumnos.append({
            "id": socio.id,
            "nombre": socio.nombre,
            "apellido": socio.apellido,
            "email": socio.email,
            "tipo_reserva": reserva.tipo,
            "asistio": asistio  # None = futuro, True/False = pasado
        })

    return {
        "clase_id": clase.id,
        "actividad": clase.actividad,
        "alumnos": alumnos
    }

@router.get("/{clase_id}/cupo-disponible")
def cupo_disponible(
    clase_id: int,
    fecha: str,
    db: Session = Depends(get_db)
):
    clase = db.query(Clase).filter(Clase.id == clase_id).first()
    if not clase:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    ocupadas = db.query(Reserva).filter(
        Reserva.clase_id == clase_id,
        Reserva.fecha_clase == fecha,
        Reserva.estado.in_(["confirmada", "pendiente_pago"])
    ).count()

    personas_en_espera = db.query(Reserva).filter(
        Reserva.clase_id == clase_id,
        Reserva.fecha_clase == fecha,
        Reserva.estado.in_(["en_espera", "notificado"])
    ).count()

    # Si hay alguien esperando, el cupo libre queda reservado para esa lista.
    if personas_en_espera > 0 and ocupadas < clase.cupo:
        ocupadas += 1

    disponibles = max(clase.cupo - ocupadas, 0)

    return {
        "cupo_maximo": clase.cupo,
        "ocupadas": ocupadas,
        "disponibles": disponibles,
        "hay_cupo": disponibles > 0
    }

@router.put("/cambiar-rol/{socio_id}")
def cambiar_rol(socio_id: int, rol: str, db: Session = Depends(get_db)):
    socio = db.query(Socio).filter(Socio.id == socio_id).first()
    if not socio:
        raise HTTPException(status_code=404, detail="Socio no encontrado")
    socio.rol = rol
    db.commit()
    return {"mensaje": f"Rol cambiado a {rol}"}


@router.put("/cambiar-profesor-temporal/{clase_id}")
async def cambiar_profesor_temporal(
    clase_id: int,
    datos: CambioProfesorTemporal,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    clase = db.query(Clase).filter(
        Clase.id == clase_id,
        Clase.activa == True
    ).first()

    if not clase:
        raise HTTPException(
            status_code=404,
            detail="Clase no encontrada"
        )
    
    if datos.fecha < date.today():
        raise HTTPException(
            status_code=400,
            detail="No se puede asignar un reemplazo para una fecha pasada"
        )

    if datos.fecha == date.today():

        ahora = datetime.now()

        inicio = datetime.combine(
            datos.fecha,
            clase.horario
        )

        # mínimo 5 minutos antes
        limite = inicio - timedelta(minutes=5)

        if ahora > limite:
            raise HTTPException(
                status_code=400,
                detail="Los cambios temporales deben realizarse al menos 5 minutos antes del inicio de la clase."
            )

    profesor = db.query(Socio).filter(
        Socio.id == datos.profesor_id,
        Socio.rol == Rol.Profesor.value
    ).first()

    if not profesor:
        raise HTTPException(
            status_code=400,
            detail="Profesor inválido"
        )

    if datos.profesor_id == clase.profesor_id:
        raise HTTPException(
            status_code=400,
            detail="La clase ya tiene asignado ese profesor como titular"
        )

    if len(datos.motivo.strip()) < 5:
        raise HTTPException(
            status_code=400,
            detail="El motivo debe tener al menos 5 caracteres"
        )

    cambio_existente = db.query(
        CambioProfesorTemporalDB
    ).filter(
        CambioProfesorTemporalDB.clase_id == clase.id,
        CambioProfesorTemporalDB.fecha == datos.fecha
    ).first()

    if cambio_existente:

        if cambio_existente.profesor_reemplazo_id == datos.profesor_id:
            raise HTTPException(
                status_code=400,
                detail="Ese profesor ya está asignado para esa fecha"
            )

        validar_superposicion_profesor(
            db=db,
            profesor_id=datos.profesor_id,
            dia=clase.dia,
            horario=clase.horario,
            duracion=clase.duracion,
            fecha=datos.fecha
        )

        cambio_existente.profesor_reemplazo_id = datos.profesor_id
        cambio_existente.motivo = datos.motivo.strip()

    else:

        validar_superposicion_profesor(
            db=db,
            profesor_id=datos.profesor_id,
            dia=clase.dia,
            horario=clase.horario,
            duracion=clase.duracion,
            fecha=datos.fecha
        )

        nuevo_cambio = CambioProfesorTemporalDB(
            clase_id=clase.id,
            profesor_original_id=clase.profesor_id,
            profesor_reemplazo_id=datos.profesor_id,
            fecha=datos.fecha,
            motivo=datos.motivo.strip()
        )

        db.add(nuevo_cambio)

    db.commit()

    reservas = db.query(Reserva).filter(
        Reserva.clase_id == clase.id,
        Reserva.estado.in_(["confirmada", "pendiente_pago"])
    ).all()

    for reserva in reservas:
        crear_notificacion(
            db,
            reserva.socio_id,
            "Cambio de profesor",
            f"Se hizo un cambio temporal del profesor de la clase del día {clase.dia.value.capitalize()} {datos.fecha}. "
            f"Motivo: {datos.motivo.strip().capitalize()}. "
            f"Solo afecta la clase del día {datos.fecha} y el resto del calendario sigue con el profesor habitual."
        )

    try:
        background_tasks.add_task(
            enviar_mail_cambio_temporal,
            profesor=profesor,
            clase=clase,
            fecha=datos.fecha
        )
    except Exception as e:
        print(f"⚠️ Mail profesor no enviado: {e}")

    return {
        "mensaje": "Cambio temporal de profesor registrado correctamente"
    }

@router.put("/cambiar-profesor-permanente/{clase_id}")
async def cambiar_profesor_permanente(
    clase_id: int,
    datos: CambioProfesorPermanente,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    clase = db.query(Clase).filter(
        Clase.id == clase_id,
        Clase.activa == True
    ).first()

    if not clase:
        raise HTTPException(
            status_code=404,
            detail="Clase no encontrada"
        )

    profesor = db.query(Socio).filter(
        Socio.id == datos.profesor_id,
        Socio.rol == Rol.Profesor.value
    ).first()

    if not profesor:
        raise HTTPException(
            status_code=400,
            detail="Profesor inválido"
        )

    if datos.profesor_id == clase.profesor_id:
        raise HTTPException(
            status_code=400,
            detail="La clase ya tiene asignado ese profesor como titular"
        )

    if len(datos.motivo.strip()) < 5:
        raise HTTPException(
            status_code=400,
            detail="El motivo debe tener al menos 5 caracteres"
        )

    validar_superposicion_profesor(
        db=db,
        profesor_id=datos.profesor_id,
        dia=clase.dia,
        horario=clase.horario,
        duracion=clase.duracion,
        clase_excluir_id=clase.id
    )

    registro = CambioProfesorPermanenteDB(
        clase_id=clase.id,
        profesor_anterior_id=clase.profesor_id,
        profesor_nuevo_id=datos.profesor_id,
        motivo=datos.motivo.strip()
    )

    db.add(registro)

    clase.profesor_id = datos.profesor_id

    db.commit()

    reservas = db.query(Reserva).filter(
        Reserva.clase_id == clase.id,
        Reserva.estado.in_(["confirmada", "pendiente_pago"])
    ).all()

    try:
        background_tasks.add_task(
            enviar_mail_cambio_permanente,
            profesor=profesor,
            clase=clase
        )
    except Exception as e:
        print(f"⚠️ Mail profesor no enviado: {e}")

    for reserva in reservas:
        crear_notificacion(
            db,
            reserva.socio_id,
            "Cambio de profesor",
            f"Se hizo un cambio permanente del profesor de la clase del {clase.dia.value} a las {clase.horario.strftime('%H:%M')}. "
            f"Motivo: {datos.motivo.strip().capitalize()}."
        )

    return {
        "mensaje": "Profesor cambiado permanentemente"
    }

@router.post("/{clase_id}/generar-qr")
def generar_qr(
    clase_id: int,
    db: Session = Depends(get_db)
):
    clase = db.query(Clase).filter(
        Clase.id == clase_id,
        Clase.activa == True
    ).first()

    if not clase:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    if clase.codigo_qr:
        return {
            "clase_id": clase.id,
            "codigo_qr": clase.codigo_qr,
            "mensaje": "El QR ya fue generado anteriormente"
        }

    clase.codigo_qr = str(uuid.uuid4())
    db.commit()

    return {
        "clase_id": clase.id,
        "codigo_qr": clase.codigo_qr,
        "mensaje": "QR generado exitosamente"
    }


@router.post("/escanear-qr")
def escanear_qr(
    datos: EscanearQRRequest,
    db: Session = Depends(get_db),
    socio_actual = Depends(obtener_usuario_actual)
):
    clase = db.query(Clase).filter(
        Clase.codigo_qr == datos.codigo_qr,
        Clase.activa == True
    ).first()

    if not clase:
        raise HTTPException(status_code=404, detail="Código QR inválido")

    from models.reserva_MIO import Reserva
    from datetime import date

    hoy = date.today()

    reserva = db.query(Reserva).filter(
        Reserva.clase_id == clase.id,
        Reserva.socio_id == socio_actual.id,
        Reserva.fecha_clase == hoy,
        Reserva.estado == "confirmada"
    ).first()

    if not reserva:
        raise HTTPException(
            status_code=403,
            detail="No estás registrado para esta clase en la fecha indicada"
        )

    asistencia_existente = db.query(Asistencia).filter(
        Asistencia.socio_id == socio_actual.id,
        Asistencia.clase_id == clase.id,
        Asistencia.fecha_clase == datos.fecha_clase
    ).first()

    if asistencia_existente:
        raise HTTPException(
            status_code=400,
            detail="Tu asistencia ya fue registrada para esta clase"
        )

    nueva_asistencia = Asistencia(
        socio_id=socio_actual.id,
        clase_id=clase.id,
        fecha_clase=datos.fecha_clase
    )
    db.add(nueva_asistencia)
    db.commit()

    return {
        "mensaje": "Asistencia registrada con éxito",
        "clase": clase.actividad,
        "fecha": datos.fecha_clase
    }
@router.get("/{clase_id}/mi-asistencia")
def verificar_mi_asistencia(
    clase_id: int,
    fecha: str,
    db: Session = Depends(get_db),
    socio_actual = Depends(obtener_usuario_actual)
):
    asistencia = db.query(Asistencia).filter(
        Asistencia.socio_id == socio_actual.id,
        Asistencia.clase_id == clase_id,
        Asistencia.fecha_clase == fecha
    ).first()

    return {"registrada": asistencia is not None}

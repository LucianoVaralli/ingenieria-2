from services.sugerencias import sugerir_bloques_libres
from models.lista_espera import ListaEspera
from models.reserva_MIO import Reserva
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from models.enums import Rol
from models.clase import Clase
from models.gimnasio import Gimnasio
from models.socio import Socio
from schemas.clase import (
    ClaseCreate,
    CancelarClaseDia,
    EliminarClase
)

from dependencies.database import get_db

router = APIRouter(
    prefix="/clases",
    tags=["Clases"]
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


@router.post("/crear")
async def crear_clase(
    clase: ClaseCreate,
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
    nuevo_inicio = datetime.combine(
        datetime.today(),
        clase.horario
    )

    nuevo_fin = nuevo_inicio + timedelta(
        minutes=clase.duracion
    )

    clases_profesor = db.query(Clase).filter(
        Clase.profesor_id == profesor.id,
        Clase.dia == clase.dia
    ).all()    

    for clase_existente in clases_profesor:
        existente_inicio = datetime.combine(
            datetime.today(),
            clase_existente.horario
        )

        existente_fin = existente_inicio + timedelta(
            minutes=clase_existente.duracion
        )

        # Limpiamos zonas horarias por seguridad
        nuevo_inicio = nuevo_inicio.replace(tzinfo=None)
        nuevo_fin = nuevo_fin.replace(tzinfo=None)
        existente_inicio = existente_inicio.replace(tzinfo=None)
        existente_fin = existente_fin.replace(tzinfo=None)

        # Si hay cualquier tipo de cruce de horarios para el mismo profesor...
        if (
            nuevo_inicio < existente_fin and
            nuevo_fin > existente_inicio
        ):
            raise HTTPException(
                status_code=400,
                detail="El profesor ya tiene una clase en ese horario"
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

@router.put("/eliminar/{clase_id}")
async def eliminar_clase(
    clase_id: int,
    datos: EliminarClase,
    db: Session = Depends(get_db)
):
    clase = db.query(Clase).filter(Clase.id == clase_id).first()
    if not clase:
        raise HTTPException(status_code=404, detail="Clase no encontrada")
    # 1. Buscar la clase recurrente activa
    clase = db.query(Clase).filter(Clase.id == clase_id, Clase.activa == True).first()
    if not clase:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    gimnasio = db.query(Gimnasio).first()
    if not gimnasio:
        raise HTTPException(status_code=404, detail="Configuración de gimnasio no encontrada")

    hoy_str = date.today().strftime("%Y-%m-%d")

    # 2. Buscar reservas futuras (confirmadas o pendientes de pago)
    reservas_futuras = db.query(Reserva).filter(
        Reserva.clase_id == clase.id,
        Reserva.estado.in_(["confirmada", "pendiente_pago"]),
        Reserva.fecha_clase >= hoy_str
    ).all()

    # =======================================================================
    # CASO 1: Si no tiene alumnos con reservas futuras, se elimina física y completamente
    # =======================================================================
    if not reservas_futuras:        
        #ya no necesito devolver nada porque es dinamicamente
        db.delete(clase)
        db.commit()
        return {"mensaje": "Eliminación completada exitosamente"}

    # =======================================================================
    # CASO 2: Si tiene alumnos, se procesan los créditos/pagos y se da de baja lógica
    # =======================================================================
    clase.activa = False
    clase.motivo_baja = datos.motivo

    # Procesar cada reserva pendiente del mes/futuro para otorgar beneficios
    for reserva in reservas_futuras:
        estado_previo = reserva.estado
        reserva.estado = "cancelada"
        reserva.tipo_cancelacion = "eliminacion_definitiva"
        reserva.motivo_cancelacion = datos.motivo
        
        # Si nunca pagó, solo se cancela el turno sin beneficios
        if estado_previo == "pendiente_pago":
            reserva.mensaje_admin = "La clase fue dada de baja por el administrador antes de registrarse tu pago."
            continue

        # Si estaba CONFIRMADA, entregamos créditos o simulamos reembolsos
        if reserva.tipo and (reserva.tipo.startswith("m") or reserva.tipo == "membresia"):
            socio = db.query(Socio).filter(Socio.id == reserva.socio_id).first()
            if socio:
                socio.creditos_disponibles += 1
            reserva.credito_generado = True
            reserva.mensaje_admin = f"Clase eliminada permanentemente. Se te otorgó 1 crédito pendiente por la clase del {reserva.fecha_clase}."
            
        elif reserva.tipo == "individual":
            reserva.reembolso_realizado = True
            reserva.mensaje_admin = f"Clase eliminada permanentemente. Se realizó la devolución del pago del {reserva.porcentaje_pagado}%."
    
    # Cancelar las listas de espera futuras para esa clase
    db.query(ListaEspera).filter(
        ListaEspera.clase_id == clase.id,
        ListaEspera.fecha_clase >= hoy_str,
        ListaEspera.estado == "esperando"
    ).update({"estado": "clase_eliminada"})

    db.commit()
    return {"mensaje": "Clase dada de baja. Se cancelaron las reservas futuras, otorgando créditos a miembros y reembolsos a individuales."}


@router.put("/cancelar-dia/{clase_id}")
async def cancelar_clase_dia(
    clase_id: int,
    datos: CancelarClaseDia,
    db: Session = Depends(get_db)
):
    clase = db.query(Clase).filter(Clase.id == clase_id, Clase.activa == True).first()
    if not clase:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    if not datos.motivo.strip():
        raise HTTPException(status_code=400, detail="Debe ingresar un motivo de cancelación")

    # Buscar reservas tanto "confirmada" como "pendiente_pago" para ESE día puntual
    reservas = db.query(Reserva).filter(
        Reserva.clase_id == clase.id,
        Reserva.fecha_clase == datos.fecha_clase,
        Reserva.estado.in_(["confirmada", "pendiente_pago"])
    ).all()

    # Procesar alumnos anotados para esa fecha
    for reserva in reservas:
        estado_previo = reserva.estado
        
        reserva.estado = "cancelada"
        reserva.tipo_cancelacion = "cancelacion_dia"
        reserva.motivo_cancelacion = datos.motivo
        
        # Si estaba colgada sin pagar, solo la cancelamos sin otorgar beneficios
        if estado_previo == "pendiente_pago":
            reserva.mensaje_admin = f"La clase del día {datos.fecha_clase} fue cancelada por el administrador antes de tu pago."
            continue
        
        # Si estaba CONFIRMADA, aplicamos devoluciones según tipo de usuario
        if reserva.tipo and (reserva.tipo.startswith("m") or reserva.tipo == "membresia"):
            socio = db.query(Socio).filter(Socio.id == reserva.socio_id).first()
            if socio:
                socio.creditos_disponibles += 1
            reserva.credito_generado = True
            reserva.mensaje_admin = f"La clase del día {datos.fecha_clase} fue cancelada. Tenés 1 crédito pendiente disponible."
            
        elif reserva.tipo == "individual":
            reserva.reembolso_realizado = True
            reserva.mensaje_admin = f"La clase del día {datos.fecha_clase} fue cancelada. Se devolvió el pago del {reserva.porcentaje_pagado}%."
    
    # Cancelar la lista de espera de ese día específico
    db.query(ListaEspera).filter(
        ListaEspera.clase_id == clase.id,
        ListaEspera.fecha_clase == datos.fecha_clase,
        ListaEspera.estado == "esperando"
    ).update({"estado": "dia_cancelado"})

    # No alteramos 'gimnasio.capacidad_disponible' porque la clase base sigue activa en la grilla.

    db.commit()
    return {"mensaje": f"Clase del día {datos.fecha_clase} cancelada correctamente. Alumnos notificados y base de datos actualizada."}

@router.get("/")
def obtener_clases(db: Session = Depends(get_db)):
    clases = db.query(Clase).filter(
        Clase.activa == True
    ).all()

    resultado = []

    for c in clases:
        profesor = db.query(Socio).filter(Socio.id == c.profesor_id).first()
        resultado.append({
            "id": c.id,
            "actividad": c.actividad,
            "dia": c.dia,
            "horario": c.horario,
            "cupo": c.cupo,
            "precio_individual": c.precio_individual,
            "duracion": c.duracion,
            "profesor_id": c.profesor_id,
            "profesor_nombre": f"{profesor.nombre} {profesor.apellido}" if profesor else "Sin asignar"
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
                profesor = db.query(Socio).filter(Socio.id == cb.profesor_id).first()

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

@router.put("/cambiar-rol/{socio_id}")
def cambiar_rol(socio_id: int, rol: str, db: Session = Depends(get_db)):
    socio = db.query(Socio).filter(Socio.id == socio_id).first()
    if not socio:
        raise HTTPException(status_code=404, detail="Socio no encontrado")
    socio.rol = rol
    db.commit()
    return {"mensaje": f"Rol cambiado a {rol}"}

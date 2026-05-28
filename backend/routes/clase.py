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

@router.post("/crear")
async def crear_clase(
    clase: ClaseCreate,
    db: Session = Depends(get_db)
):
    gimnasio = db.query(Gimnasio).first()
    if not gimnasio:
        raise HTTPException(status_code=404, detail="No existe configuración del gimnasio")

    if clase.cupo <= 0:
        raise HTTPException(status_code=400, detail="El cupo debe ser mayor a 0")

    # 1. VALIDACIÓN INDIVIDUAL: Ninguna clase puede superar el límite físico total del gimnasio
    if clase.cupo > gimnasio.capacidad_total:
        raise HTTPException(status_code=400, detail=f"El cupo de la clase supera la capacidad total del gimnasio ({gimnasio.capacidad_total})")

    if clase.precio_individual <= 0:
        raise HTTPException(status_code=400, detail="El precio debe ser mayor a 0")

    if clase.duracion < 30 or clase.duracion > 240:
        raise HTTPException(status_code=400, detail="La duración de la clase es de mínimo 30 minutos y maximo 4 horas")

    profesor = db.query(Socio).filter(
        Socio.email == clase.profesor_email,
        Socio.rol == Rol.Profesor.value
    ).first()

    if not profesor:
        raise HTTPException(status_code=400, detail="Creación de clase fallido por profesor inexistente")

    # Tiempos de la nueva clase
    nuevo_inicio = datetime.combine(datetime.today(), clase.horario).replace(tzinfo=None)
    nuevo_fin = (nuevo_inicio + timedelta(minutes=clase.duracion)).replace(tzinfo=None)

    # 2. VALIDACIÓN DE SUPERPOSICIÓN DE PROFESOR Y CAPACIDAD SIMULTÁNEA DEL GIMNASIO
    # Traemos TODAS las clases del mismo día para evaluar espacio total ocupado en ese momento
    clases_del_dia = db.query(Clase).filter(
        Clase.dia == clase.dia,
        Clase.activa == True
    ).all()    

    cupo_simultaneo_usado = 0

    for clase_existente in clases_del_dia:
        existente_inicio = datetime.combine(datetime.today(), clase_existente.horario).replace(tzinfo=None)
        existente_fin = (existente_inicio + timedelta(minutes=clase_existente.duracion)).replace(tzinfo=None)

        # Verificar si se cruzan en el tiempo
        if nuevo_inicio < existente_fin and nuevo_fin > existente_inicio:
            
            # Control 2A: Si es el mismo profesor, rebota por superposición de agenda
            if clase_existente.profesor_id == profesor.id:
                raise HTTPException(
                    status_code=400,
                    detail="Creación de clase fallida porque el profesor ya tiene una clase en ese horario"
                )
            
            # Control 2B: Si es otro profesor pero comparten horario, sumamos los cupos para ver si se llena el gimnasio
            cupo_simultaneo_usado += clase_existente.cupo

    # Validamos que la suma de cupos simultáneos en ese horario no pase el límite del gimnasio
    if cupo_simultaneo_usado + clase.cupo > gimnasio.capacidad_total:
        raise HTTPException(
            status_code=400,
            detail=f"Falta de espacio: En ese horario el gimnasio ya tiene {cupo_simultaneo_usado} cupos ocupados de los {gimnasio.capacidad_total} totales."
        )   
        
    # Crear la clase si pasó todos los controles
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


@router.put("/eliminar/{clase_id}")
async def eliminar_clase(
    clase_id: int,
    datos: EliminarClase,
    db: Session = Depends(get_db)
):
    clase = db.query(Clase).filter(Clase.id == clase_id).first()
    if not clase:
        raise HTTPException(status_code=404, detail="Clase no encontrada")
    
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

    if not reservas_futuras:
        db.delete(clase)
        db.commit()
        return {"mensaje": "Eliminación completada exitosamente"}

    clase.activa = False
    clase.motivo_baja = datos.motivo

    for reserva in reservas_futuras:
        estado_previo = reserva.estado
        reserva.estado = "cancelada"
        reserva.tipo_cancelacion = "eliminacion_definitiva"
        reserva.motivo_cancelacion = datos.motivo
        
        if estado_previo == "pendiente_pago":
            reserva.mensaje_admin = "La clase fue dada de baja por el administrador antes de registrarse tu pago."
            continue

        if reserva.tipo and (reserva.tipo.startswith("m") or reserva.tipo == "membresia"):
            socio = db.query(Socio).filter(Socio.id == reserva.socio_id).first()
            if socio:
                socio.creditos_disponibles += 1
            reserva.credito_generado = True
            reserva.mensaje_admin = f"Clase eliminada permanentemente. Se te otorgó 1 crédito pendiente por la clase del {reserva.fecha_clase}."
            
        elif reserva.tipo == "individual":
            reserva.reembolso_realizado = True
            reserva.mensaje_admin = f"Clase eliminada permanentemente. Se realizó la devolución del pago del {reserva.porcentaje_pagado}%."
    
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

    reservas = db.query(Reserva).filter(
        Reserva.clase_id == clase.id,
        Reserva.fecha_clase == datos.fecha_clase,
        Reserva.estado.in_(["confirmada", "pendiente_pago"])
    ).all()

    for reserva in reservas:
        estado_previo = reserva.estado
        reserva.estado = "cancelada"
        reserva.tipo_cancelacion = "cancelacion_dia"
        reserva.motivo_cancelacion = datos.motivo
        
        if estado_previo == "pendiente_pago":
            reserva.mensaje_admin = f"La clase del día {datos.fecha_clase} fue cancelada por el administrador antes de tu pago."
            continue
        
        if reserva.tipo and (reserva.tipo.startswith("m") or reserva.tipo == "membresia"):
            socio = db.query(Socio).filter(Socio.id == reserva.socio_id).first()
            if socio:
                socio.creditos_disponibles += 1
            reserva.credito_generado = True
            reserva.mensaje_admin = f"La clase del día {datos.fecha_clase} fue cancelada. Tenés 1 crédito pendiente disponible."
            
        elif reserva.tipo == "individual":
            reserva.reembolso_realizado = True
            reserva.mensaje_admin = f"La clase del día {datos.fecha_clase} fue cancelada. Se devolvió el pago del {reserva.porcentaje_pagado}%."
    
    db.query(ListaEspera).filter(
        ListaEspera.clase_id == clase.id,
        ListaEspera.fecha_clase == datos.fecha_clase,
        ListaEspera.estado == "esperando"
    ).update({"estado": "dia_cancelado"})

    db.commit()
    return {"mensaje": f"Clase del día {datos.fecha_clase} cancelada correctamente. Alumnos notificados y base de datos actualizada."}


@router.get("/")
def obtener_clases(db: Session = Depends(get_db)):
    clases = db.query(Clase).filter(Clase.activa == True).all()
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
    fecha_inicio: str,
    fecha_fin: str,
    db: Session = Depends(get_db)
):
    try:
        f_inicio = datetime.strptime(fecha_inicio, "%Y-%m-%d").date()
        f_fin = datetime.strptime(fecha_fin, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD")

    if f_inicio > f_fin:
        raise HTTPException(status_code=400, detail="La fecha de inicio no puede ser mayor a la de fin")

    mapa_dias = {
        "Lunes": 0, "Martes": 1, "Miercoles": 2, "Jueves": 3, "Viernes": 4, "Sabado": 5, "Domingo": 6,
        "lunes": 0, "martes": 1, "miercoles": 2, "jueves": 3, "viernes": 4, "sabado": 5, "domingo": 6
    }

    clases_base = db.query(Clase).filter(Clase.activa == True).all()
    calendario_eventos = []
    
    dias_totales = (f_fin - f_inicio).days + 1
    for i in range(dias_totales):
        fecha_actual = f_inicio + timedelta(days=i)
        weekday_actual = fecha_actual.weekday()
        fecha_actual_str = fecha_actual.strftime("%Y-%m-%d")

        for cb in clases_base:
            dia_nombre = cb.dia.value if hasattr(cb.dia, 'value') else cb.dia
            
            if mapa_dias.get(dia_nombre) == weekday_actual:
                reservas_dia = db.query(Reserva).filter(
                    Reserva.clase_id == cb.id,
                    Reserva.fecha_clase == fecha_actual_str
                ).all()

                dia_cancelado_por_admin = any(
                    r.estado == "cancelada" and r.tipo_cancelacion == "cancelacion_dia" 
                    for r in reservas_dia
                )

                if dia_cancelado_por_admin:
                    continue

                cupos_ocupados = sum(
                    1 for r in reservas_dia 
                    if r.estado in ["confirmada", "pendiente_pago"]
                )
                
                cupo_disponible = max(0, cb.cupo - cupos_ocupados)
                profesor = db.query(Socio).filter(Socio.id == cb.profesor_id).first()

                calendario_eventos.append({
                    "clase_id": cb.id,
                    "actividad": cb.actividad,
                    "fecha": fecha_actual_str,
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
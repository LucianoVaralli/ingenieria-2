# services/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, timedelta, date
from database import SessionLocal
from models.lista_espera import ListaEspera
from models.reserva_MIO import Reserva
from models.clase import Clase
from models.membresia import Membresia

def limpiar_pagos_expirados(db):
    """
    Elimina o cancela las reservas que quedaron colgadas en 'pendiente_pago'
    por más de 15 minutos para liberar los cupos del día.
    """
    hace_15_min = datetime.now() - timedelta(minutes=15)
    
    reservas_expiradas = db.query(Reserva).filter(
        Reserva.estado == "pendiente_pago",
        Reserva.fecha_creacion <= hace_15_min
    ).all()
    
    for r in reservas_expiradas:
        # Si es individual o membresía que nunca se pagó, la borramos para limpiar la DB
        db.delete(r)

def liberar_prioridades_vencidas(db):

    hoy = datetime.now()

    if hoy.day <= 10:
        return

    membresias = db.query(Membresia).filter(
        Membresia.activa == True
    ).all()

    for m in membresias:

        mes_siguiente = m.mes_vigente + 1
        anio_siguiente = m.anio_vigente

        if mes_siguiente == 13:
            mes_siguiente = 1
            anio_siguiente += 1

        if m.fecha_expiracion and datetime.now() > m.fecha_expiracion:
            m.activa = False

def procesar_lista_espera():

    db = SessionLocal()
    try:

        liberar_prioridades_vencidas(db)
        
        # 1. Ejecutar primero la limpieza de reservas colgadas sin pagar
        limpiar_pagos_expirados(db)
        db.commit()

        ahora = datetime.now()
        hoy_str = date.today().strftime("%Y-%m-%d")

        # 2. Agrupar la búsqueda por combinaciones únicas de Clase y Fecha que estén esperando
        grupos_espera = db.query(ListaEspera.clase_id, ListaEspera.fecha_clase).filter(
            ListaEspera.estado == "esperando",
            ListaEspera.fecha_clase >= hoy_str
        ).distinct().all()

        for clase_id, fecha_clase in grupos_espera:
            clase = db.query(Clase).filter(Clase.id == clase_id, Clase.activa == True).first()
            if not clase:
                continue

            # Verificar si la clase de esta fecha específica ya comenzó
            try:
                # Soporta formatos de tiempo hh:mm:ss o hh:mm
                horario_limpio = clase.horario.strftime("%H:%M") if hasattr(clase.horario, "strftime") else str(clase.horario)[:5]
                fecha_hora_clase = datetime.strptime(f"{fecha_clase} {horario_limpio}", "%Y-%m-%d %H:%M")
            except Exception:
                continue

            # Si ya comenzó el turno, cancelamos a todos los que se quedaron esperando esa fecha
            if ahora >= fecha_hora_clase:
                db.query(ListaEspera).filter(
                    ListaEspera.clase_id == clase_id,
                    ListaEspera.fecha_clase == fecha_clase,
                    ListaEspera.estado == "esperando"
                ).update({"estado": "no_ingreso_comenzo_clase"})
                continue

            # Calcular cupos disponibles reales para esa fecha específica
            ocupadas = db.query(Reserva).filter(
                Reserva.clase_id == clase_id,
                Reserva.fecha_clase == fecha_clase,
                Reserva.estado.in_(["confirmada", "pendiente_pago"])
            ).count()

            cupos_libres = clase.cupo - ocupadas

            # 3. Promover alumnos de la lista mientras existan lugares disponibles
            while cupos_libres > 0:
                primero = db.query(ListaEspera).filter(
                    ListaEspera.clase_id == clase_id,
                    ListaEspera.fecha_clase == fecha_clase,
                    ListaEspera.estado == "esperando"
                ).order_by(
                    ListaEspera.tipo.desc(),          # "membresia" antes que "individual"
                    ListaEspera.fecha_ingreso.asc()   # El más antiguo primero
                ).first()

                if not primero:
                    break  # Ya no queda nadie en fila para esta fecha

                # Determinar montos según el tipo de usuario (Regla de negocio)
                monto = 0.0 if primero.tipo == "membresia" else clase.precio_individual

                nueva_reserva = Reserva(
                    socio_id=primero.socio_id,
                    clase_id=primero.clase_id,
                    tipo=primero.tipo,
                    estado="confirmada",  # Entra directo confirmada
                    fecha_clase=primero.fecha_clase,
                    monto_total=monto,
                    monto_pagado=monto,
                    mensaje_admin=f"Ingreso automático desde la lista de espera para la fecha {fecha_clase}."
                )
                db.add(nueva_reserva)
                
                # Sacar al socio de la lista (Baja lógica o física, se prefiere física para limpiar)
                db.delete(primero)
                
                # Consumimos un cupo libre en el bucle
                cupos_libres -= 1
                
                # TODO: Aquí colocar tu función de enviar_mail_notificacion(socio_id)

        db.commit()
    except Exception as e:
        print(f"Error en ejecución del scheduler: {e}")
        db.rollback()
    finally:
        db.close()

# Inicialización segura del planificador
scheduler = BackgroundScheduler()
# Modificado a 5 minutos para que la limpieza de pendiente_pago sea más dinámica y eficaz
scheduler.add_job(procesar_lista_espera, 'interval', minutes=5)

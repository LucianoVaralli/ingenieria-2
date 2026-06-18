
# services/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime, timedelta, date
from database import SessionLocal
from models.lista_espera import ListaEspera
from models.reserva_MIO import Reserva
from models.clase import Clase
 
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
        db.delete(r)
 
def procesar_lista_espera():
    db = SessionLocal()
    try:
        limpiar_pagos_expirados(db)
        db.commit()
 
        ahora = datetime.now()
        hoy_str = date.today().strftime("%Y-%m-%d")
 
        grupos_espera = db.query(ListaEspera.clase_id, ListaEspera.fecha_clase).filter(
            ListaEspera.estado == "esperando",
            ListaEspera.fecha_clase >= hoy_str
        ).distinct().all()
 
        for clase_id, fecha_clase in grupos_espera:
            clase = db.query(Clase).filter(Clase.id == clase_id, Clase.activa == True).first()
            if not clase:
                continue
 
            try:
                horario_limpio = clase.horario.strftime("%H:%M") if hasattr(clase.horario, "strftime") else str(clase.horario)[:5]
                fecha_hora_clase = datetime.strptime(f"{fecha_clase} {horario_limpio}", "%Y-%m-%d %H:%M")
            except Exception:
                continue
 
            if ahora >= fecha_hora_clase:
                db.query(ListaEspera).filter(
                    ListaEspera.clase_id == clase_id,
                    ListaEspera.fecha_clase == fecha_clase,
                    ListaEspera.estado == "esperando"
                ).update({"estado": "no_ingreso_comenzo_clase"})
                continue
 
            ocupadas = db.query(Reserva).filter(
                Reserva.clase_id == clase_id,
                Reserva.fecha_clase == fecha_clase,
                Reserva.estado.in_(["confirmada", "pendiente_pago"])
            ).count()
 
            cupos_libres = clase.cupo - ocupadas
 
            while cupos_libres > 0:
                primero = db.query(ListaEspera).filter(
                    ListaEspera.clase_id == clase_id,
                    ListaEspera.fecha_clase == fecha_clase,
                    ListaEspera.estado == "esperando"
                ).order_by(
                    ListaEspera.tipo.desc(),
                    ListaEspera.fecha_ingreso.asc()
                ).first()
 
                if not primero:
                    break
 
                monto = 0.0 if primero.tipo == "membresia" else clase.precio_individual
 
                nueva_reserva = Reserva(
                    socio_id=primero.socio_id,
                    clase_id=primero.clase_id,
                    tipo=primero.tipo,
                    estado="confirmada",
                    fecha_clase=primero.fecha_clase,
                    monto_total=monto,
                    monto_pagado=monto,
                    mensaje_admin=f"Ingreso automático desde la lista de espera para la fecha {fecha_clase}."
                )
                db.add(nueva_reserva)
                db.delete(primero)
                cupos_libres -= 1
 
        db.commit()
    except Exception as e:
        print(f"Error en ejecución del scheduler: {e}")
        db.rollback()
    finally:
        db.close()
 
 
# ── NUEVO: vencimientos mensuales ──
def procesar_vencimientos_mensuales():
    """
    Corre el día 1 de cada mes a las 00:00.
    1. Confirmadas del mes anterior → "vencida" (historial)
    2. Pendientes del mes anterior → "cancelada" (no renovaron, libera cupo)
    """
    from routes.membresia import _actualizar_membresia_activa_hasta
 
    db = SessionLocal()
    try:
        hoy = date.today()
        primer_dia_mes_actual = date(hoy.year, hoy.month, 1)
 
        socios_afectados = set()
 
        # Confirmadas del mes pasado → vencida
        confirmadas = db.query(Reserva).filter(
            Reserva.es_recurrente == True,
            Reserva.estado        == "confirmada",
            Reserva.fecha_clase   <  str(primer_dia_mes_actual),
        ).all()
        for r in confirmadas:
            r.estado = "vencida"
            socios_afectados.add(r.socio_id)
 
        # Pendientes del mes pasado → cancelada (no renovaron)
        pendientes = db.query(Reserva).filter(
            Reserva.es_recurrente == True,
            Reserva.estado        == "pendiente_pago",
            Reserva.fecha_clase   <  str(primer_dia_mes_actual),
        ).all()
        for r in pendientes:
            r.estado = "cancelada"
            socios_afectados.add(r.socio_id)
 
        db.flush()
 
        for socio_id in socios_afectados:
            _actualizar_membresia_activa_hasta(socio_id, db)
 
        db.commit()
        print(f"[scheduler] Vencimientos: {len(confirmadas)} vencidas, {len(pendientes)} pendientes canceladas")
 
    except Exception as e:
        db.rollback()
        print(f"[scheduler] Error en procesar_vencimientos_mensuales: {e}")
    finally:
        db.close()
 
 
# ── Inicialización del scheduler ──
scheduler = BackgroundScheduler()
 
# Job existente: lista de espera + limpieza de pagos (cada 5 min)
scheduler.add_job(procesar_lista_espera, 'interval', minutes=5)
 
# Job nuevo: vencimientos mensuales (día 1 de cada mes a las 00:00)
scheduler.add_job(
    procesar_vencimientos_mensuales,
    trigger=CronTrigger(day=1, hour=0, minute=0),
    id="procesar_vencimientos_mensuales",
    replace_existing=True,
)
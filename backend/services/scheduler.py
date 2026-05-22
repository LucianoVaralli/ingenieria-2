# services/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler 
from datetime import datetime
from database import SessionLocal
from models.lista_espera import ListaEspera
from models.reserva_MIO      import Reserva
from models.clase        import Clase

def procesar_lista_espera():
    """
    Corre cada 10 minutos y hace dos cosas:

    1. Si se liberó un cupo en una clase → mete al primero de la lista
       (prioridad: membresía antes que individual, y dentro del mismo tipo
       por orden de llegada, es decir el que lleva más tiempo esperando)

    2. Si ya comenzó la clase y el socio sigue en lista de espera →
       lo elimina. Ya pagó y no se le devuelve el dinero.
    """
    db = SessionLocal()
    try:
        ahora = datetime.now()

        # Traer todas las entradas de lista de espera
        entradas = db.query(ListaEspera).all()

        for entrada in entradas:
            clase = db.query(Clase).filter(Clase.id == entrada.clase_id).first()
            if not clase:
                db.delete(entrada)
                continue

            # Combinar fecha + horario para saber si la clase ya comenzó
            try:
                fecha_hora = datetime.strptime(
                    f"{entrada.fecha_clase} {clase.horario}", "%Y-%m-%d %H:%M"
                )
            except ValueError:
                continue

            # ── Caso 2: ya comenzó la clase y sigue en lista → eliminar ──
            if ahora >= fecha_hora:
                db.delete(entrada)
                continue

            confirmadas = db.query(Reserva).filter(
                Reserva.clase_id    == entrada.clase_id,
                Reserva.fecha_clase == entrada.fecha_clase,
                Reserva.estado      == "confirmada"
            ).count()

            if confirmadas < clase.cupo:

                primero = db.query(ListaEspera).filter(
                    ListaEspera.clase_id    == entrada.clase_id,
                    ListaEspera.fecha_clase == entrada.fecha_clase
                ).order_by(
                    ListaEspera.tipo.desc(),          # "membresia" > "individual"
                    ListaEspera.fecha_ingreso.asc()   # más antiguo primero
                ).first()

                if primero:
  
                    nueva_reserva = Reserva(
                        socio_id    = primero.socio_id,
                        clase_id    = primero.clase_id,
                        tipo        = primero.tipo,
                        estado      = "confirmada",
                        fecha_clase = primero.fecha_clase,
                        monto_total = clase.precio_individual,
                        monto_pagado = clase.precio_individual,
                    )
                    db.add(nueva_reserva)
                    clase.cupo -= 1

                    # Sacar al socio de la lista de espera
                    db.delete(primero)

                    # TODO: enviar mail al socio avisándole que entró a la clase

        db.commit()
    finally:
        db.close()


scheduler = BackgroundScheduler()
scheduler.add_job(procesar_lista_espera, 'interval', minutes=10)
scheduler.start()
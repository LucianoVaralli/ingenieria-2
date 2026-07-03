"""
Cancela automáticamente las reservas INDIVIDUALES que quedaron en
'pendiente_pago' porque el usuario abandonó el checkout (cerró la
pestaña, perdió conexión, no completó Mercado Pago, etc.) sin usar
el botón "Volver" de la app.

No toca reservas de tipo Membresía: los placeholders de renovación
(mes siguiente) son tipo == Membresia, así que quedan afuera del
filtro sin necesidad de ninguna condición extra.
"""

from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from models.reserva_MIO import Reserva
from models.enums import TipoReserva

# Minutos que le damos al usuario para completar el pago antes de liberar el cupo.
TTL_MINUTOS = 20


def cancelar_reservas_individuales_vencidas(db: Session) -> int:
    limite = datetime.now(timezone.utc) - timedelta(minutes=TTL_MINUTOS)

    vencidas = db.query(Reserva).filter(
        Reserva.tipo           == TipoReserva.Individual.value,
        Reserva.estado         == "pendiente_pago",
        Reserva.fecha_creacion < limite,
    ).all()

    for r in vencidas:
        r.estado = "cancelada"

    db.commit()

    if vencidas:
        print(f"[cleanup] Canceladas {len(vencidas)} reservas individuales vencidas.")

    return len(vencidas)
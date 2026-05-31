from models.notificacion import Notificacion


def crear_notificacion(db, socio_id: int, titulo: str, mensaje: str):
    notif = Notificacion(
        socio_id=socio_id,
        titulo=titulo,
        mensaje=mensaje,
        leida=False
    )
    db.add(notif)
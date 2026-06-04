from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from dependencies.database import get_db
from services.auth import oauth2_scheme, obtener_usuario_actual
from models.notificacion import Notificacion
from schemas.notificacion import NotificacionOut
from fastapi import HTTPException

router = APIRouter(
    prefix="/notificaciones",
    tags=["Notificaciones"]
)

#obtengo las notificaciones del usuario logueado, ordenadas de la mas reciente a la mas antigua
@router.get("/me", response_model=list[NotificacionOut])
def mis_notificaciones(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    usuario = obtener_usuario_actual(token, db)

    return db.query(Notificacion)\
        .filter(Notificacion.socio_id == usuario.id)\
        .order_by(Notificacion.fecha.desc())\
        .all()

@router.get("/no-leidas")
def cantidad_no_leidas(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    usuario = obtener_usuario_actual(token, db)

    cantidad = db.query(Notificacion).filter(
        Notificacion.socio_id == usuario.id,
        Notificacion.leida == False
    ).count()

    return {
        "cantidad": cantidad
    }

@router.put("/{notificacion_id}/leer")
def marcar_leida(
    notificacion_id: int,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    usuario = obtener_usuario_actual(token, db)

    notif = db.query(Notificacion).filter(
        Notificacion.id == notificacion_id,
        Notificacion.socio_id == usuario.id
    ).first()

    if not notif:
        raise HTTPException(
            status_code=404,
            detail="Notificación no encontrada"
        )

    notif.leida = True
    db.commit()

    return {"mensaje": "ok"}

@router.put("/leer-todas")
def leer_todas(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    usuario = obtener_usuario_actual(token, db)

    db.query(Notificacion)\
        .filter(Notificacion.socio_id == usuario.id)\
        .update({Notificacion.leida: True})

    db.commit()

    return {"mensaje": "ok"}    

@router.delete("/borrar-todas")
def borrar_todas(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    usuario = obtener_usuario_actual(token, db)

    db.query(Notificacion)\
        .filter(Notificacion.socio_id == usuario.id)\
        .delete()

    db.commit()
    return {"mensaje": "ok"}

@router.delete("/{notificacion_id}")
def borrar_notificacion(
    notificacion_id: int,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    usuario = obtener_usuario_actual(token, db)

    notif = db.query(Notificacion).filter(
        Notificacion.id == notificacion_id,
        Notificacion.socio_id == usuario.id
    ).first()

    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")

    db.delete(notif)
    db.commit()
    return {"mensaje": "ok"}


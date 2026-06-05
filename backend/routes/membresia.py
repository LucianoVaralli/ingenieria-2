from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date, timedelta, datetime

from dependencies.database import get_db
from models.socio import Socio
from models.reserva_MIO import Reserva
from services.auth import oauth2_scheme, obtener_usuario_actual

router = APIRouter(
    prefix="/membresia",
    tags=["Membresia"]
)
@router.post("/activar")
def activar_membresia(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = obtener_usuario_actual(token=token, db=db)

    socio = db.query(Socio).filter(Socio.id == user.id).first()

    hoy = date.today()

    socio.membresia_activa_hasta = hoy + timedelta(days=30)
    socio.fecha_membresia_inicio = hoy
    socio.cuota_al_dia = True

    db.commit()
    db.refresh(socio)   # 🔥 CLAVE

    print("GUARDADO OK:", socio.membresia_activa_hasta)

    return {
        "mensaje": "Membresía activada",
        "vigente_hasta": socio.membresia_activa_hasta
    }

# ─────────────────────────────────────────────
# RENOVAR MEMBRESÍA
# ─────────────────────────────────────────────
@router.post("/renovar")
def renovar_membresia(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user = obtener_usuario_actual(token=token, db=db)
    socio = db.query(Socio).filter(Socio.id == user.id).first()

    if not socio:
        raise HTTPException(400, "Socio no encontrado")

    # ✅ Nuevo: evitar renovar si ya fue renovada este mes
    hoy = date.today()
    if socio.membresia_activa_hasta and socio.membresia_activa_hasta > hoy + timedelta(days=30):
        raise HTTPException(400, "La membresía ya está renovada para el próximo mes")

    base = socio.membresia_activa_hasta if socio.membresia_activa_hasta else hoy
    base = max(base, hoy)

    socio.membresia_activa_hasta = base + timedelta(days=30)
    socio.cuota_al_dia = True

    db.commit()
    db.refresh(socio)

    return {
        "mensaje": "Membresía renovada",
        "vigente_hasta": socio.membresia_activa_hasta
    }

# ─────────────────────────────────────────────
# PROCESAR VENCIMIENTOS
# ─────────────────────────────────────────────
@router.post("/procesar-vencimientos")
def procesar_vencimientos(db: Session = Depends(get_db)):

    hoy = date.today()

    # Corrección de la query para que sea compatible con todas las bases de datos
    socios_vencidos = db.query(Socio).filter(
        Socio.membresia_activa_hasta.isnot(None),
        Socio.membresia_activa_hasta < hoy
    ).all()

    eliminadas = 0

    for socio in socios_vencidos:
        reservas = db.query(Reserva).filter(
            Reserva.socio_id == socio.id,
            Reserva.es_recurrente == True,
            Reserva.estado != "cancelada"
        ).all()

        for reserva in reservas:
            reserva.estado = "cancelada"
            eliminadas += 1

        socio.cuota_al_dia = False

    db.commit()  

    return {
        "reservas_eliminadas": eliminadas
    }

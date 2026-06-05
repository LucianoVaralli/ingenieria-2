from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from dependencies.database import get_db
from models.pregunta_frecuente import PreguntaFrecuente
from schemas.pregunta_frecuente import (
    PreguntaFrecuenteCreate,
    PreguntaFrecuenteResponse
)

router = APIRouter(
    prefix="/preguntas-frecuentes",
    tags=["Preguntas Frecuentes"]
)

@router.post("/crear_pregunta")
def crear_pregunta(
    datos: PreguntaFrecuenteCreate,
    db: Session = Depends(get_db)
):
    pregunta = PreguntaFrecuente(
        titulo=datos.titulo,
        respuesta=datos.respuesta
    )

    db.add(pregunta)
    db.commit()
    db.refresh(pregunta)

    return pregunta

@router.get("/listar_preguntas")
def listar_preguntas(db: Session = Depends(get_db)):
    return db.query(PreguntaFrecuente)\
        .filter(PreguntaFrecuente.activa == True)\
        .all()

@router.delete("/eliminar_pregunta/{pregunta_id}")
def eliminar_pregunta(
    pregunta_id: int,
    db: Session = Depends(get_db)
):
    pregunta = db.query(PreguntaFrecuente)\
        .filter(PreguntaFrecuente.id == pregunta_id)\
        .first()

    if not pregunta:
        raise HTTPException(
            status_code=404,
            detail="Pregunta no encontrada"
        )

    db.delete(pregunta)
    db.commit()

    return {"mensaje": "Pregunta eliminada"}

@router.put("/editar_pregunta/{pregunta_id}")
def editar_pregunta(
    pregunta_id: int,
    datos: PreguntaFrecuenteCreate,
    db: Session = Depends(get_db)
):
    pregunta = db.query(PreguntaFrecuente)\
        .filter(PreguntaFrecuente.id == pregunta_id)\
        .first()

    if not pregunta:
        raise HTTPException(
            status_code=404,
            detail="Pregunta no encontrada"
        )

    pregunta.titulo = datos.titulo
    pregunta.respuesta = datos.respuesta

    db.commit()
    db.refresh(pregunta)
    return {"mensaje": "Pregunta actualizada"}    

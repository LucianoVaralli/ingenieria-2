from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from dependencies.database import get_db
from models.calificacion import CalificacionDB
from models.socio import Socio
from models.clase import Clase
from sqlalchemy import func

from schemas.calificacion import (
    CalificacionCrear,
    CalificacionRespuesta
)
from models.cambioTemporal import CambioProfesorTemporal as CambioProfesorTemporalDB
from services.auth import (oauth2_scheme, obtener_usuario_actual)


router = APIRouter(
    prefix="/calificaciones",
    tags=["Calificaciones"]
)



@router.post("/", response_model=CalificacionRespuesta)
def crear_calificacion(
    datos: CalificacionCrear,
    db: Session = Depends(get_db),
    usuario = Depends(obtener_usuario_actual)
):

    # buscar clase
    clase = db.query(Clase).filter(
        Clase.id == datos.clase_id
    ).first()


    if not clase:
        raise HTTPException(
            status_code=404,
            detail="Clase no encontrada"
        )


    # validar que sea alumno de la clase
    # (después lo conectamos con tu tabla reservas/asistencia)


    # evitar doble calificación
    existe = db.query(CalificacionDB).filter(
        CalificacionDB.alumno_id == usuario.id,
        CalificacionDB.clase_id == datos.clase_id,
        CalificacionDB.profesor_id == clase.profesor_id
    ).first()


    if existe:
        raise HTTPException(
            status_code=400,
            detail="Ya calificaste esta clase"
        )


    if datos.puntuacion < 1 or datos.puntuacion > 5:
        raise HTTPException(
            status_code=400,
            detail="La puntuación debe estar entre 1 y 5"
        )

    profesor_actual = clase.profesor_id

    cambio = db.query(CambioProfesorTemporalDB).filter(
        CambioProfesorTemporalDB.clase_id == clase.id,
        CambioProfesorTemporalDB.fecha == datos.fecha_clase
    ).first()

    if cambio:
        profesor_actual = cambio.profesor_reemplazo_id

    nueva = CalificacionDB(
        alumno_id=usuario.id,
        clase_id=clase.id,
        profesor_id=profesor_actual,
        puntuacion=datos.puntuacion,
        comentario=datos.comentario
    )


    db.add(nueva)
    db.commit()
    db.refresh(nueva)


    return nueva

@router.get("/calificacion/{clase_id}")
def tiene_calificacion(
    clase_id: int,
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    alumno = obtener_usuario_actual(token, db)

    clase = db.query(Clase).filter(
        Clase.id == clase_id
    ).first()

    if not clase:
        raise HTTPException(
            status_code=404,
            detail="Clase no encontrada"
        )


    existe = db.query(CalificacionDB).filter(
        CalificacionDB.alumno_id == alumno.id,
        CalificacionDB.clase_id == clase_id,
        CalificacionDB.profesor_id == clase.profesor_id
    ).first()


    return {
        "calificada": existe is not None
    }

@router.get("/ranking-profesores")
def ranking_profesores(
    db: Session = Depends(get_db)
):

    resultados = (
        db.query(
            Socio.id.label("profesor_id"),
            Socio.nombre,
            Socio.apellido,
            func.avg(CalificacionDB.puntuacion).label("promedio"),
            func.count(CalificacionDB.id).label("cantidad")
        )
        .join(
            CalificacionDB,
            CalificacionDB.profesor_id == Socio.id
        )
        .group_by(
            Socio.id,
            Socio.nombre,
            Socio.apellido
        )
        .order_by(
            func.avg(CalificacionDB.puntuacion).desc()
        )
        .all()
    )

    return [
        {
            "profesor_id": r.profesor_id,
            "nombre": f"{r.nombre} {r.apellido}",
            "promedio": round(float(r.promedio),2),
            "cantidad_calificaciones": r.cantidad
        }
        for r in resultados
    ]

@router.get("/comentarios")
def comentarios(
    db: Session = Depends(get_db)
):

    comentarios = (
        db.query(CalificacionDB)
        .order_by(CalificacionDB.fecha_creacion.desc())
        .all()
    )

    resultado = []

    for c in comentarios:

        profesor = db.query(Socio).filter(
            Socio.id == c.profesor_id
        ).first()

        alumno = db.query(Socio).filter(
            Socio.id == c.alumno_id
        ).first()

        clase = db.query(Clase).filter(
            Clase.id == c.clase_id 
        ).first()

        resultado.append({

            "id": c.id,

            "profesor": f"{profesor.nombre} {profesor.apellido}",

            "alumno": f"{alumno.nombre} {alumno.apellido}",

            "puntuacion": c.puntuacion,

            "actividad": clase.actividad.value,

            "dia":clase.dia.value,

            "horario": clase.horario.strftime("%H:%M"),

            "comentario": c.comentario,

            "fecha": c.fecha_creacion

        })

    return resultado

@router.get("/satisfaccion")
def satisfaccion(
    db: Session = Depends(get_db)
):

    total = db.query(CalificacionDB).count()

    if total == 0:

        return {
            "promedio":0,
            "total":0,
            "estrellas":{
                5:0,
                4:0,
                3:0,
                2:0,
                1:0
            }
        }

    promedio = db.query(
        func.avg(CalificacionDB.puntuacion)
    ).scalar()

    estrellas = {}

    for i in range(1,6):

        estrellas[i] = db.query(
            CalificacionDB
        ).filter(
            CalificacionDB.puntuacion == i
        ).count()

    return {

        "promedio": round(float(promedio),2),

        "total": total,

        "estrellas": estrellas

    }
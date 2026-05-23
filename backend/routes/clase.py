from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.enums import Rol
from models.clase import Clase
from models.gimnasio import Gimnasio
from models.socio import Socio
from schemas.clase import ClaseCreate

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
    # Validaciones
    #validacion de que el gimnasio existe
    gimnasio = db.query(Gimnasio).first()
    if not gimnasio:
        raise HTTPException(status_code=404, detail="No existe configuración del gimnasio")

    #validacion de que el cupo es mayor a 0
    if clase.cupo <= 0:
        raise HTTPException(status_code=400, detail="El cupo debe ser mayor a 0")

    #validacion de que el gimnasio tiene capacidad disponible para esa clase
    if clase.cupo > gimnasio.capacidad_disponible:
        raise HTTPException(status_code=400, detail="Creación de clase fallido por falta de espacio en el gimnasio")

    #validacion de que el precio es mayor a 0
    if clase.precio_individual <= 0:
        raise HTTPException(status_code=400, detail="El precio debe ser mayor a 0")

    #validacion de que no exista una clase con la misma actividad, dia y horario
    if db.query(Clase).filter(
        Clase.actividad == clase.actividad,
        Clase.dia == clase.dia,
        Clase.horario == clase.horario
    ).first():
        raise HTTPException(status_code=400, detail="Creación de clase fallido por duplicar la misma clase")

    # Buscar profesor por email
    profesor = db.query(Socio).filter(
        Socio.email == clase.profesor_email,
        Socio.rol == Rol.Profesor.value
    ).first()

    # Validar que el profesor exista y no tenga otra clase en el mismo horario
    if not profesor:
        raise HTTPException(status_code=400, detail="Creación de clase fallido por profesor inexistente")

    if db.query(Clase).filter(
        Clase.profesor_id == profesor.id,
        Clase.dia == clase.dia,
        Clase.horario == clase.horario
    ).first():
        raise HTTPException(status_code=400, detail="Creación de clase fallida porque el profesor ya tiene una clase en ese horario")

    # Crear la clase
    nueva_clase = Clase(
        actividad=clase.actividad,
        dia=clase.dia,
        horario=clase.horario,
        profesor_id=profesor.id,
        cupo=clase.cupo,
        precio_individual=clase.precio_individual
    )

    db.add(nueva_clase)
    gimnasio.capacidad_disponible -= clase.cupo
    db.commit()
    db.refresh(nueva_clase)
    return {"mensaje": "Creación de clase exitosa", "clase_id": nueva_clase.id}


@router.delete("/{clase_id}")
async def eliminar_clase(
    clase_id: int,
    db: Session = Depends(get_db)
):
    gimnasio = db.query(Gimnasio).first()
    if not gimnasio:
        raise HTTPException(status_code=404, detail="No existe configuración del gimnasio")

    clase = db.query(Clase).filter(Clase.id == clase_id).first()
    if not clase:
        raise HTTPException(status_code=404, detail="La clase ingresada no existe")

    gimnasio.capacidad_disponible += clase.cupo
    db.delete(clase)
    db.commit()
    return {"mensaje": "Eliminacion Completada"}


@router.get("/")
def obtener_clases(db: Session = Depends(get_db)):
    clases = db.query(Clase).all()
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
            "profesor_id": c.profesor_id,
            "profesor_nombre": f"{profesor.nombre} {profesor.apellido}" if profesor else "Sin asignar"
        })
    return resultado


@router.put("/cambiar-rol/{socio_id}")
def cambiar_rol(socio_id: int, rol: str, db: Session = Depends(get_db)):
    socio = db.query(Socio).filter(Socio.id == socio_id).first()
    if not socio:
        raise HTTPException(status_code=404, detail="Socio no encontrado")
    socio.rol = rol
    db.commit()
    return {"mensaje": f"Rol cambiado a {rol}"}
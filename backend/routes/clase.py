from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.enums import Rol
from models.clase import Clase
from models.gimnasio import Gimnasio
from models.socio import Socio
from schemas.clase import ClaseCreate
from dependencies.auth import verificar_admin

from dependencies.database import get_db

router = APIRouter(
    prefix="/clases",
    tags=["Clases"]
)

@router.post("/crear")
async def crear_clase(
    clase: ClaseCreate,
    usuario_actual: Socio = Depends(verificar_admin),
    db: Session = Depends(get_db)
):
    
    gimnasio = db.query(Gimnasio).first()

    #validar que exista la configuración del gimnasio, por las dudas
    if not gimnasio:
        raise HTTPException(status_code=404,detail="No existe configuración del gimnasio")

    #validar que el cupo sea mayor a 0
    if clase.cupo <= 0:
        raise HTTPException(status_code=400,detail="El cupo debe ser mayor a 0")

    #validar que la capacidad de la clase no supere la capacidad disponible del gimnasio
    if clase.cupo > gimnasio.capacidad_disponible:
        raise HTTPException(status_code=400, detail="Creación de clase fallido por falta de espacio en el gimnasio")
    
    #validar que la clase no exista ya con el mismo dia, horario y actividad
    if db.query(Clase).filter(Clase.actividad == clase.actividad,
                              Clase.dia == clase.dia,
                              Clase.horario == clase.horario).first():
        raise HTTPException(status_code=400, detail="Creación de clase fallido por duplicar la misma clase")
    
    #validar que el profesor exista y tenga el rol de profesor
    if not db.query(Socio).filter(Socio.id == clase.profesor_id,
                                  Socio.rol == Rol.PROFESOR.value).first():
        raise HTTPException(status_code=400, detail="Creación de clase fallido por profesor inexistente")

    #ver si se pone como un escenario?
    if db.query(Clase).filter(Clase.profesor_id == clase.profesor_id,
                              Clase.dia == clase.dia,
                              Clase.horario == clase.horario).first():
        raise HTTPException(status_code=400, detail="Creación de clase fallida por el profesor ya tiene una clase en ese horario")
    # Crear la clase en la base de datos, paso las condiciones necesarias para crear la clase
    nueva_clase = Clase(
        actividad=clase.actividad,
        dia=clase.dia,
        horario=clase.horario,
        profesor_id=clase.profesor_id,
        cupo=clase.cupo
    )

    db.add(nueva_clase)
    gimnasio.capacidad_disponible -= clase.cupo # Reducir la capacidad disponible del gimnasio
    db.commit()
    db.refresh(nueva_clase)
    return {"mensaje": "Creación de clase exitosa", "clase_id": nueva_clase.id}

@router.delete("/{clase_id}")
async def eliminar_clase(
    clase_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Socio = Depends(verificar_admin)
):

    gimnasio = db.query(Gimnasio).first()

    # validar gimnasio
    if not gimnasio:
        raise HTTPException(
            status_code=404,
            detail="No existe configuración del gimnasio"
        )

    # buscar clase
    clase = db.query(Clase).filter(
        Clase.id == clase_id
    ).first()

    # validar existencia
    if not clase:
        raise HTTPException(
            status_code=404,
            detail="La clase ingresada no existe"
        )

    # devolver capacidad
    gimnasio.capacidad_disponible += clase.cupo

    # eliminar clase
    db.delete(clase)

    # guardar cambios
    db.commit()

    return {"mensaje": "Eliminacion Completada"}

@router.get("/")
def obtener_clases(db: Session = Depends(get_db)):
    return db.query(Clase).all()
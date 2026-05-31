from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import os
import shutil # Para guardar el archivo en el disco
from models.enums import Rol
import re
from dependencies.database import get_db
from models.socio import Socio
from schemas.socio import SocioCreate
from services.auth import get_password_hash, oauth2_scheme, obtener_usuario_actual

router = APIRouter(
    prefix="/socios",
    tags=["Socios"]
)

@router.post("/registrar")
async def registrar_socio(
    apto_fisico: UploadFile = File(...),
    nombre: str = Form(...),
    apellido: str = Form(...),
    dni: str = Form(...),
    email: str = Form(...),
    telefono: str = Form(...),
    password: str = Form(...),
    confirmar_password: str = Form(...),
    db: Session = Depends(get_db)
):
    
    # Validar DNI
    if not dni.isdigit() or len(dni) not in [7, 8]:
        raise HTTPException(status_code=400,detail="El DNI debe tener 7 u 8 dígitos números")
    
    # Teléfono
    if not telefono.isdigit() or len(telefono) != 10:
        raise HTTPException(status_code=400,detail="El teléfono debe tener 10 dígitos (ej: 2211234567).")

    if not apto_fisico or not apto_fisico.filename:
        raise HTTPException(status_code=400,detail="Debe adjuntar un apto físico en PDF")

    # 1. Validaciones de existencia (DNI y Email)
    if db.query(Socio).filter(Socio.dni == dni).first():
        raise HTTPException(status_code=400, detail="DNI ya registrado")
    
    if db.query(Socio).filter(Socio.email == email).first():
        raise HTTPException(status_code=400, detail="Correo ya registrado")

    # Password fuerte: 6-16 caracteres, al menos una mayúscula y un carácter especial
    pass_regex = r"^(?=.*[A-Z])(?=.*[!@#$%^&*]).{6,16}$"

    if not re.match(pass_regex, password):
        raise HTTPException(status_code=400,detail="Debe tener 6-16 caracteres, una mayúscula y un especial.")

    # Validar contraseñas
    if password != confirmar_password:
        raise HTTPException(status_code=400, detail="Las contraseñas no coinciden")

    # 2. VALIDACIÓN DEL ARCHIVO (Una sola vez, clara y segura)
    filename = apto_fisico.filename.lower()
    
    # Validamos extensión
    if not filename.endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Solo se permiten archivos con extensión .pdf"
        )
    
    # Validamos tipo MIME (opcional, pero recomendado)
    if apto_fisico.content_type != "application/pdf":
        raise HTTPException(
            status_code=400,
            detail="El archivo no es un PDF válido."
        )

    # 3. Guardar el archivo
    os.makedirs("uploads", exist_ok=True) 
    file_location = f"uploads/{dni}_{apto_fisico.filename}"
    
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(apto_fisico.file, buffer)

    # 4. Guardar en DB
    hashed_pass = get_password_hash(password)
    
    nuevo_socio = Socio(
        nombre=nombre,
        apellido=apellido,
        dni=dni,
        email=email,
        telefono=telefono,
        hashed_password=hashed_pass,
        apto_fisico_path=file_location,
        rol=Rol.Miembro.value 
    )

    db.add(nuevo_socio)
    db.commit()
    db.refresh(nuevo_socio)
    
    return {"mensaje": "registro exitoso", "socio_id": nuevo_socio.id}

@router.get("/me")
def obtener_mi_perfil(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):

    usuario = obtener_usuario_actual(token, db)
    
    return {
        "nombre": usuario.nombre,
        "apellido": usuario.apellido,
        "email": usuario.email,
        "rol": usuario.rol,
        "cuota_al_dia": usuario.cuota_al_dia,
        "apto_fisico": usuario.apto_fisico_path,
        "telefono": usuario.telefono,
        "dni": usuario.dni,
        "creditos_disponibles": usuario.creditos_disponibles
    }
""" esto se agregara luego, es para que el admin pueda ver la lista de profesores y me servira para la lista desplegable al crear una clase, para asignarle un profesor a esa clase
"""
@router.get("/profesores")
def obtener_profesores(db: Session = Depends(get_db)):

    profesores = db.query(Socio).filter(
        Socio.rol == Rol.Profesor.value
    ).all()

    return [
        {
            "id": p.id,
            "nombre": p.nombre,
            "apellido": p.apellido,
            "email": p.email
        }
        for p in profesores
    ]

@router.get("/")
def obtener_socios(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme) # FastAPI pide el token automáticamente
):
    # Validamos el token y obtenemos quién es el que pregunta
    usuario_peticion = obtener_usuario_actual(db, token)
    
  
    if usuario_peticion.rol not in [Rol.Admin, Rol.Profesor]:
        raise HTTPException(
            status_code=403, 
            detail="No tienes permisos para ver esta lista"
        )

    return db.query(Socio).all()
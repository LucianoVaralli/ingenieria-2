import os
import re
import shutil  # Para guardar el archivo en el disco
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Form, status
from sqlalchemy.orm import Session
from typing import Optional
from dependencies.database import get_db
from models.enums import Rol
from models.socio import Socio
from schemas.socio import SocioCreate, CambiarPasswordRequest
from services.auth import get_password_hash, oauth2_scheme, obtener_usuario_actual, verificar_password

router = APIRouter(prefix="/socios", tags=["Socios"])


@router.post("/registrar")
async def registrar_socio(
    apto_fisico: Optional[UploadFile] = File(None),
    nombre: Optional[str] = Form(None),
    apellido: Optional[str] = Form(None),
    dni: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    telefono: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    confirmar_password: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    errores = {}

    # Validar Nombre y Apellido
    if not nombre:
        errores["nombre"] = "El nombre es obligatorio."
    if not apellido:
        errores["apellido"] = "El apellido es obligatorio."

    # Validaciones de DNI
    if not dni or not dni.isdigit() or len(dni) not in [7, 8]:
        errores["dni"] = "El DNI debe tener 7 u 8 dígitos numéricos."
    elif db.query(Socio).filter(Socio.dni == dni).first():
        errores["dni"] = "DNI ya registrado."

    # Validación de Email
    if not email:
        errores["email"] = "El correo electrónico es obligatorio."
    elif db.query(Socio).filter(Socio.email == email).first():
        errores["email"] = "Correo ya registrado."

    # Validación de Teléfono
    if not telefono or not telefono.isdigit() or len(telefono) != 10:
        errores["telefono"] = "El teléfono debe tener 10 dígitos (ej: 2211234567)."

    # Validaciones de Contraseña
    pass_regex = r"^(?=.*[A-Z])(?=.*[!@#$%^&*]).{6,16}$"
    if not password or not re.match(pass_regex, password):
        errores["password"] = "Debe tener 6-16 caracteres, una mayúscula y un especial."
        
    if password != confirmar_password:
        errores["confirmar_password"] = "Las contraseñas no coinciden."

    # Validaciones del Archivo PDF
    if not apto_fisico or not apto_fisico.filename:
        errores["apto_fisico"] = "Debés subir un apto físico en PDF."
    else:
        filename = apto_fisico.filename.lower()
        if not filename.endswith(".pdf"):
            errores["apto_fisico"] = "Solo se permiten archivos con extensión .pdf"
        elif apto_fisico.content_type != "application/pdf":
            errores["apto_fisico"] = "El archivo no es un PDF válido."

    # SI HAY ERRORES ACUMULADOS (DE CUALQUIER TIPO), SE MANDAN TODOS JUNTOS
    if errores:
        raise HTTPException(status_code=400, detail=errores)

    # -------------------------------------------------------------
    # SI PASÓ TODO, RECIÉN ACÁ SE GUARDA
    # -------------------------------------------------------------
    os.makedirs("uploads", exist_ok=True)
    file_location = f"uploads/{dni}_{apto_fisico.filename}"

    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(apto_fisico.file, buffer)

    hashed_pass = get_password_hash(password)

    nuevo_socio = Socio(
        nombre=nombre,
        apellido=apellido,
        dni=dni,
        email=email,
        telefono=telefono,
        hashed_password=hashed_pass,
        apto_fisico_path=file_location,
        rol=Rol.Miembro.value,
    )

    db.add(nuevo_socio)
    db.commit()
    db.refresh(nuevo_socio)

    return {"mensaje": "registro exitoso", "socio_id": nuevo_socio.id}


@router.get("/me")
def obtener_mi_perfil(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
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
        "creditos_disponibles": usuario.creditos_disponibles,

        "membresia_activa": usuario.cuota_al_dia,
        "membresia_vencimiento": usuario.membresia_activa_hasta
    }


""" esto se agregara luego, es para que el admin pueda ver la lista de profesores y me servira para la lista desplegable al crear una clase, para asignarle un profesor a esa clase
"""
@router.get("/profesores")
def obtener_profesores(db: Session = Depends(get_db)):
    profesores = db.query(Socio).filter(Socio.rol == Rol.Profesor.value).all()

    return [
        {
            "id": p.id,
            "nombre": p.nombre,
            "apellido": p.apellido,
            "email": p.email,
        }
        for p in profesores
    ]


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
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
):
    # CORREGIDO: Mismo orden de parámetros que en /me (token, db)
    usuario_peticion = obtener_usuario_actual(token, db)

    # CORREGIDO: Se agregó .value para comparar correctamente con los strings/integers de la DB
    if usuario_peticion.rol not in [Rol.Admin.value, Rol.Profesor.value]:
        raise HTTPException(
            status_code=403, detail="No tienes permisos para ver esta lista"
        )

    return db.query(Socio).all()

@router.post("/cambiar-password")
def cambiar_contrasena_perfil(
    datos: CambiarPasswordRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    usuario = obtener_usuario_actual(token, db)
    
    if not verificar_password(datos.password_actual, usuario.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="La contraseña actual es incorrecta"
        )
    
    if datos.password_actual == datos.password_nueva:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña no puede ser igual a la actual"
        )
        
    usuario.hashed_password = get_password_hash(datos.password_nueva)
    db.commit()
    db.refresh(usuario)
    
    return {"mensaje": "Contraseña actualizada con éxito"}
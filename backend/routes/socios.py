import os
import re
import shutil
import token  # Para guardar el archivo en el disco
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, Form, status
from sqlalchemy.orm import Session
from typing import Optional
from dependencies.database import get_db
from models.enums import Rol
from models.socio import Socio
from schemas.socio import ProfesorUpdate, ProfesorCreate, CambiarPasswordRequest, CambiarPasswordInicialRequest
from services.auth import get_password_hash, oauth2_scheme, obtener_usuario_actual, verificar_password
import secrets
from fastapi import BackgroundTasks
from models.cambioTemporal import CambioProfesorTemporal
router = APIRouter(prefix="/socios", tags=["Socios"])

from services.mail_service import (
    enviar_mail_profesor,
)


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

        "membresia_activa":  bool(usuario.cuota_al_dia),
        "membresia_vencimiento": usuario.membresia_activa_hasta
        ,"primer_login": usuario.primer_login
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
            "telefono": str(p.telefono),
            "dni": str(p.dni),
        }
        for p in profesores
    ]

@router.get("/")
def obtener_socios(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
):
    usuario_peticion = obtener_usuario_actual(token, db)

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

    if usuario.primer_login:
        usuario.primer_login = False

    db.commit()
    db.refresh(usuario)
    
    return {"mensaje": "Contraseña actualizada con éxito"}

@router.post("/crear_profesores")
async def crear_profesor(
    datos: ProfesorCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):

    errores = {}

    if not datos.nombre.strip():
        errores["nombre"] = "El nombre es obligatorio"

    if not datos.apellido.strip():
        errores["apellido"] = "El apellido es obligatorio"

    if not datos.dni.isdigit() or len(datos.dni) not in [7, 8]:
        errores["dni"] = "El DNI debe tener 7 u 8 dígitos"

    if not datos.telefono.isdigit() or len(datos.telefono) != 10:
        errores["telefono"] = "El teléfono debe tener 10 dígitos"

    if db.query(Socio).filter(Socio.dni == datos.dni).first():
        errores["dni"] = "Ya existe un usuario con ese DNI"
    
    if not datos.email.strip():
        errores["email"] = "El correo electrónico es obligatorio."
    
    email_regex = r"^[^@]+@[^@]+\.[^@]+$"

    if not re.match(email_regex, datos.email):
        errores["email"] = "Ingresá un correo válido."

    if db.query(Socio).filter(Socio.email == datos.email).first():
        errores["email"] = "Ya existe un usuario con ese email"

    if errores:
        raise HTTPException(
            status_code=400,
            detail=errores
        )

    password_temporal = "Temp@" + secrets.token_hex(3)

    nuevo_profesor = Socio(
        nombre=datos.nombre,
        apellido=datos.apellido,
        dni=datos.dni,
        email=datos.email,
        telefono=datos.telefono,
        hashed_password=get_password_hash(password_temporal),
        rol=Rol.Profesor.value,
        primer_login=True
    )

    db.add(nuevo_profesor)
    db.commit()
    db.refresh(nuevo_profesor)

    try:
        background_tasks.add_task(
            enviar_mail_profesor,
            profesor=nuevo_profesor,
            password_temporal=password_temporal
        )
    except Exception as e:
        print(f"⚠️ Mail profesor no enviado: {e}")

    return {
        "mensaje": "Profesor creado correctamente",
        "password_temporal": password_temporal,
        "profesor_id": nuevo_profesor.id
    }

@router.post("/cambiar-password-inicial")
def cambiar_password_inicial(
    datos: CambiarPasswordInicialRequest,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    usuario = obtener_usuario_actual(token, db)

    if not usuario.primer_login:
        raise HTTPException(
            status_code=400,
            detail="El cambio inicial ya fue realizado"
        )

    usuario.hashed_password = get_password_hash(
        datos.password_nueva
    )

    usuario.primer_login = False

    db.commit()
    db.refresh(usuario)

    return {
        "mensaje": "Contraseña actualizada correctamente"
    }

@router.put("/profesores/{profesor_id}")
def editar_profesor(
    profesor_id: int,
    datos: ProfesorUpdate,
    db: Session = Depends(get_db)
):
    
    profesor = (
        db.query(Socio)
        .filter(Socio.id == profesor_id, Socio.rol == Rol.Profesor.value)
        .first()
    )

    if not profesor:
        raise HTTPException(
            status_code=404,
            detail="Profesor no encontrado"
        )    
    
    errores = {}

    dni_existente = (
        db.query(Socio)
        .filter(
            Socio.dni == datos.dni,
            Socio.id != profesor_id,
            Socio.rol == Rol.Profesor.value
        )
        .first()
    )

    if dni_existente:
        errores["dni"] = "Ya existe un profesor con ese DNI"
    
    if not datos.dni.isdigit() or len(datos.dni) not in [7, 8]:
        errores["dni"] = "El DNI debe tener 7 u 8 dígitos"
    
    email_regex = r"^[^@]+@[^@]+\.[^@]+$"

    email_existente = (
        db.query(Socio)
        .filter(
            Socio.email == datos.email,
            Socio.id != profesor_id,
            Socio.rol == Rol.Profesor.value
        )
        .first()
    )

    if email_existente:
        errores["email"] = "Ya existe un profesor con ese email"
    
    if not re.match(email_regex, datos.email):
        errores["email"] = "Ingresá un correo válido."
    
    if not datos.nombre.strip():
        errores["nombre"] = "El nombre es obligatorio"

    if not datos.apellido.strip():
        errores["apellido"] = "El apellido es obligatorio"

    if not datos.telefono.isdigit() or len(datos.telefono) != 10:
        errores["telefono"] = "El teléfono debe tener 10 dígitos"

    if errores:
        raise HTTPException(
            status_code=400,
            detail=errores
        )
    
    profesor.nombre = datos.nombre
    profesor.apellido = datos.apellido
    profesor.dni = datos.dni
    profesor.email = datos.email
    profesor.telefono = datos.telefono

    db.commit()
    db.refresh(profesor)

    return {
        "mensaje": "Profesor actualizado correctamente"
    }    

@router.delete("/profesores/{profesor_id}")
async def eliminar_profesor(
    profesor_id: int,
    db: Session = Depends(get_db)
):
    from models.clase import Clase
    
    clases = db.query(Clase).filter(
        Clase.profesor_id == profesor_id
    ).all()

    reemplazos = db.query(CambioProfesorTemporal).filter(
        CambioProfesorTemporal.profesor_reemplazo_id == profesor_id
    ).all()


    profesor = db.query(Socio).filter(
        Socio.id == profesor_id
    ).first()


    if not clases and not reemplazos:
        db.query(Socio).filter(
            Socio.id == profesor_id
        ).delete()

        db.commit()

        return {
            "mensaje": "Profesor eliminado correctamente"
        }
    
    
    clases_info = [
        {
            "tipo": "Titular",
            "actividad": c.actividad.value,
            "dia": c.dia.value,
            "horario": c.horario.strftime("%H:%M")
        }
        for c in clases
    ]


    reemplazos_info = []

    for r in reemplazos:
        clase = db.query(Clase).filter(
            Clase.id == r.clase_id
        ).first()

        if clase:
            reemplazos_info.append({
                "tipo": "Reemplazo temporal",
                "actividad": clase.actividad.value,
                "dia": clase.dia.value,
                "horario": clase.horario.strftime("%H:%M"),
                "fecha": r.fecha.strftime("%d/%m/%Y")
            })


    raise HTTPException(
        status_code=409,
        detail={
            "nombre": f"{profesor.nombre} {profesor.apellido}",
            "clases": clases_info,
            "reemplazos": reemplazos_info
        }
    )
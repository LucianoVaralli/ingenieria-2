from models.socio import Socio
from models.password_recovery import PasswordRecovery

from services.auth import get_password_hash

import random

from datetime import datetime, timedelta


# ---------------------------------------------------
# RATE LIMITING TEMPORAL
# ---------------------------------------------------
request_limits = {}


# ---------------------------------------------------
# ENVIAR CÓDIGO
# ---------------------------------------------------
async def send_recovery_code(email: str, db):

    # -----------------------------------------------
    # RATE LIMIT
    # -----------------------------------------------
    ultima_request = request_limits.get(email)

    if ultima_request:

        # Esperar 1 minuto entre requests
        if datetime.now() < ultima_request + timedelta(minutes=1):

            return {
                "success": False,
                "message": "Debes esperar 1 minuto antes de solicitar otro código"
            }

    # Guardar timestamp actual
    request_limits[email] = datetime.now()

    # -----------------------------------------------
    # Buscar usuario
    # -----------------------------------------------
    usuario = db.query(Socio).filter(
        Socio.email == email
    ).first()

    # Validar existencia
    if not usuario:

        return {
            "success": False,
            "message": "El email no está registrado"
        }

    # -----------------------------------------------
    # Generar código aleatorio
    # -----------------------------------------------
    codigo = str(
        random.randint(100000, 999999)
    )

    # Expira en 2 minutos
    expires_at = datetime.now() + timedelta(minutes=2)

    # -----------------------------------------------
    # Crear recovery en DB
    # -----------------------------------------------
    new_recovery = PasswordRecovery(
        email=email,
        code=codigo,
        expires_at=expires_at,
        used=False
    )

    # Guardar en DB
    db.add(new_recovery)

    db.commit()

    # Simular envío
    print(f"Código {codigo} enviado a {email}")

    return {
        "success": True,
        "message": "Código enviado correctamente"
    }


# ---------------------------------------------------
# VALIDAR CÓDIGO
# ---------------------------------------------------
async def validate_recovery_code(
    email: str,
    code: str,
    db
):

    # Buscar recovery
    recovery = db.query(
        PasswordRecovery
    ).filter(
        PasswordRecovery.email == email,
        PasswordRecovery.code == code,
        PasswordRecovery.used == False
    ).first()

    # Validar existencia
    if not recovery:

        return {
            "success": False,
            "message": "Código inválido"
        }

    # Validar expiración
    if datetime.now() > recovery.expires_at:

        # Marcar como usado
        recovery.used = True

        db.commit()

        return {
            "success": False,
            "message": "El código expiró"
        }

    return {
        "success": True,
        "message": "Código válido"
    }


# ---------------------------------------------------
# CAMBIAR PASSWORD
# ---------------------------------------------------
async def change_password(
    email: str,
    code: str,
    new_password: str,
    db
):

    # Reutilizar validación
    validation = await validate_recovery_code(
        email,
        code,
        db
    )

    # Si falla
    if not validation["success"]:

        return validation

    # Buscar recovery
    recovery = db.query(
        PasswordRecovery
    ).filter(
        PasswordRecovery.email == email,
        PasswordRecovery.code == code,
        PasswordRecovery.used == False
    ).first()

    # Buscar usuario
    usuario = db.query(Socio).filter(
        Socio.email == email
    ).first()

    # Validar usuario
    if not usuario:

        return {
            "success": False,
            "message": "Usuario no encontrado"
        }

    # Hashear nueva password
    hashed_password = get_password_hash(
        new_password
    )

    # Actualizar password
    usuario.hashed_password = hashed_password

    # Marcar código como usado
    recovery.used = True

    try:

        # Guardar cambios
        db.commit()

    except Exception:

        db.rollback()

        return {
            "success": False,
            "message": "Error al actualizar contraseña"
        }

    return {
        "success": True,
        "message": "Contraseña actualizada correctamente"
    }
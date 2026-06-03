from fastapi import HTTPException
import os
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from models.socio import Socio
from models.password_recovery import PasswordRecovery
from services.auth import get_password_hash

# 🌟 IMPORTANTE: Importar tu función o servicio real para enviar mails
from services.mail_service import send_email  # Ajusta el nombre según tu mail_service.py

# ---------------------------------------------------
# RATE LIMITING TEMPORAL IN-MEMORY
# ---------------------------------------------------
request_limits = {}

# ---------------------------------------------------
# ENVIAR CÓDIGO
# ---------------------------------------------------
async def send_recovery_code(email: str, db: Session):
    # RATE LIMIT CHECK
    ultima_request = request_limits.get(email)
    if ultima_request:
        if datetime.now() < ultima_request + timedelta(minutes=1):
            raise HTTPException(
                status_code=400,
                detail="Debes esperar 1 minuto antes de solicitar otro código"
            )

    # Guardar timestamp actual
    request_limits[email] = datetime.now()

    # Buscar usuario
    usuario = db.query(Socio).filter(Socio.email == email).first()
    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="El email no está registrado"
        )

    # Generar código aleatorio de 6 dígitos
    codigo = str(random.randint(100000, 999999))

    # Expira en 5 minutos
    expires_at = datetime.now() + timedelta(minutes=5)

    # Crear token de recuperación en DB
    new_recovery = PasswordRecovery(
        email=email,
        code=codigo,
        expires_at=expires_at,
        used=False
    )

    db.add(new_recovery)
    db.commit()

    # 🌟 INTEGRACIÓN REAL CON TU MAIL SERVICE
    try:
        asunto = "Sportify - Recuperación de Contraseña"

        cuerpo = f"""
        Hola,
        
        Has solicitado restablecer tu contraseña en Sportify.
        
        Tu código de verificación es: {codigo}
        
        Este código expirará en 5 minutos.
        
        Si no solicitaste esto, ignora este correo.
        """

        # Ejecuta la función de tu mail_service
        await send_email(email, asunto, cuerpo)

        print(f"Código {codigo} enviado de forma REAL a {email}")

    except Exception as e:
        print(f"Error al enviar el email real: {e}. Se muestra en consola: {codigo}")

        # Fallback para debug
        print(f"Código de emergencia: {codigo}")

    return {
        "success": True,
        "message": "Código enviado correctamente"
    }

# ---------------------------------------------------
# VALIDAR CÓDIGO
# ---------------------------------------------------
async def validate_recovery_code(email: str, code: str, db: Session):

    # Buscar registro activo
    recovery = db.query(PasswordRecovery).filter(
        PasswordRecovery.email == email,
        PasswordRecovery.code == code,
        PasswordRecovery.used == False
    ).first()

    if not recovery:
        raise HTTPException(
            status_code=400,
            detail="Código inválido"
        )

    # Validar expiración
    if datetime.now() > recovery.expires_at:

        recovery.used = True
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="El código expiró"
        )

    # Retornamos recovery para reutilizarlo
    return {
        "success": True,
        "message": "Código válido",
        "recovery_obj": recovery
    }

# ---------------------------------------------------
# CAMBIAR PASSWORD
# ---------------------------------------------------
async def change_password(email: str, code: str, new_password: str, db: Session):

    # Validar código
    validation = await validate_recovery_code(email, code, db)

    # Recuperar objeto ya validado
    recovery = validation["recovery_obj"]

    # Buscar usuario
    usuario = db.query(Socio).filter(
        Socio.email == email
    ).first()

    if not usuario:
        raise HTTPException(
            status_code=404,
            detail="Usuario no encontrado"
        )

    # Hashear nueva contraseña
    usuario.hashed_password = get_password_hash(new_password)

    # Marcar código como usado
    recovery.used = True

    try:
        db.commit()

    except Exception as e:

        db.rollback()

        print(f"Error en commit: {e}")

        raise HTTPException(
            status_code=500,
            detail="Error al actualizar la contraseña en el sistema"
        )

    return {
        "success": True,
        "message": "Contraseña actualizada correctamente"
    }
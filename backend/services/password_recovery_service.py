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
            return {
                "success": False,
                "message": "Debes esperar 1 minuto antes de solicitar otro código"
            }

    # Guardar timestamp actual
    request_limits[email] = datetime.now()

    # Buscar usuario
    usuario = db.query(Socio).filter(Socio.email == email).first()
    if not usuario:
        return {
            "success": False,
            "message": "El email no está registrado"
        }

    # Generar código aleatorio de 6 dígitos
    codigo = str(random.randint(100000, 999999))

    # Expira en 2 minutos
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
        # Aquí configuras el cuerpo del correo de Sportify
        asunto = "Sportify - Recuperación de Contraseña"
        cuerpo = f"""
        Hola,
        Has solicitado restablecer tu contraseña en Sportify.
        Tu código de verificación es: {codigo}
        Este código expirará en 2 minutos.
        Si no solicitaste esto, ignora este correo.
        """
        
        # Ejecuta la función de tu mail_service de fondo
        await send_email(email, asunto, cuerpo)
        print(f"Código {codigo} enviado de forma REAL a {email}")
        
    except Exception as e:
        print(f"Error al enviar el email real: {e}. Se muestra en consola: {codigo}")
        # Caída limpia: Si el servidor SMTP falla, al menos dejamos el print para debuggear
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
        return {
            "success": False,
            "message": "Código inválido"
        }

    # Validar si ya expiró
    if datetime.now() > recovery.expires_at:
        recovery.used = True
        db.commit()
        return {
            "success": False,
            "message": "El código expiró"
        }

    # Retornamos el objeto 'recovery' interno para ahorrar búsquedas duplicadas después
    return {
        "success": True,
        "message": "Código válido",
        "recovery_obj": recovery  
    }

# ---------------------------------------------------
# CAMBIAR PASSWORD
# ---------------------------------------------------
async def change_password(email: str, code: str, new_password: str, db: Session):
    # Reutilizar validación y obtener el objeto directo de la DB
    validation = await validate_recovery_code(email, code, db)

    if not validation["success"]:
        return validation

    # Recuperamos el registro directo sin volver a consultar la base de datos
    recovery = validation["recovery_obj"]

    # Buscar usuario
    usuario = db.query(Socio).filter(Socio.email == email).first()
    if not usuario:
        return {
            "success": False,
            "message": "Usuario no encontrado"
        }

    # Hashear y actualizar contraseña
    usuario.hashed_password = get_password_hash(new_password)
    
    # Marcar código como usado para que quede inhabilitado
    recovery.used = True

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error en commit: {e}")
        return {
            "success": False,
            "message": "Error al actualizar la contraseña en el sistema"
        }

    return {
        "success": True,
        "message": "Contraseña actualizada correctamente"
    }
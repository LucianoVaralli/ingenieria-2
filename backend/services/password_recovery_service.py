from models.socio import Socio
import random
# ---------------------------------------------------
# ENVIAR CÓDIGO DE RECUPERACIÓN
# ---------------------------------------------------
async def send_recovery_code(email: str, db):

    # Buscar usuario por email
    usuario = db.query(Socio).filter(
        Socio.email == email
    ).first()

    # Validar si existe
    if not usuario:

        return {
            "success": False,
            "message": "El email no está registrado"
        }

    # Generar código temporal
    # (por ahora fijo para pruebas)
    codigo = str(random.randint(100000, 999999))

    # Simular envío de mail
    print(f"Código {codigo} enviado a {email}")

    # Acá más adelante podrías:
    # - guardar código en DB
    # - guardar expiración
    # - enviar mail real

    return {
        "success": True,
        "message": "Código enviado correctamente"
    }


# ---------------------------------------------------
# VALIDAR CÓDIGO
# ---------------------------------------------------
async def validate_recovery_code(email: str, code: str):

    # Placeholder temporal

    # Más adelante:
    # - buscar código en DB
    # - validar expiración
    # - validar uso único

    if code == "123456":

        return {
            "success": True,
            "message": "Código válido"
        }

    return {
        "success": False,
        "message": "Código inválido"
    }


# ---------------------------------------------------
# CAMBIAR CONTRASEÑA
# ---------------------------------------------------
async def change_password(email: str, new_password: str, db):

    # Buscar usuario
    usuario = db.query(Socio).filter(
        Socio.email == email
    ).first()

    # Validar existencia
    if not usuario:

        return {
            "success": False,
            "message": "Usuario no encontrado"
        }

    # ---------------------------------------------------
    # IMPORTANTE:
    # Esto es TEMPORAL
    # Después deberías hashear password
    # ---------------------------------------------------

    usuario.hashed_password = new_password

    # Guardar cambios
    db.commit()

    return {
        "success": True,
        "message": "Contraseña actualizada"
    }
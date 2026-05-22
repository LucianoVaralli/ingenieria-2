# Funciones placeholder - implementa según tu lógica

async def send_recovery_code(email: str) -> dict:
    """Envía código de recuperación al email"""
    return {"mensaje": "Código enviado"}

async def validate_recovery_code(email: str, code: str) -> bool:
    """Valida el código de recuperación"""
    return True

async def change_password(email: str, new_password: str) -> dict:
    """Cambia la contraseña del usuario"""
    return {"mensaje": "Contraseña actualizada"}
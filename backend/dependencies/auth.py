from fastapi import Depends, HTTPException
from services.auth import obtener_usuario_actual
from models.enums import Rol
from models.socio import Socio

def verificar_admin(
    usuario_actual: Socio = Depends(obtener_usuario_actual)
):
    if usuario_actual.rol != Rol.Admin.value:
        raise HTTPException(
            status_code=403,
            detail="Solo administradores"
        )

    return usuario_actual
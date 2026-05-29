from fastapi_mail import FastMail, MessageSchema, ConnectionConfig

from models.socio import Socio
from models.clase import Clase
from models.reserva_MIO import Reserva

conf = ConnectionConfig(
    MAIL_USERNAME="ingenieriagrupo19@gmail.com",
    MAIL_PASSWORD="dpaf mvhx eypl kzpe",
    MAIL_FROM="ingenieriagrupo19@gmail.com",
    MAIL_PORT=587,
    MAIL_SERVER="smtp.gmail.com",
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True
)

async def send_email(email: str, asunto: str, cuerpo: str):
    mensaje = MessageSchema(
        subject=asunto,
        recipients=[email],
        body=cuerpo,
        subtype="plain"
    )
    fm = FastMail(conf)
    await fm.send_message(mensaje)

async def enviar_mail_pago_exitoso(socio: Socio, clase: Clase, reserva: Reserva):
    cuerpo = f"""
    Pago realizado correctamente.

    Actividad: {clase.actividad}
    Fecha: {reserva.fecha_clase}
    Horario: {clase.horario}

    Monto pagado: ${reserva.monto_pagado}

    Estado: {reserva.estado}
    """
    mensaje = MessageSchema(
        subject="Comprobante de reserva - Sportify",
        recipients=[socio.email],
        body=cuerpo,
        subtype="plain"
    )
    fm = FastMail(conf)
    await fm.send_message(mensaje)

async def enviar_mail_lista_espera(socio: Socio, clase: Clase, fecha_clase: str):
    cuerpo = f"""
    Usted ingresó correctamente a la lista de espera.

    Actividad: {clase.actividad}
    Fecha: {fecha_clase}
    Horario: {clase.horario}
    """
    mensaje = MessageSchema(
        subject="Lista de espera - Sportify",
        recipients=[socio.email],
        body=cuerpo,
        subtype="plain"
    )
    fm = FastMail(conf)
    await fm.send_message(mensaje)

async def enviar_mail_error_pago(socio: Socio):
    cuerpo = """
    El pago no pudo realizarse correctamente.
    """
    mensaje = MessageSchema(
        subject="Error en el pago - Sportify",
        recipients=[socio.email],
        body=cuerpo,
        subtype="plain"
    )
    fm = FastMail(conf)
    await fm.send_message(mensaje)
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from dotenv import load_dotenv
import os

from models.socio import Socio
from models.clase import Clase
from models.reserva_MIO import Reserva

load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),

    MAIL_PORT=int(os.getenv("MAIL_PORT")),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),

    MAIL_STARTTLS=os.getenv("MAIL_STARTTLS") == "True",
    MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS") == "True",

    USE_CREDENTIALS=os.getenv("USE_CREDENTIALS") == "True"
)


async def enviar_mail_pago_exitoso(
    socio: Socio,
    clase: Clase,
    reserva: Reserva
):

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


async def enviar_mail_lista_espera(
    socio: Socio,
    clase: Clase,
    fecha_clase: str
):

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


async def enviar_mail_error_pago(
    socio: Socio
):

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
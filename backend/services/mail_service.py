from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from dotenv import load_dotenv
import os

from models.socio import Socio
from models.clase import Clase
from models.reserva_MIO import Reserva

load_dotenv(dotenv_path=".env")

print("MAIL_USERNAME:", os.getenv("MAIL_USERNAME"))
print("MAIL_PASSWORD:", os.getenv("MAIL_PASSWORD"))
print("MAIL_SERVER:", os.getenv("MAIL_SERVER"))

load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", "tu_usuario@gmail.com"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", "tu_contraseña_de_app"),
    MAIL_FROM=os.getenv("MAIL_FROM", "tu_usuario@gmail.com"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=os.getenv("MAIL_STARTTLS", "True") == "True",
    MAIL_SSL_TLS=os.getenv("MAIL_SSL_TLS", "False") == "True",
    USE_CREDENTIALS=os.getenv("USE_CREDENTIALS", "True") == "True"
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


async def enviar_mail_membresia(
    socio: Socio,
    clase: Clase,
    fechas_confirmadas: list[str],
    fechas_lista_espera: list[str],
    monto_total: float
):

    texto_fechas_confirmadas = "\n".join(
        [f"• {fecha}" for fecha in fechas_confirmadas]
    )

    cuerpo = f"""
Pago realizado correctamente.

Tipo de reserva: Membresía mensual

Actividad: {clase.actividad}
Horario: {clase.horario}

Fechas reservadas:
{texto_fechas_confirmadas}

Monto pagado: ${monto_total}
"""

    if fechas_lista_espera:
        texto_lista_espera = "\n".join(
            [f"• {fecha}" for fecha in fechas_lista_espera]
        )

        cuerpo += f"""

Fechas ingresadas en lista de espera:
{texto_lista_espera}
"""

    mensaje = MessageSchema(
        subject="Comprobante de membresía - Sportify",
        recipients=[socio.email],
        body=cuerpo,
        subtype="plain"
    )

    fm = FastMail(conf)

    await fm.send_message(mensaje)

async def enviar_mail_profesor(profesor, password_temporal):
    asunto = "Bienvenido al sistema - Credenciales de acceso"

    cuerpo = f"""
Hola {profesor.nombre},

Se te ha creado una cuenta en el sistema.

📧 Email: {profesor.email}
🔐 Contraseña temporal: {password_temporal}

⚠️ Al iniciar sesión, deberás cambiar la contraseña obligatoriamente.

Saludos.
"""

    message = MessageSchema(
        subject=asunto,
        recipients=[profesor.email],
        body=cuerpo,
        subtype="plain"
    )

    fm = FastMail(conf)
    await fm.send_message(message)
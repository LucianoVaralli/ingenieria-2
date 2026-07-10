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
    actividad = clase.actividad.value
    horario = str(clase.horario)[:5]

    cuerpo = f"""
    Pago realizado correctamente.
    Actividad: {actividad}
    Fecha: {reserva.fecha_clase}
    Horario: {horario}

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
    actividad = clase.actividad.value
    horario = str(clase.horario)[:5]

    cuerpo = f"""
    Usted ingresó correctamente a la lista de espera.

    Actividad: {actividad}
    Fecha: {fecha_clase}
    Horario: {horario}
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
    
    actividad = clase.actividad.value
    horario = str(clase.horario)[:5]

    texto_fechas_confirmadas = "\n".join(
        [f"• {fecha}" for fecha in fechas_confirmadas]
    )

    cuerpo = f"""
Pago realizado correctamente.

Tipo de reserva: Membresía mensual

Actividad: {actividad}
Horario: {horario}

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
Hola {profesor.nombre} {profesor.apellido},

Se te ha creado una cuenta en el sistema.

📧 Email: {profesor.email}
🔐 Contraseña temporal: {password_temporal}

⚠️ Al iniciar sesión, deberás cambiar la contraseña obligatoriamente.

Saludos.
"""

    mensaje = MessageSchema(
        subject=asunto,
        recipients=[profesor.email],
        body=cuerpo,
        subtype="plain"
    )
    
    fm = FastMail(conf)

    await fm.send_message(mensaje)
    
    
async def enviar_mail_cupo_disponible(
    socio: Socio,
    clase: Clase,
    fecha_clase: str
):
    actividad = clase.actividad.value
    horario = str(clase.horario)[:5]

    """
    Notifica al socio que se liberó un cupo en una clase de la lista de espera.
    """
    cuerpo = f"""
Se liberó un cupo en la clase que solicitaste.

Actividad: {actividad}
Fecha: {fecha_clase}
Horario: {horario}

Para aceptar el cupo, ingresá a tu perfil en Sportify y apretá el botón "Aceptar cupo".
Tenés un tiempo limitado para confirmar tu lugar.
"""

    mensaje = MessageSchema(
        subject="¡Cupo disponible! - Sportify",
        recipients=[socio.email],
        body=cuerpo,
        subtype="plain"
    )

    fm = FastMail(conf)
    await fm.send_message(mensaje)


async def enviar_mail_nueva_clase(profesor, clase):
    asunto = "Nueva clase asignada"

    cuerpo = f"""
Hola {profesor.nombre} {profesor.apellido},

Se te asignó una nueva clase en el sistema.

🏋️ Actividad: {clase.actividad.value}
📅 Día: {clase.dia.value}
⏰ Horario: {clase.horario.strftime('%H:%M')}
⌛ Duración: {clase.duracion} minutos

Podés consultar tu agenda desde la sección "Mi Perfil", donde encontrarás tanto las clases del día como las próximas.

Saludos.
"""

    mensaje = MessageSchema(
        subject=asunto,
        recipients=[profesor.email],
        body=cuerpo,
        subtype="plain"
    )

    fm = FastMail(conf)
    await fm.send_message(mensaje)

async def enviar_mail_clase_eliminada(profesor, clase):
    asunto = "Clase eliminada"

    cuerpo = f"""
Hola {profesor.nombre} {profesor.apellido},

La siguiente clase fue eliminada:

🏋️ Actividad: {clase.actividad.value}
📅 Día: {clase.dia.value}
⏰ Horario: {clase.horario.strftime('%H:%M')}

No olvides que podes consultar tu agenda de clases en el "Mi Perfil", donde vas a encontrar tus clases del día y las próximas.

Si tenés dudas, comunicate con administración.

Saludos.
"""

    mensaje = MessageSchema(
        subject=asunto,
        recipients=[profesor.email],
        body=cuerpo,
        subtype="plain"
    )

    fm = FastMail(conf)
    await fm.send_message(mensaje)


async def enviar_mail_cambio_permanente(profesor, clase):
    asunto = "Cambio permanente de profesor"

    cuerpo = f"""
Hola {profesor.nombre} {profesor.apellido},

Te informamos que se te asignó de forma permanente la siguiente clase:

🏋️ Actividad: {clase.actividad.value}
📅 Día: {clase.dia.value}
⏰ Horario: {clase.horario.strftime('%H:%M')}

A partir de ahora, serás el profesor responsable de esta clase.

No olvides que podes consultar tu agenda de clases en el "Mi Perfil", donde vas a encontrar tus clases del día y las próximas.

Si tenés dudas, comunicate con administración.

Saludos.
"""

    mensaje = MessageSchema(
        subject=asunto,
        recipients=[profesor.email],
        body=cuerpo,
        subtype="plain"
    )

    fm = FastMail(conf)
    await fm.send_message(mensaje)


async def enviar_mail_cambio_temporal(profesor, clase, fecha):
    asunto = "Cambio temporal de profesor"

    cuerpo = f"""
Hola {profesor.nombre} {profesor.apellido},

Se te asignó de forma temporal la siguiente clase para el día {fecha.strftime("%d/%m/%Y")}:

🏋️ Actividad: {clase.actividad.value}
📅 Día habitual: {clase.dia.value}
⏰ Horario: {clase.horario.strftime("%H:%M")}

Ese día serás el profesor a cargo de la clase.

No olvides que podés consultar tu agenda desde "Mi Perfil", donde vas a encontrar tus clases del día y las próximas.

Si tenés alguna duda, comunicate con la administración.

Saludos.
"""

    mensaje = MessageSchema(
        subject=asunto,
        recipients=[profesor.email],
        body=cuerpo,
        subtype="plain"
    )

    fm = FastMail(conf)
    await fm.send_message(mensaje)


async def enviar_mail_cancelacion_individual(
    socio: Socio,
    clase: Clase,
    reserva: Reserva,
    monto_devolucion: float
):
    actividad = clase.actividad.value
    horario = str(clase.horario)[:5]

    cuerpo = f"""
Tu reserva fue cancelada correctamente.

Actividad: {actividad}
Fecha: {reserva.fecha_clase}
Horario: {horario}

Como la cancelación se realizó con la anticipación requerida, corresponde la devolución del importe abonado de ${monto_devolucion:.2f}.

Para gestionar la devolución del dinero, comunicate con el gimnasio.

Gracias por utilizar Sportify.
"""

    mensaje = MessageSchema(
        subject="Cancelación de reserva - Sportify",
        recipients=[socio.email],
        body=cuerpo,
        subtype="plain"
    )

    fm = FastMail(conf)
    await fm.send_message(mensaje)


async def enviar_mail_cancelacion_membresia(
    socio: Socio,
    clase: Clase,
    reserva: Reserva
):
    actividad = clase.actividad.value
    horario = str(clase.horario)[:5]

    cuerpo = f"""
Tu reserva fue cancelada correctamente.

Actividad: {actividad}
Fecha: {reserva.fecha_clase}
Horario: {horario}

Como la cancelación se realizó con 48 horas o más de anticipación, se acreditó 1 crédito para una clase individual en tu cuenta.

Podrás utilizar ese crédito en una futura reserva.

Gracias por utilizar Sportify.
"""

    mensaje = MessageSchema(
        subject="Cancelación de reserva - Sportify",
        recipients=[socio.email],
        body=cuerpo,
        subtype="plain"
    )

    fm = FastMail(conf)
    await fm.send_message(mensaje)

async def enviar_mail_cancelacion_sin_beneficio(
    socio: Socio,
    clase: Clase,
    reserva: Reserva
):
    actividad = clase.actividad.value
    horario = str(clase.horario)[:5]

    cuerpo = f"""
Tu reserva fue cancelada correctamente.

Actividad: {actividad}
Fecha: {reserva.fecha_clase}
Horario: {horario}

Como la cancelación no se realizó con la anticipación requerida, no corresponde la devolución del importe abonado ni la acreditación de un crédito.

Gracias por utilizar Sportify.
"""

    mensaje = MessageSchema(
        subject="Cancelación de reserva - Sportify",
        recipients=[socio.email],
        body=cuerpo,
        subtype="plain"
    )

    fm = FastMail(conf)
    await fm.send_message(mensaje)
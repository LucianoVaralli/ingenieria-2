from enum import Enum

class Rol(str, Enum):
    Admin = "admin"
    Profesor = "profesor"
    Miembro = "miembro"
    NoMiembro = "no_miembro"
    NoUsuario = "no_usuario"

class TipoActividad(str, Enum):
    Yoga = "yoga"
    Pilates = "pilates"
    Funcional = "funcional"

class DiaSemana(str, Enum):
    Lunes = "lunes"
    Martes = "martes"
    Miercoles = "miercoles"
    Jueves = "jueves"
    Viernes = "viernes"
    Sabado = "sabado"
    Domingo = "domingo"
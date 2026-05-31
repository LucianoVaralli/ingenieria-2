from models.clase import Clase
from models.gimnasio import Gimnasio
def sugerir_bloques_libres(db, dia, duracion_min):
    gimnasio = db.query(Gimnasio).first()

    clases = db.query(Clase).filter(
        Clase.activa == True,
        Clase.dia == dia.value if hasattr(dia, "value") else dia
    ).all()

    eventos = []

    # convertimos a minutos
    for c in clases:
        inicio = c.horario.hour * 60 + c.horario.minute
        fin = inicio + c.duracion

        eventos.append((inicio, "start"))
        eventos.append((fin, "end"))

    eventos.sort()

    ocupacion = 0
    ultimo = 6 * 60  # empezamos 06:00
    huecos = []

    for tiempo, tipo in eventos:

        if ocupacion == 0:
            # hay hueco entre ultimo y tiempo
            if tiempo - ultimo >= duracion_min:
                huecos.append((ultimo, tiempo))

        if tipo == "start":
            ocupacion += 1
        else:
            ocupacion -= 1

        if ocupacion == 0:
            ultimo = tiempo

    # hueco final del día
    if (22 * 60) - ultimo >= duracion_min:
        huecos.append((ultimo, 22 * 60))

    # formatear salida
    return [
        {
            "desde": f"{h//60:02d}:{h%60:02d}",
            "hasta": f"{f//60:02d}:{f%60:02d}"
        }
        for h, f in huecos
    ]

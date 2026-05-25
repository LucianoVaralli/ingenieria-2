from pydantic import BaseModel


class ReservaIndividualCreate(BaseModel):

    clase_id: int

    # fecha concreta
    fecha_clase: str


class ConfirmarPagoIndividual(BaseModel):

    reserva_id: int

    numero_tarjeta: str

    acepta_lista_espera: bool = False
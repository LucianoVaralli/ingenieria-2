from pydantic import BaseModel


class ReservaIndividualCreate(BaseModel):

    clase_id: int

    # fecha concreta
    fecha_clase: str
    tipo_pago: str 


class ConfirmarPagoIndividual(BaseModel):

    reserva_id: int
    numero_tarjeta: str
    titular: str
    cvv: str
    fecha_vencimiento: str
    acepta_lista_espera: bool = False
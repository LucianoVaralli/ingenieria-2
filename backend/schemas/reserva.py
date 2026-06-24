from pydantic import BaseModel


class ReservaIndividualCreate(BaseModel):
    clase_id: int
    fecha_clase: str
    tipo_pago: str


class ConfirmarPagoIndividual(BaseModel):
    reserva_id: int
    numero_tarjeta: str
    titular: str
    cvv: str
    fecha_vencimiento: str
    acepta_lista_espera: bool = False
    usa_credito: bool = False


# NUEVO: para agregar a lista de espera individual sin pago
class ListaEsperaIndividualCreate(BaseModel):
    clase_id: int
    fecha_clase: str


# ──────────────────────────────────────────────────────────────


from pydantic import BaseModel


class ReservaMembresiaCreate(BaseModel):
    clase_id: int
    fechas_clase: list[str]
    total_clases_mes: int | None = None


class ConfirmarPagoMembresia(BaseModel):
    clase_id: int
    fechas_con_cupo: list[str]
    fechas_sin_cupo: list[str]   = []
    monto_total: float
    pago_exitoso: bool
    acepta_lista_espera: bool    = False
    numero_tarjeta: str | None   = None
    titular: str
    cvv: str
    fecha_vencimiento: str
    creditos_a_usar: int         = 0


# NUEVO: para agregar a lista de espera de membresía sin pago
class ListaEsperaMembresiaCreate(BaseModel):
    clase_id: int
    fechas_sin_cupo: list[str]

class RenovarMembresiaRequest(BaseModel):
    clase_ids: list[int]
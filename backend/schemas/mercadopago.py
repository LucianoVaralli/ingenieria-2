from pydantic import BaseModel


class PreferenciaIndividualRequest(BaseModel):
    reserva_id: int
    tipo_pago: str = "total"


class PreferenciaIndividualDirectaRequest(BaseModel):
    clase_id:    int
    fecha_clase: str  # "YYYY-MM-DD"
    tipo_pago:   str = "total"


class PreferenciaMembresiaRequest(BaseModel):
    clase_id:        int
    fechas_con_cupo: list[str]
    monto_total:     float
    creditos_a_usar: int = 0
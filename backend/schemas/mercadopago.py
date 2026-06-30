from pydantic import BaseModel
 
 
class PreferenciaIndividualRequest(BaseModel):
    reserva_id: int  # reserva ya creada con estado "pendiente_pago"
 
 
class PreferenciaMembresiaRequest(BaseModel):
    clase_id:        int
    fechas_con_cupo: list[str]
    monto_total:     float
    creditos_a_usar: int = 0
 
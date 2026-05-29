from pydantic import BaseModel

class ReservaMembresiaCreate(BaseModel):
    clase_id:     int
    fechas_clase: list[str] 
    total_clases_mes: int | None = None

class ConfirmarPagoMembresia(BaseModel):
    clase_id:           int
    fechas_con_cupo:    list[str]
    fechas_sin_cupo:    list[str]   = []
    monto_total:        float
    pago_exitoso:       bool
    acepta_lista_espera: bool       = False
    numero_tarjeta:      str | None   = None
    
class AgregarListaEspera(BaseModel):
    clase_id:       int
    fechas_sin_cupo: list[str] 
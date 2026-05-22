from pydantic import BaseModel

class ReservaMembresiaCreate(BaseModel):
    clase_id:     int
    fechas_clase: list[str]  

class ConfirmarPagoMembresia(BaseModel):
    reservas_ids:        list[int]
    fechas_sin_cupo:     list[str] = [] 
    acepta_lista_espera: bool   
    pago_exitoso:        bool  
    clase_id:            int | None = None
class AgregarListaEspera(BaseModel):
    clase_id:       int
    fechas_sin_cupo: list[str] 
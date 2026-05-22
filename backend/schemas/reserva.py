from pydantic import BaseModel

class ReservaMembresiaCreate(BaseModel):
    clase_id:     int
    fechas_clase: list[str]  # ej: ["2026-03-02", "2026-03-09", "2026-03-16"]

class ConfirmarPagoMembresia(BaseModel):
    reservas_ids:        list[int]
    fechas_sin_cupo:     list[str] = [] 
    acepta_lista_espera: bool   # True = confirmar espera, False = escenario 6
    pago_exitoso:        bool   # True = pago OK, False = escenario 4
    clase_id:            int | None = None
class AgregarListaEspera(BaseModel):
    clase_id:       int
    fechas_sin_cupo: list[str]  # solo las fechas que no tenían cupo
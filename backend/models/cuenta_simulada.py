# models/cuenta_simulada.py
from sqlalchemy import Column, Integer, String, Float, Boolean
from dependencies.database import Base
 
 
class CuentaSimulada(Base):
    __tablename__ = "cuentas_simuladas"
 
    id               = Column(Integer, primary_key=True, index=True)
    alias            = Column(String, unique=True)    # ej: "juan.perez.mp"
    cvu              = Column(String, unique=True)    # ej: "0000003100025698742085"
    titular          = Column(String)
    saldo            = Column(Float, default=0.0)
    conexion_exitosa = Column(Boolean, default=True)
 
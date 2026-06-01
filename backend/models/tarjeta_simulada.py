from sqlalchemy import Column, Integer, String, Float, Boolean

from database import Base


class TarjetaSimulada(Base):
    __tablename__ = "tarjetas_simuladas"

    id = Column(Integer, primary_key=True, index=True)

    # Número que el usuario ingresa en el frontend/swagger
    numero = Column(String, unique=True, nullable=False)

    # NUEVO
    titular = Column(String, nullable=False)

    # NUEVO
    cvv = Column(String, nullable=False)

    fecha_vencimiento = Column(String, nullable=False)  # 12/28

    # credito o debito
    tipo = Column(String, nullable=False)

    # saldo disponible para simular el pago
    saldo = Column(Float, default=0)

    # simula caída del banco
    conexion_exitosa = Column(Boolean, default=True)
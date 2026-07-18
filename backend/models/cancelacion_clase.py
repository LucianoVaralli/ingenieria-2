from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from datetime import datetime
from database import Base


class CancelacionClaseDia(Base):
    __tablename__ = "cancelaciones_clase_dia"

    id = Column(Integer, primary_key=True, index=True)

    clase_id = Column(
        Integer,
        ForeignKey("clases.id"),
        nullable=False
    )

    fecha_clase = Column(
        Date,
        nullable=False
    )

    motivo = Column(
        String,
        nullable=False
    )

    fecha_cancelacion = Column(
        DateTime,
        default=datetime.now
    )
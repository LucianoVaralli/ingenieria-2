from sqlalchemy import Column, Integer, String, Boolean, DateTime
from dependencies.database import Base


class PasswordRecovery(Base):

    __tablename__ = "password_recovery"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String, nullable=False)

    code = Column(String, nullable=False)

    expires_at = Column(DateTime, nullable=False)

    used = Column(Boolean, default=False)
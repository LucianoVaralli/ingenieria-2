from pydantic import BaseModel, EmailStr, Field

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ValidateCodeRequest(BaseModel):
    email: EmailStr
    code: str  # 💡 Le sacamos las restricciones para manejar el error en español

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    password: str
    confirmar_password: str
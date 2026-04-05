from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from enum import Enum
from models import EstadoCita

class MotivoPrimaria(str, Enum):
    analiticas = "Revisión de analíticas"
    general = "Consulta general"
    medicacion = "Renovación de medicación"

class SolicitudCita(BaseModel):
    especialidad: str
    id_volante: Optional[str] = None
    motivo: Optional[MotivoPrimaria] = None
    lista_espera: bool = False

class PacienteCreate(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., pattern=r"^(?:\+34|0034)?[6789]\d{8}$")
    dni: str = Field(..., pattern=r"^\d{8}[A-Za-z]$")
    birth_date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    tarjeta_sanitaria: str = Field(..., pattern=r"^[A-Z]{2} \d{10}$")
    password: str = Field(..., min_length=8)
    preferencias_horarias: dict

    @field_validator('password')
    @classmethod
    def validar_password(cls, v):
        if not any(c.islower() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra minúscula")
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra mayúscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe contener al menos un número")
        if not any(c in "!@#$%^&*()-_=+[]{}|;:'\",.<>?/" for c in v):
            raise ValueError("La contraseña debe contener al menos un carácter especial")
        return v

    @field_validator('dni')
    @classmethod
    def validar_letra_dni(cls, v):
        letras = "TRWAGMYFPDXBNJZSQVHLCKE"
        numero = int(v[:-1])
        letra_esperada = letras[numero % 23]
        if v[-1].upper() != letra_esperada:
            raise ValueError('La letra del DNI no es correcta')
        return v.upper()

class PacienteUpdate(BaseModel):
    phone: Optional[str] = Field(None, pattern=r"^(?:\+34|0034)?[6789]\d{8}$")
    preferencias_horarias: Optional[dict]
    password: Optional[str] = Field(None, min_length=8)

    @field_validator('password')
    @classmethod
    def validar_password(cls, v):
        if not any(c.islower() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra minúscula")
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra mayúscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe contener al menos un número")
        if not any(c in "!@#$%^&*()-_=+[]{}|;:'\",.<>?/" for c in v):
            raise ValueError("La contraseña debe contener al menos un carácter especial")
        return v


class DoctorCreate(BaseModel):
    email: str
    name: str
    password: str
    phone: str
    duracion_cita: int
    especialidad: str
    consulta: Optional[str] = None

class AdminCreate(BaseModel):
    email: str
    name: str
    password: str
    phone: str
    

class UrgenciaVolante(str, Enum):
    BAJA = "Volante - Derivación Baja"
    MEDIA = "Volante - Derivación Media"
    ALTA = "Volante - Derivación Alta"

class VolanteCreate(BaseModel):
    especialidad_destino: str
    motivo: UrgenciaVolante
    observaciones: Optional[str] = None

class DoctorUpdate(BaseModel):
    duracion_cita: int
    phone: Optional[str] = Field(None, pattern=r"^(?:\+34|0034)?[6789]\d{8}$")
    password: Optional[str] = Field(None, min_length=8)

    @field_validator('password')
    @classmethod
    def validar_password(cls, v):
        if not any(c.islower() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra minúscula")
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra mayúscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe contener al menos un número")
        if not any(c in "!@#$%^&*()-_=+[]{}|;:'\",.<>?/" for c in v):
            raise ValueError("La contraseña debe contener al menos un carácter especial")
        return v

class EstadoCitaUpdate(BaseModel):
    estado: EstadoCita

class DecisionAdelanto(BaseModel):
    decision: str

class EspecialidadCreate(BaseModel):
    name: str

class AdminPacienteUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, pattern=r"^(?:\+34|0034)?[6789]\d{8}$")
    dni: Optional[str] = Field(None, pattern=r"^\d{8}[A-Za-z]$")
    birth_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    tarjeta_sanitaria: Optional[str] = Field(None, pattern=r"^[A-Z]{2} \d{10}$")
    password: Optional[str] = Field(None, min_length=8)


    @field_validator('password')
    @classmethod
    def validar_password(cls, v):
        if not any(c.islower() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra minúscula")
        if not any(c.isupper() for c in v):
            raise ValueError("La contraseña debe contener al menos una letra mayúscula")
        if not any(c.isdigit() for c in v):
            raise ValueError("La contraseña debe contener al menos un número")
        if not any(c in "!@#$%^&*()-_=+[]{}|;:'\",.<>?/" for c in v):
            raise ValueError("La contraseña debe contener al menos un carácter especial")
        return v

    @field_validator('dni')
    @classmethod
    def validar_letra_dni(cls, v):
        letras = "TRWAGMYFPDXBNJZSQVHLCKE"
        numero = int(v[:-1])
        letra_esperada = letras[numero % 23]
        if v[-1].upper() != letra_esperada:
            raise ValueError('La letra del DNI no es correcta')
        return v.upper()

class AdminDoctorUpdate(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    password: Optional[str] = None
    phone: Optional[str] = None
    duracion_cita: Optional[int] = None
    consulta: Optional[str] = None

from pydantic import BaseModel
from typing import Optional
from enum import Enum

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
    email: str
    name: str
    password: str
    phone: str
    dni: str
    birth_date: str
    tarjeta_sanitaria: str
    preferencias_horarias: dict

class DoctorCreate(BaseModel):
    email: str
    name: str
    password: str
    phone: str
    duracion_cita: int
    especialidad: str

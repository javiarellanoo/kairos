from pydantic import BaseModel
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
    consulta: Optional[str] = None

class UrgenciaVolante(str, Enum):
    BAJA = "Volante - Derivación Baja"
    MEDIA = "Volante - Derivación Media"
    ALTA = "Volante - Derivación Alta"

class VolanteCreate(BaseModel):
    especialidad_destino: str
    motivo: UrgenciaVolante
    observaciones: Optional[str] = None

class DuracionCitaUpdate(BaseModel):
    duracion_cita: int

class EstadoCitaUpdate(BaseModel):
    estado: EstadoCita

class DecisionAdelanto(BaseModel):
    decision: str
    

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

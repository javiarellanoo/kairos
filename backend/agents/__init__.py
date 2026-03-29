# Use explicit relative imports to ensure package resolution works when imported via backend.agents
from .patient_agent import PatientAgent
from .doctor_agent import DoctorAgent
from .gestor_lista_espera_agente import GestorListaEsperaAgente

__all__ = ["PatientAgent", "DoctorAgent", "GestorListaEsperaAgente"]
# Use explicit relative imports to ensure package resolution works when imported via backend.agents
from .patient_agent import PatientAgent
from .doctor_agent import DoctorAgent

__all__ = ["PatientAgent", "DoctorAgent"]
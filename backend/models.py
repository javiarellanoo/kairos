import os
import uuid
from enum import Enum
from pathlib import Path

from cryptography.fernet import Fernet
from dotenv import load_dotenv
from sqlalchemy import Column, Enum as SQLEnum, String, Date, Integer, Float, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import declarative_base, relationship, validates
from sqlalchemy_utils import StringEncryptedType
from sqlalchemy_utils.types.encrypted.encrypted_type import FernetEngine
import hashlib

load_dotenv()

_KEY_PATH = Path(__file__).resolve().parent.parent / ".encryption.key"


def _get_encryption_key() -> str:
    env_key = os.getenv("ENCRYPTION_KEY")
    if env_key:
        return env_key.strip()

    if _KEY_PATH.exists():
        return _KEY_PATH.read_text(encoding="utf-8").strip()

    generated = Fernet.generate_key().decode()
    _KEY_PATH.write_text(generated, encoding="utf-8")
    return generated


ENCRYPTION_KEY = _get_encryption_key()

def hash_searchable_field(value: str) -> str:
    if value is None:
        return None
    # Usamos HMAC-like logic o un salt con la clave de encriptación para evitar diccionarios/rainbow tables
    return hashlib.sha256((value + ENCRYPTION_KEY).encode("utf-8")).hexdigest()

Base = declarative_base()

class Especialidad(Base):
    __tablename__ = "especialidades"
    name = Column(String, primary_key=True, index=True)

class EstadoCita(str, Enum):
    LISTA_ESPERA = "lista_espera"
    CONFIRMADA = "confirmada"
    CANCELADA = "cancelada"
    NO_ASISTIDA = "no_asistida"

class EstadoVolante(str, Enum):
    PENDIENTE = "pendiente"
    CONSUMIDO = "consumido"
    CADUCADO = "caducado"

class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    password = Column(String, nullable=False)
    phone = Column(StringEncryptedType(String, ENCRYPTION_KEY, FernetEngine), nullable=False)
    
    rol = Column(String, nullable=False) 

    __mapper_args__ = {
        "polymorphic_identity": "usuario",
        "polymorphic_on": rol, 
    }


class Paciente(Usuario):
    __tablename__ = "pacientes"
    
    id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), primary_key=True)
    
    dni = Column(StringEncryptedType(String, ENCRYPTION_KEY, FernetEngine), nullable=False)
    dni_hash = Column(String, unique=True, index=True, nullable=False)
    
    birth_date = Column(Date, nullable=False)
    
    tarjeta_sanitaria = Column(StringEncryptedType(String, ENCRYPTION_KEY, FernetEngine))
    tarjeta_sanitaria_hash = Column(String, unique=True, index=True)
    
    medico_de_cabecera_id = Column(UUID(as_uuid=True), ForeignKey("doctores.id"))
    preferencias_horarias = Column(JSONB)

    @validates('dni')
    def validate_dni(self, key, dni):
        if dni is not None:
            self.dni_hash = hash_searchable_field(dni)
        return dni

    @validates('tarjeta_sanitaria')
    def validate_tarjeta(self, key, tarjeta_sanitaria):
        if tarjeta_sanitaria is not None:
            self.tarjeta_sanitaria_hash = hash_searchable_field(tarjeta_sanitaria)
        return tarjeta_sanitaria

    __mapper_args__ = {
        "polymorphic_identity": "paciente", 
    }

class Doctor(Usuario):
    __tablename__ = "doctores"
    
    id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), primary_key=True)
    
    duracion_cita = Column(Integer, default=15)
    especialidad = Column(String, ForeignKey("especialidades.name"))
    consulta = Column(String, nullable=True)
    agenda = Column(JSONB)

    __mapper_args__ = {
        "polymorphic_identity": "doctor",
    }

class Administrador(Usuario):
    __tablename__ = "administradores"
    email = Column(String, ForeignKey("usuarios.email"), primary_key=True)

    __mapper_args__ = {
        "polymorphic_identity": "admin",
    }

class Volante(Base):
    __tablename__ = "volantes"
    id = Column(UUID(as_uuid=True), primary_key=True)
    paciente_id = Column(UUID(as_uuid=True), ForeignKey("pacientes.id"), nullable=False)
    medico_emisor_id = Column(UUID(as_uuid=True), ForeignKey("doctores.id"), nullable=False)
    especialidad_destino = Column(String, ForeignKey("especialidades.name"), nullable=False)
    prioridad_peso = Column(Float, nullable=False)
    motivo_texto = Column(String)
    estado = Column(SQLEnum(EstadoVolante), default=EstadoVolante.PENDIENTE)
    observaciones = Column(String)
    fecha_emision = Column(Date)

class Cita(Base):
    __tablename__ = "citas"
    id = Column(Integer, primary_key=True, autoincrement=True) 
    paciente_id = Column(UUID(as_uuid=True), ForeignKey("pacientes.id"), nullable=False)
    medico_id = Column(UUID(as_uuid=True), ForeignKey("doctores.id"), nullable=False)
    fecha_hora = Column(String, nullable=False)
    especialidad = Column(String, ForeignKey("especialidades.name"), nullable=False)
    motivo = Column(String)
    prioridad_peso = Column(Float)
    id_volante = Column(UUID(as_uuid=True), ForeignKey("volantes.id"), nullable=True) 
    estado = Column(SQLEnum(EstadoCita), default=EstadoCita.LISTA_ESPERA)
import json
import uuid
from datetime import datetime
from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session
from security import get_password_hash

from database import SessionLocal, engine
from models import (
    Base,
    Especialidad,
    Paciente,
    Doctor,
    Volante,
    Cita,
    EstadoVolante,
    EstadoCita,
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Asegurar que las tablas existen
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

def load_data():
    db: Session = SessionLocal()
    
    print("🧹 Limpiando base de datos...")
    db.query(Cita).delete()
    db.query(Volante).delete()
    db.query(Doctor).delete()
    db.query(Paciente).delete()
    db.query(Especialidad).delete()
    db.commit()

    print("🚀 Iniciando Seed...")

    # 1. ESPECIALIDADES
    df_spec = pd.read_csv(DATA_DIR / 'specialties.csv')
    for _, row in df_spec.iterrows():
        db.add(Especialidad(name=row['name']))
    db.commit()
    print("✅ Especialidades cargadas.")

    # 2. PACIENTES
    paciente_id_by_dni = {}
    paciente_id_by_email = {}
    df_pat = pd.read_csv(DATA_DIR / 'patients.csv')
    for _, row in df_pat.iterrows():
        # Los CSV suelen tener comillas extra en el JSON, las limpiamos si es necesario
        prefs = json.loads(row['preferencias_horarias'].replace('""', '"')) if isinstance(row['preferencias_horarias'], str) else row['preferencias_horarias']
        pid = uuid.uuid4()
        db.add(Paciente(
            id=pid,
            dni=row['DNI'],
            name=row['name'],
            birth_date=datetime.strptime(row['birth_date'], '%Y-%m-%d').date(),
            email=row['email'],
            password=get_password_hash(row['password']),
            phone=str(row['phone']),
            tarjeta_sanitaria=row['tarjeta_sanitaria'],
            preferencias_horarias=prefs,
            rol="paciente",
        ))
        paciente_id_by_dni[row['DNI']] = pid
        paciente_id_by_email[row['email']] = pid
    db.commit()
    print("✅ Pacientes cargados.")

    # 3. DOCTORES
    doctor_id_by_email = {}
    df_doc = pd.read_csv(DATA_DIR / 'doctors.csv')
    for _, row in df_doc.iterrows():
        agenda_json = json.loads(row['agenda'].replace('""', '"')) if isinstance(row['agenda'], str) else row['agenda']
        did = uuid.uuid4()
        db.add(Doctor(
            id=did,
            email=row['email'],
            name=row['name'],
            password=get_password_hash(row['password']),
            phone=str(row['phone']),
            duracion_cita=int(row['duracion_cita']),
            especialidad=row['especialidad'],
            agenda=agenda_json,
            rol="doctor",
        ))
        doctor_id_by_email[row['email']] = did
    db.commit()
    print("✅ Doctores cargados.")

    # 4. VOLANTES
    df_vol = pd.read_csv(DATA_DIR / 'volantes.csv')
    for _, row in df_vol.iterrows():
        estado_val = row['estado']
        if isinstance(estado_val, str):
            estado_val = estado_val.strip().lower().replace(' ', '_')
            try:
                estado_val = EstadoVolante(estado_val)
            except ValueError:
                estado_val = EstadoVolante.PENDIENTE

        db.add(Volante(
            id=uuid.UUID(row['id']),
            paciente_id=paciente_id_by_email[row['paciente']],
            medico_emisor_id=doctor_id_by_email[row['medico_emisor']],
            especialidad_destino=row['especialidad_destino'],
            prioridad_peso=float(row['prioridad_peso']),
            motivo_texto=row['motivo_texto'],
            estado=estado_val,
            fecha_emision=datetime.strptime(row['emision'], '%Y-%m-%d').date()
        ))
    db.commit()
    print("✅ Volantes cargados.")

    # 5. CITAS
    df_cit = pd.read_csv(DATA_DIR / 'citas.csv')
    for _, row in df_cit.iterrows():
        id_volante_val = None
        if pd.notna(row['id_volante']) and row['id_volante'] != '':
            id_volante_val = uuid.UUID(row['id_volante'])

        estado_cita = row['estado']
        if isinstance(estado_cita, str):
            estado_cita_norm = estado_cita.strip().lower()
            estado_cita_norm = estado_cita_norm.replace('lista de espera', 'lista_espera')
            estado_cita_norm = estado_cita_norm.replace(' ', '_')
            try:
                estado_cita = EstadoCita(estado_cita_norm)
            except ValueError:
                estado_cita = EstadoCita.LISTA_ESPERA
            
        db.add(Cita(
                paciente_id=paciente_id_by_dni[row['paciente_dni']],
                medico_id=doctor_id_by_email[row['medico']],
            fecha_hora=row['fecha_hora'],
            especialidad=row['especialidad'],
            motivo=row['motivo'],
            prioridad_peso=float(row['prioridad_peso']) if pd.notna(row['prioridad_peso']) else 1.0,
            id_volante=id_volante_val,
            estado=estado_cita
        ))
    db.commit()
    print("✅ Citas cargadas.")

    db.close()
    print("🎉 SEED COMPLETADO CON ÉXITO.")

def drop_data():
    db: Session = SessionLocal()
    print("🧹 Limpiando base de datos...")
    db.query(Cita).delete()
    db.query(Volante).delete()
    db.query(Doctor).delete()
    db.query(Paciente).delete()
    db.query(Especialidad).delete()
    db.commit()
    db.close()
    print("✅ Base de datos limpiada.")

if __name__ == "__main__":
    drop_data()
    load_data()
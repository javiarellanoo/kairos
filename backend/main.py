import datetime
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI
from database import SessionLocal, engine, Base
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models import Cita, Paciente, Usuario, Volante, Doctor, Especialidad, hash_searchable_field
from security import get_password_hash, verify_password, create_access_token
from dependencies import get_current_user, get_is_admin, get_is_doctor, get_is_paciente, get_today, is_not_logged_in
from pydantic import BaseModel
from agents import PatientAgent, DoctorAgent
from schemas import SolicitudCita, MotivoPrimaria, PacienteCreate, DoctorCreate

medicos_activos = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Levantando el servidor y despertando agentes...")
    db = SessionLocal()
    try:
        doctores = db.query(Doctor).all()
        for doctor in doctores:
            jid_doctor = f"doctor_{doctor.email.split('@')[0].lower()}@localhost"
            agente_doctor = DoctorAgent(jid_doctor, "password123")
            await agente_doctor.start(auto_register=True)
            medicos_activos[jid_doctor] = agente_doctor
            print(f"Agente doctor {jid_doctor} iniciado al arrancar el servidor.")
    except Exception as e:
        print(f"Error al iniciar agentes de doctor: {e}")
    finally:
        db.close()
    yield

    for jid, agente in medicos_activos.items():
        await agente.stop()
        print(f"Agente doctor {jid} detenido al apagar el servidor.")
    print("Servidor apagado y agentes detenidos.")
Base.metadata.create_all(bind=engine)

app = FastAPI(title="API TFG - Sistema Multi-Agente Médico", lifespan=lifespan)

@app.get("/")
def read_root():
    return {"mensaje": "¡Backend de FastAPI funcionando correctamente!"}

@app.post("/api/signup")
def signup(usuario: PacienteCreate, db: Session = Depends(get_db), is_not_logged_in: bool = Depends(is_not_logged_in)):
    existing_user = db.query(Usuario).filter(Usuario.email == usuario.email).first()
    
    dni_hash = hash_searchable_field(usuario.dni)
    tarjeta_hash = hash_searchable_field(usuario.tarjeta_sanitaria) if usuario.tarjeta_sanitaria else None
    
    existing_dni = db.query(Paciente).filter(Paciente.dni_hash == dni_hash).first()
    existing_tarjeta = db.query(Paciente).filter(Paciente.tarjeta_sanitaria_hash == tarjeta_hash).first() if tarjeta_hash else None
    
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    if existing_dni:
        raise HTTPException(status_code=400, detail="El DNI ya está registrado")
    if existing_tarjeta:
        raise HTTPException(status_code=400, detail="La tarjeta sanitaria ya está registrada")

    hashed_password = get_password_hash(usuario.password)
    new_user = Paciente(email=usuario.email, 
                        password=hashed_password, 
                        rol="paciente",
                        name=usuario.name,
                        phone=usuario.phone,
                        dni=usuario.dni,
                        birth_date=usuario.birth_date,
                        tarjeta_sanitaria=usuario.tarjeta_sanitaria,
                        preferencias_horarias=usuario.preferencias_horarias
                        )
    
    es_menor_de_edad = (get_today() - datetime.datetime.strptime(usuario.birth_date, "%Y-%m-%d").date()).days < 18 * 365
    if es_menor_de_edad:
        medicos_cabecera = db.query(Doctor).filter(Doctor.especialidad == "Pediatría").all()
    else:
        medicos_cabecera = db.query(Doctor).filter(Doctor.especialidad == "Medicina General").all()
    if not medicos_cabecera:
        raise HTTPException(status_code=400, detail="No hay médicos de cabecera disponibles para asignar.")
    
    medico_con_menos_pacientes = min(medicos_cabecera, key=lambda doc: db.query(Paciente).filter(Paciente.medico_de_cabecera_id == doc.id).count())
    new_user.medico_de_cabecera_id = medico_con_menos_pacientes.id

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    token_data = {
        "sub": new_user.email, 
        "rol": new_user.rol,
        "nombre": new_user.name
    }
    access_token = create_access_token(data=token_data)
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "rol": new_user.rol
    }

@app.post("/api/signup-doctor")
def signup_doctor(doctor: DoctorCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_is_admin)):
    existing_user = db.query(Usuario).filter(Usuario.email == doctor.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    hashed_password = get_password_hash(doctor.password)
    especialidad = db.query(Especialidad).filter(Especialidad.name == doctor.especialidad).first()
    if not especialidad:
        raise HTTPException(status_code=400, detail="La especialidad no es válida")
    
    new_user = Doctor(email=doctor.email,
                      password=hashed_password,
                      rol="doctor",
                      name=doctor.name,
                      phone=doctor.phone,
                      duracion_cita=doctor.duracion_cita,
                      especialidad=doctor.especialidad,
                      agenda ={})
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    token_data = {
        "sub": new_user.email, 
        "rol": new_user.rol,
        "nombre": new_user.name
    }
    access_token = create_access_token(data=token_data)
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "rol": new_user.rol
    }

@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db), is_not_logged_in: bool = Depends(is_not_logged_in)):
    
    usuario = db.query(Usuario).filter(Usuario.email == form_data.username).first()
    
    if not usuario or not verify_password(form_data.password, usuario.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token_data = {
        "sub": usuario.email, 
        "rol": usuario.rol,
        "nombre": usuario.name
    }
    access_token = create_access_token(data=token_data)
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "rol": usuario.rol
    }

@app.post("/api/nueva-cita")
async def nueva_cita(solicitud: SolicitudCita, db: Session = Depends(get_db), current_user: Usuario = Depends(get_is_paciente)):
    
    ESPECIALIDADES_PRIMARIAS = ["Medicina General", "Pediatría"]
    motivo_final = ""
    medicos_jids = []
    if not current_user.medico_de_cabecera_id and solicitud.especialidad in ESPECIALIDADES_PRIMARIAS:
        raise HTTPException(status_code=400, detail="Para solicitar una cita en especialidades primarias, debes tener un médico de cabecera asignado.")
    
    if solicitud.especialidad:
        especialidad_valida = db.query(Especialidad).filter(Especialidad.name == solicitud.especialidad).first()
        if not especialidad_valida:
            raise HTTPException(status_code=400, detail="La especialidad solicitada no es válida.")

    if solicitud.especialidad in ESPECIALIDADES_PRIMARIAS:
        if solicitud.id_volante:
            raise HTTPException(status_code=400, detail="No se requiere volante para especialidades primarias.")
        motivo_final = solicitud.motivo.value if solicitud.motivo else "Consulta general"
        medico = db.query(Doctor).filter(Doctor.id == db.query(Paciente).filter(Paciente.id == current_user.id).first().medico_de_cabecera_id).first()
        medicos_jids.append(f"doctor_{medico.email.split('@')[0].lower()}@localhost")

    if solicitud.especialidad not in ESPECIALIDADES_PRIMARIAS and solicitud.id_volante is None:
        raise HTTPException(status_code=400, detail="Para especialidades no primarias, se requiere un volante médico.")

    prioridad_subasta = 1.0
    if solicitud.id_volante:
        volante = db.query(Volante).filter(Volante.id == solicitud.id_volante, Volante.paciente_id == current_user.id).first()

        if not volante:
            raise HTTPException(status_code=404, detail="Volante no encontrado")

        if volante:
            if volante.especialidad_destino != solicitud.especialidad:
                raise HTTPException(status_code=400, detail="El volante proporcionado no corresponde a la especialidad solicitada.")
            
            if volante.estado != "pendiente":
                raise HTTPException(status_code=400, detail=f"El volante proporcionado ya ha sido procesado o está caducado")
            
            prioridad_subasta = volante.prioridad_peso
            motivo_final = volante.motivo_texto or motivo_final
            medicos_especialidad = db.query(Doctor).filter(Doctor.especialidad == solicitud.especialidad).all()
            for medico in medicos_especialidad:
                medicos_jids.append(f"doctor_{medico.email.split('@')[0].lower()}@localhost")
        
    jid_paciente = f"patient_{current_user.email.split('@')[0].lower()}@localhost"
    agente_paciente = PatientAgent(jid_paciente, "password123")
    preferencias_horarias = db.query(Paciente).filter(Paciente.id == current_user.id).first().preferencias_horarias
    agente_paciente.datos_busqueda = {
        "especialidad": solicitud.especialidad,
        "paciente_id": str(current_user.id),
        "preferencias_horarias": preferencias_horarias,
        "prioridad_subasta": prioridad_subasta,
        "lista_espera": solicitud.lista_espera,
        "medicos_jids": medicos_jids

    }

    try:
        await agente_paciente.start(auto_register=True)
        print(f"Agente paciente {jid_paciente} iniciado para nueva cita.")
        resultado_cita = await agente_paciente.resultado_cita

    finally:
        await agente_paciente.stop()
        print(f"Agente paciente {jid_paciente} detenido después de procesar la cita.")
    
    if resultado_cita:
        if solicitud.id_volante:
            volante.estado = "consumido"
        medico_id = db.query(Doctor).filter(Doctor.email.like(f"{resultado_cita['doctor_id']}@%")).first().id if resultado_cita["doctor_id"] else None
        nueva_cita = Cita(
            paciente_id=current_user.id,
            medico_id=medico_id,
            fecha_hora=resultado_cita["fecha_hora"],
            especialidad=solicitud.especialidad,
            motivo=motivo_final,
            prioridad_peso=prioridad_subasta,
            id_volante=solicitud.id_volante,
            estado=resultado_cita["estado"]

        )
        

        db.add(nueva_cita)
        db.commit()
        db.refresh(nueva_cita)
        return nueva_cita
    else:
        raise HTTPException(status_code=404, detail="No se pudo encontrar una cita disponible para los criterios proporcionados.")
    

@app.patch("/api/cancelar-cita/{cita_id}")
def cancelar_cita(cita_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_is_paciente)):
    cita = db.query(Cita).filter(Cita.id == cita_id).first()
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    if cita.paciente_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para cancelar esta cita")
    
    cita.estado = "cancelada"
    db.commit()
    return {"mensaje": "Cita cancelada exitosamente"}

@app.get("/api/mis-citas")
def mis_citas(db: Session = Depends(get_db), current_user: Usuario = Depends(get_is_paciente)):
    citas = db.query(Cita).filter(Cita.paciente_id == current_user.id).all()
    return citas

@app.get("/api/agenda-doctor")
async def agenda_doctor(db: Session = Depends(get_db), current_user: Usuario = Depends(get_is_doctor)):
    doctor = db.query(Doctor).filter(Doctor.email.like(f"{current_user.email}%")).first()
    citas = db.query(Cita).filter(Cita.medico_id == doctor.id, Cita.estado != "cancelada").all()
    return citas;

@app.get("/api/agenda-hoy")
async def agenda_hoy(db: Session = Depends(get_db), current_user: Usuario = Depends(get_is_doctor)):
    doctor = db.query(Doctor).filter(Doctor.email.like(f"{current_user.email}%")).first()
    hoy = get_today()

    hoy_str = hoy.isoformat()
    
    citas_hoy = db.query(Cita).filter(
        Cita.medico_id == doctor.id,
        Cita.fecha_hora.startswith(hoy_str),
        Cita.estado != "cancelada"
    ).all()
    
    return citas_hoy


    
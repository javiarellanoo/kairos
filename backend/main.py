import datetime
from typing import Optional, Dict, List
from contextlib import asynccontextmanager
from fastapi import FastAPI
from database import SessionLocal, engine, Base
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models import Cita, Paciente, Usuario, Volante, Doctor, Especialidad, hash_searchable_field, EstadoVolante
from security import get_password_hash, verify_password, create_access_token
from dependencies import get_current_user, get_is_admin, get_is_doctor, get_is_paciente, get_today, is_not_logged_in
from pydantic import BaseModel
from agents import PatientAgent, DoctorAgent, GestorListaEsperaAgente
from schemas import DecisionAdelanto, PacienteUpdate, SolicitudCita, MotivoPrimaria, PacienteCreate, DoctorCreate, VolanteCreate, UrgenciaVolante, DoctorUpdate, EstadoCitaUpdate
from spade.message import Message
import json
from spade.agent import Agent
from spade.behaviour import OneShotBehaviour
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta

medicos_activos = {}
PESOS_VOLANTES = {
        UrgenciaVolante.BAJA: 1.0,
        UrgenciaVolante.MEDIA: 2.0,
        UrgenciaVolante.ALTA: 3.0
    }

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
        jid_gestor_lista_espera = "gestor_lista_espera@localhost"
        agente_gestor_lista_espera = GestorListaEsperaAgente(jid_gestor_lista_espera, "password123")
        await agente_gestor_lista_espera.start(auto_register=True)
        medicos_activos[jid_gestor_lista_espera] = agente_gestor_lista_espera
        print(f"Agente gestor de lista de espera {jid_gestor_lista_espera} iniciado al arrancar el servidor.")
    except Exception as e:
        print(f"Error al iniciar agentes de doctor: {e}")
    finally:
        db.close()
    yield

    for jid, agente in medicos_activos.items():
        await agente.stop()
        print(f"Agente {jid} detenido al apagar el servidor.")
    print("Servidor apagado y agentes detenidos.")
Base.metadata.create_all(bind=engine)

app = FastAPI(title="API TFG - Sistema Multi-Agente Médico", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"mensaje": "¡Backend de FastAPI funcionando correctamente!"}

async def enviar_mensaje_xmpp(msg: Message):
    class EnviarMensajeBehaviour(OneShotBehaviour):
        def __init__(self, mensaje_a_enviar):
            super().__init__()
            self.mensaje = mensaje_a_enviar
        async def run(self):
            await self.send(self.mensaje)
            print(f"[Cartero] Mensaje entregado a {self.mensaje.to}")
    cartero = Agent("fastapi_sender@localhost", "password123", verify_security=False)
    await cartero.start()

    b = EnviarMensajeBehaviour(msg)
    cartero.add_behaviour(b)
    await b.join()
    await cartero.stop()

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
                      consulta=doctor.consulta,
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

        try:
            msg_confirmacion = Message(to= f"doctor_{resultado_cita['doctor_id']}@localhost")
            msg_confirmacion.set_metadata("performative", "inform")
            msg_confirmacion.set_metadata("ontology", "confirmacion_db")
            msg_confirmacion.body = json.dumps({"fecha_hora": resultado_cita["fecha_hora"]})
            await enviar_mensaje_xmpp(msg_confirmacion)
        except Exception as e:
            print(f"Error al enviar mensaje de confirmación al agente doctor: {e}")
            
        return nueva_cita
    else:
        raise HTTPException(status_code=404, detail="No se pudo encontrar una cita disponible para los criterios proporcionados.")
    

@app.patch("/api/cancelar-cita/{cita_id}")
async def cancelar_cita(cita_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_is_paciente)):
    cita = db.query(Cita).filter(Cita.id == cita_id).first()
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    if cita.paciente_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para cancelar esta cita")
    
    cita.estado = "cancelada"
    if cita.id_volante:
        volante = db.query(Volante).filter(Volante.id == cita.id_volante).first()
        if volante and volante.estado == "consumido":
            volante.estado = "pendiente"
    db.commit()

    try:
        fecha_hora = cita.fecha_hora
        msg_al_gestor = Message(to="gestor_lista_espera@localhost")
        msg_al_gestor.body = json.dumps({
            "doctor_id": str(cita.medico_id),
            "fecha_hora": fecha_hora})
        
        await enviar_mensaje_xmpp(msg_al_gestor)
        print (f"Disparador de reasignación enviado al gestor de lista de espera para la cita cancelada con ID {cita_id}.")
    
    except Exception as e:
        print(f"Error al notificar al gestor de lista de espera sobre la cancelación de la cita: {e}")
        
    return {"mensaje": "Cita cancelada exitosamente"}

@app.post("/api/adelantar-cita/{cita_id}")
async def adelantar_cita(cita_id: int, decision: DecisionAdelanto, db: Session = Depends(get_db), current_user: Usuario = Depends(get_is_paciente)):
    decision_str = decision.decision.lower()
    if decision_str not in ["aceptar", "rechazar"]:
        raise HTTPException(status_code=400, detail="La decisión debe ser 'aceptar' o 'rechazar'.")
    
    cita = db.query(Cita).filter(Cita.id == cita_id).first()

    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    if cita.paciente_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para tomar esta decisión sobre la cita")
    if cita.estado != "pendiente_aceptacion":
        raise HTTPException(status_code=400, detail="Esta cita no está pendiente de aceptación para adelanto.")
    
    try:
        email_paciente = current_user.email.split("@")[0].lower()
        jid_paciente = f"patient_{email_paciente}@localhost"
        msg_al_agente = Message(to=jid_paciente)
        msg_al_agente.body = json.dumps({"decision": decision_str})

        await enviar_mensaje_xmpp(msg_al_agente)

    except Exception as e:
        print(f"Error al enviar la decisión de adelanto al agente paciente: {e}")
        raise HTTPException(status_code=500, detail="Error al procesar tu decisión. Por favor, inténtalo de nuevo.")
    
    return {"mensaje": f"Has {'aceptado' if decision_str == 'aceptar' else 'rechazado'} el adelanto de tu cita."}

@app.get("/api/citas/adelantos")
def obtener_citas_adelantos(db: Session = Depends(get_db), current_user: Usuario = Depends(get_is_paciente)):
    citas_adelantos = db.query(Cita).filter(Cita.paciente_id == current_user.id, Cita.estado == "pendiente_aceptacion").all()
    return citas_adelantos


@app.get("/api/mis-citas")
def mis_citas(db: Session = Depends(get_db), current_user: Usuario = Depends(get_is_paciente)):
    citas = db.query(Cita).filter(Cita.paciente_id == current_user.id, Cita.estado != "cancelada", Cita.estado != "pendiente_aceptacion").all()
    info_citas = []
    for cita in citas:
        medico = db.query(Doctor).filter(Doctor.id == cita.medico_id).first()
        info_citas.append({
            "id": cita.id,
            "fecha_hora": cita.fecha_hora,
            "especialidad": cita.especialidad,
            "motivo": cita.motivo,
            "estado": cita.estado,
            "medico": medico.name,
            "consulta": medico.consulta
        })
    return info_citas

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

    turnos_hoy = doctor.agenda.get(hoy_str, [])
    total_citas_dia = 0
    for turno in turnos_hoy:
        inicio_str, fin_str = turno.split("-")
        hora_actual = datetime.datetime.strptime(f"{hoy_str} {inicio_str}", "%Y-%m-%d %H:%M")
        hora_fin = datetime.datetime.strptime(f"{hoy_str} {fin_str}", "%Y-%m-%d %H:%M")

        duracion = doctor.duracion_cita
        while hora_actual + timedelta(minutes=duracion) <= hora_fin:
          total_citas_dia += 1
          hora_actual += timedelta(minutes=duracion)

    info_citas_hoy = []
    for cita in citas_hoy:
        paciente = db.query(Paciente).filter(Paciente.id == cita.paciente_id).first()
        hora = datetime.datetime.strptime(cita.fecha_hora, "%Y-%m-%d %H:%M").strftime("%H:%M")
        estado_medico = cita.estado
        if cita.estado == "lista_espera":
            estado_medico = "confirmada"
        elif cita.estado == "pendiente_aceptacion":
            estado_medico = "buscando"
        info_citas_hoy.append({
            "id": cita.id,
            "hora": hora,
            "especialidad": cita.especialidad,
            "motivo": cita.motivo,
            "estado": estado_medico,
            "paciente": paciente.name,
            "total_citas_dia": total_citas_dia
        })
    
    return info_citas_hoy

@app.get("/api/pacientes/me")
def get_current_patient_info(current_user: Usuario = Depends(get_is_paciente), db: Session = Depends(get_db)):
    return {
        "email": current_user.email,
        "name": current_user.name,
        "phone": current_user.phone,
        "dni": current_user.dni,
        "birth_date": current_user.birth_date,
        "tarjeta_sanitaria": current_user.tarjeta_sanitaria,
        "preferencias_horarias": current_user.preferencias_horarias
    }

@app.put("/api/pacientes/me")
def update_current_patient_info(updated_info: PacienteUpdate, current_user: Usuario = Depends(get_is_paciente), db: Session = Depends(get_db)):
    paciente = db.query(Paciente).filter(Paciente.id == current_user.id).first()

    update_data = updated_info.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        if key == "password":
            paciente.password = get_password_hash(value)
        else:
            setattr(paciente, key, value)
    db.commit()
    db.refresh(paciente)

    return {
        "email": paciente.email,
        "name": paciente.name,
        "phone": paciente.phone,
        "dni": paciente.dni,
        "birth_date": paciente.birth_date,
        "tarjeta_sanitaria": paciente.tarjeta_sanitaria,
        "preferencias_horarias": paciente.preferencias_horarias
    }

@app.get("/api/citas/proximas")
def obtener_citas_proximas(db: Session = Depends(get_db), current_user: Usuario = Depends(get_is_paciente)):
    hoy = get_today()
    citas_proximas = db.query(Cita).filter(
        Cita.paciente_id == current_user.id,
        Cita.fecha_hora >= hoy.isoformat(),
        Cita.estado != "cancelada"
    ).order_by(Cita.fecha_hora).all()
    info_citas = []
    for cita in citas_proximas:
        medico = db.query(Doctor).filter(Doctor.id == cita.medico_id).first()
        info_citas.append({
            "id": cita.id,
            "fecha_hora": cita.fecha_hora,
            "especialidad": cita.especialidad,
            "motivo": cita.motivo,
            "estado": cita.estado,
            "medico": medico.name,
            "consulta": medico.consulta
        })
    return info_citas[:3]

@app.post("/api/volantes/{cita_id}")
def crear_volante(cita_id: int, volante_info: VolanteCreate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_is_doctor)):
    cita = db.query(Cita).filter(Cita.id == cita_id).first()
    medico = db.query(Doctor).filter(Doctor.id == current_user.id).first()
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    if cita.medico_id != medico.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para crear un volante para esta cita")

    if medico.especialidad not in ["Medicina General", "Pediatría"] and volante_info.especialidad_destino != medico.especialidad:
        raise HTTPException(status_code=400, detail="Solo puedes crear volantes para tu misma especialidad.")
    
    if volante_info.especialidad_destino in ["Medicina General", "Pediatría"]:
        raise HTTPException(status_code=400, detail="No se pueden crear volantes para especialidades primarias.")
    
    fecha_cita = datetime.datetime.strptime(cita.fecha_hora, "%Y-%m-%dT%H:%M:%S").date()
    if get_today() != fecha_cita:
        raise HTTPException(status_code=400, detail="No puedes crear volantes para citas de días futuros o pasados.")
    
    nuevo_volante = Volante(
        paciente_id=cita.paciente_id,
        medico_emisor_id=current_user.id,
        especialidad_destino=volante_info.especialidad_destino,
        motivo_texto=volante_info.motivo.value,
        prioridad_peso=PESOS_VOLANTES[volante_info.motivo],
        observaciones=volante_info.observaciones,
        estado=EstadoVolante.PENDIENTE,
        fecha_emision=get_today()
    )
    db.add(nuevo_volante)
    db.commit()
    db.refresh(nuevo_volante)
    
    return nuevo_volante

@app.get("/api/doctors/me/ultimo-dia-agenda")
def obtener_ultimo_dia_agenda(db: Session = Depends(get_db), current_user: Usuario = Depends(get_is_doctor)):
    doctor = db.query(Doctor).filter(Doctor.id == current_user.id).first()
    agenda = doctor.agenda or {}
    if not agenda:
        raise HTTPException(status_code=404, detail="No hay días en la agenda")
    ultimo_dia = max(agenda.keys())
    print(f"Último día en la agenda del doctor {current_user.email}: {ultimo_dia}")
    return {"ultimo_dia": ultimo_dia}

@app.patch("/api/doctors/me/agenda")
def actualizar_agenda_doctor(agenda: Dict[str, List[str]], db: Session = Depends(get_db), current_user: Usuario = Depends(get_is_doctor)):
    doctor = db.query(Doctor).filter(Doctor.id == current_user.id).first()
    if not agenda: 
        raise HTTPException(status_code=400, detail="La agenda no puede estar vacía")
    today_str = get_today().isoformat()

    agenda_actual = doctor.agenda or {}
    agenda_activa = {fecha: horas for fecha, horas in agenda_actual.items() if fecha >= today_str}

    fechas_futuras_en_agenda = sorted(agenda_activa.keys())
    ultima_fecha_activa = fechas_futuras_en_agenda[-1] if fechas_futuras_en_agenda else None

    fechas_nuevas = sorted(agenda.keys())
    primera_fecha_nueva = fechas_nuevas[0]

    try:
        for date_str in fechas_nuevas:
            datetime.date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido. Usa YYYY-MM-DD.")
    
    if primera_fecha_nueva < today_str:
        raise HTTPException(status_code=400, detail="No se pueden agregar fechas pasadas a la agenda.")
    
    if ultima_fecha_activa and primera_fecha_nueva <= ultima_fecha_activa:
        raise HTTPException(status_code=400, detail="La nueva agenda debe comenzar después de la última fecha activa actual.")
    
    agenda_activa.update(agenda)
    doctor.agenda = agenda_activa

    db.commit()
    db.refresh(doctor)

    return {"mensaje": "Agenda actualizada exitosamente", "agenda": doctor.agenda}

@app.get("/api/doctors/me")
def obtener_info_doctor(db: Session = Depends(get_db), current_user: Usuario = Depends(get_is_doctor)):
    doctor = db.query(Doctor).filter(Doctor.id == current_user.id).first()
    return {
        "email": doctor.email,
        "name": doctor.name,
        "phone": doctor.phone,
        "especialidad": doctor.especialidad,
        "consulta": doctor.consulta,
        "duracion_cita": doctor.duracion_cita
    }

@app.put("/api/doctors/me")
def actualizar_info_doctor(updated_info: DoctorUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_is_doctor)):
    doctor = db.query(Doctor).filter(Doctor.id == current_user.id).first()
    if updated_info.duracion_cita <= 0:
        raise HTTPException(status_code=400, detail="La duración de la cita debe ser un número positivo.")
    update_data = updated_info.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "password":
            doctor.password = get_password_hash(value)
        else:
            setattr(doctor, key, value)
    db.commit()
    db.refresh(doctor)
    return {"mensaje": "Duración de cita actualizada exitosamente", "duracion_cita": doctor.duracion_cita}

@app.patch("/api/doctors/citas/{cita_id}")
def actualizar_estado_cita(cita_id: int, nuevo_estado: EstadoCitaUpdate, db: Session = Depends(get_db), current_user: Usuario = Depends(get_is_doctor)):
    cita = db.query(Cita).filter(Cita.id == cita_id).first()
    doctor = db.query(Doctor).filter(Doctor.id == current_user.id).first()
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    if cita.medico_id != doctor.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para actualizar esta cita")
    
    if cita.estado == "cancelada":
        raise HTTPException(status_code=400, detail="No se puede actualizar una cita cancelada")
    
    estados_validos = ["confirmada", "no_asistida"]
    if nuevo_estado.estado.value not in estados_validos:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Los estados válidos son: {', '.join(estados_validos)}")
    
    cita.estado = nuevo_estado.estado
    db.commit()
    db.refresh(cita)

    return {"mensaje": "Estado de la cita actualizado exitosamente", "cita": cita}

@app.get("/api/users/me")
def obtener_perfil_usuario(db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "nombre": current_user.name,
        "email": current_user.email,
        "rol": current_user.rol
    }
    
@app.get("/api/citas/{cita_id}")
def get_cita(cita_id: int, db: Session = Depends(get_db), current_user: Usuario = Depends(get_current_user)):
    cita = db.query(Cita).filter(Cita.id == cita_id).first()
    if not cita:
        raise HTTPException(status_code=404, detail="Cita no encontrada")
    if cita.paciente_id != current_user.id:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver esta cita")
    
    doctor = db.query(Doctor).filter(Doctor.id == cita.medico_id).first()
    info_cita = {
        "id": cita.id,
        "fecha_hora": cita.fecha_hora,
        "especialidad": cita.especialidad,
        "motivo": cita.motivo,
        "estado": cita.estado,
        "medico": doctor.name,
        "consulta": doctor.consulta
    }
    return info_cita

@app.get("/api/especialidades")
def get_especialidades(db: Session = Depends(get_db), current_user: Usuario = Depends(get_is_paciente)):
    es_mayor_de_edad = (get_today() - current_user.birth_date).days >= 18 * 365  
    especialidades = db.query(Especialidad).all()
    if not es_mayor_de_edad:
        especialidades = [esp for esp in especialidades if esp.name != "Medicina General"]
    else:
        especialidades = [esp for esp in especialidades if esp.name != "Pediatría"]

    return [{ "nombre": esp.name} for esp in especialidades]

@app.get("/api/volantes/especialidad/{especialidad}")
def get_volantes_por_especialidad(especialidad: str, db: Session = Depends(get_db), current_user: Usuario = Depends(get_is_paciente)):
    volantes = db.query(Volante).filter(Volante.paciente_id == current_user.id, Volante.estado == "pendiente", Volante.especialidad_destino == especialidad).all()
    return [{ "id": vol.id, "motivo": vol.motivo_texto } for vol in volantes]

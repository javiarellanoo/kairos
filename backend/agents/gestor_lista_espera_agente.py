import asyncio
import json
from datetime import datetime
from spade.agent import Agent
from spade.behaviour import CyclicBehaviour, OneShotBehaviour
from spade.message import Message
from sqlalchemy import asc, desc, or_
from agents import PatientAgent
from dependencies import get_today
from database import SessionLocal
from models import Cita, Doctor, Paciente
from emails import enviar_email_adelanto_async

dias_semana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes']

class GestorListaEsperaAgente(Agent):
    class DispatcherBehaviour(CyclicBehaviour):
        async def run(self):
            msg = await self.receive(timeout=5)
            if msg:
                print(f"Agente {self.agent.name} ha recibido un mensaje: {msg.body}")
                try:
                    datos = json.loads(msg.body)
                    negociador = self.agent.GestionarListaEsperaBehaviour(datos_hueco=datos)
                    self.agent.add_behaviour(negociador)
                
                except Exception as e:
                    print(f"Error al procesar el mensaje: {e}")

    class GestionarListaEsperaBehaviour(OneShotBehaviour):
        def __init__(self, datos_hueco):
            super().__init__()
            self.datos_hueco = datos_hueco
        async def run(self):
                try:
                    doctor_id = self.datos_hueco.get("doctor_id")
                    fecha_hora = self.datos_hueco.get("fecha_hora")
                    db_session = SessionLocal()

                    await self.iniciar_reasignacion(doctor_id, fecha_hora, db_session)
                
                except Exception as e:
                    print(f"Error al procesar el mensaje: {e}")
                finally:
                    db_session.close()
        
        async def iniciar_reasignacion(self, doctor_id, fecha_hora, db_session):
            doctor_cancelacion = db_session.query(Doctor).filter(Doctor.id == doctor_id).first()
            if not doctor_cancelacion:
                return
            
            especialidad_hueco = doctor_cancelacion.especialidad
            dia_cita = datetime.strptime(fecha_hora, "%Y-%m-%d %H:%M").date()
            dia_semana = dias_semana[dia_cita.weekday()]
            turno_cita = "M" if datetime.strptime(fecha_hora, "%Y-%m-%d %H:%M").hour < 14 else "T"
            preferencias_relevantes = {dia_semana: [turno_cita]}

            query_candidatos = db_session.query(Cita).join(Paciente, Cita.paciente_id == Paciente.id).filter(
                Cita.estado == "lista_espera",
                or_(Cita.fecha_hora.is_(None), Cita.fecha_hora > fecha_hora), Paciente.preferencias_horarias.contains(preferencias_relevantes))
            
            if especialidad_hueco in ["Medicina General", "Pediatría"]:
                query_candidatos = query_candidatos.filter(Cita.medico_id == doctor_id)
            
            else: 
                query_candidatos = query_candidatos.filter(Cita.especialidad == especialidad_hueco)
            
            candidatos = query_candidatos.order_by(
                Cita.fecha_hora.isnot(None).asc(),
                desc(Cita.prioridad_peso),
                asc(Cita.fecha_hora)
            ).with_for_update(skip_locked=True).all()

            if not candidatos:
                print("No hay pacientes en lista de espera para este hueco.")
                return
            
            print(f"Reasignando cita al paciente {candidatos[0].paciente_id} para el hueco del doctor {doctor_id} a las {fecha_hora}.")
            await self.negociar_con_candidatos(candidatos, doctor_id, fecha_hora, db_session)
            
        async def negociar_con_candidatos(self, candidatos, doctor_id, fecha_hora, db_session):
            hueco_asignado = False
            for candidato in candidatos:
                paciente_id = candidato.paciente_id
                hora_actual = datetime.now().time()
                hoy = get_today()
                fecha_hora_actual = datetime.combine(hoy, hora_actual)
                horas_hasta_cita = (datetime.strptime(fecha_hora, "%Y-%m-%d %H:%M") - fecha_hora_actual).total_seconds() / 3600

                if horas_hasta_cita > 48:
                    tiempo_espera = 86400
                elif horas_hasta_cita > 24:
                    tiempo_espera = 14400
                elif horas_hasta_cita < 3:
                    tiempo_espera = 1200
                else:
                    tiempo_espera = 3600
                
                paciente_email = db_session.query(Paciente).filter(Paciente.id == paciente_id).first().email
                jid_paciente = f"patient_{paciente_email.split('@')[0].lower()}@localhost"
                msg_propuesta = Message(to=jid_paciente)
                msg_propuesta.set_metadata("performative", "propose")
                msg_propuesta.set_metadata("ontology", "reasignacion_cita")
                contenido_propuesta = {
                    "doctor_id": str(doctor_id),
                    "cita_id": candidato.id,
                    "fecha_hora": fecha_hora,
                    "timeout": tiempo_espera,
                    "mensaje": f"Se ha liberado un hueco para {candidato.especialidad} el {fecha_hora}. ¿Desea aceptar esta cita?"
                }
                msg_propuesta.body = json.dumps(contenido_propuesta)

                agente_temporal = PatientAgent(jid_paciente, "password123")
                await agente_temporal.start()

                candidato.estado = "pendiente_aceptacion"
                candidato.fecha_hora_propuesta = fecha_hora
                db_session.commit()

                await self.send(msg_propuesta)
                await asyncio.create_task(enviar_email_adelanto_async(paciente_email, db_session.query(Paciente).filter(Paciente.id == paciente_id).first().name, fecha_hora, candidato.especialidad))
                
                respuesta = await self.receive(timeout=tiempo_espera)

                if respuesta:
                    performative = respuesta.get_metadata("performative")
                    if performative == "accept-proposal":
                        fecha_antigua = candidato.fecha_hora
                        print(f"Paciente {paciente_id} ha aceptado la propuesta. Asignando cita.")
                        candidato.estado = "confirmada"
                        candidato.medico_id = doctor_id
                        candidato.fecha_hora = fecha_hora
                        candidato.fecha_hora_propuesta = None
                        db_session.commit()

                        if fecha_antigua is not None:
                            msg_cascada = Message(to=str(self.agent.jid))
                            msg_cascada.body = json.dumps({
                                "doctor_id": doctor_id,
                                "fecha_hora": fecha_antigua
                            })
                            await self.send(msg_cascada)

                        hueco_asignado = True
                        break
                    elif performative == "reject-proposal":
                        print(f"Paciente {paciente_id} ha rechazado la propuesta.")
                        candidato.estado = "lista_espera"
                        candidato.fecha_hora_propuesta = None
                        db_session.commit()
                        continue
                else:
                    print(f"No se recibió respuesta del paciente {paciente_id} en el tiempo esperado.")
                    db_session.refresh(candidato)

                    if candidato.estado == "pendiente_aceptacion":
                        candidato.estado = "lista_espera"
                        candidato.fecha_hora_propuesta = None
                        db_session.commit()
                    continue
            if not hueco_asignado:
                print("No se pudo asignar el hueco a ningún paciente de la lista de espera.")


    async def setup(self):
        print(f"Agente {self.name} se ha iniciado.")
        b = self.DispatcherBehaviour()
        self.add_behaviour(b)
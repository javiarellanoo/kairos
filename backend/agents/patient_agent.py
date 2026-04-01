from spade.agent import Agent
from spade.behaviour import OneShotBehaviour
from spade.message import Message
import asyncio
import json
from database import SessionLocal
from models import Cita

class PatientAgent(Agent):
    def __init__(self, jid, password, verify_security=False):
        super().__init__(jid, password, verify_security=verify_security)
        self.datos_busqueda = {}
        self.resultado_cita = asyncio.Future()

    class BuscarCitaBehaviour(OneShotBehaviour):
        async def run(self):
            especialidad = self.agent.datos_busqueda.get("especialidad")
            preferencias_horarias = self.agent.datos_busqueda.get("preferencias_horarias")
            prioridad_subasta = self.agent.datos_busqueda.get("prioridad_subasta", 1.0)
            lista_espera = self.agent.datos_busqueda.get("lista_espera", False)

            medicos_jids = self.agent.datos_busqueda.get("medicos_jids", [])
            if not medicos_jids:
                print("No se proporcionaron médicos para la búsqueda de cita.")
                self.agent.resultado_cita.set_result(None)
                return
            
            contenido_cfp = {
                "prioridad": prioridad_subasta,
                "preferencias_horarias": preferencias_horarias,
            }

            for jid_medico in medicos_jids:
                msg = Message(to=jid_medico)
                msg.set_metadata("performative", "cfp")
                msg.set_metadata("ontology", "cita_medica")
                msg.body = json.dumps(contenido_cfp)
                await self.send(msg)
                print(f"CFP enviado a {jid_medico} con contenido: {contenido_cfp}")

            propuestas_recibidas = []
            tiempo_limite = 5
            tiempo_inicio = asyncio.get_event_loop().time()

            while (asyncio.get_event_loop().time() - tiempo_inicio) < tiempo_limite:
                response = await self.receive(timeout=1)

                if response:
                    performative = response.get_metadata("performative")
                    if performative == "propose":
                        datos_propuesta = json.loads(response.body)
                        propuestas_recibidas.append(
                            {
                                "medico_jid": str(response.sender),
                                "fecha_hora": datos_propuesta.get("fecha_hora"),
                                "puntuacion_afinidad": datos_propuesta["puntuacion_afinidad"]
                            })
                    elif performative == "refuse":
                        print(f"Propuesta rechazada por {response.sender}")
                
            if not propuestas_recibidas:
                print(f"No se recibieron propuestas de {jid_medico} dentro del tiempo límite.")
                medico_id = medicos_jids[0].split("@")[0].replace("doctor_", "")
                if lista_espera:
                    self.agent.resultado_cita.set_result({
                        "doctor_id": medico_id,
                        "fecha_hora": None,
                        "estado": "lista_espera"
                    })
                else:
                    self.agent.resultado_cita.set_result(None)
                return
                
            mejor_propuesta = max(propuestas_recibidas, key=lambda x: x["puntuacion_afinidad"])
            msg_aceptar = Message(to=mejor_propuesta["medico_jid"])
            msg_aceptar.set_metadata("performative", "accept-proposal")
            msg_aceptar.set_metadata("ontology", "cita_medica")
            msg_aceptar.body = json.dumps({"fecha_hora": mejor_propuesta["fecha_hora"]})
            await self.send(msg_aceptar)

            for prop in propuestas_recibidas:
                if prop != mejor_propuesta:
                    msg_rechazar = Message(to=prop["medico_jid"])
                    msg_rechazar.set_metadata("performative", "reject-proposal")
                    msg_rechazar.set_metadata("ontology", "cita_medica")
                    msg_rechazar.body = json.dumps({"hueco_rechazado": prop["fecha_hora"]})
                    await self.send(msg_rechazar)
            
            email_ganador = mejor_propuesta["medico_jid"].split("@")[0].replace("doctor_", "")
            self.agent.resultado_cita.set_result({
                "doctor_id": email_ganador,
                "fecha_hora": mejor_propuesta["fecha_hora"],
                "estado": "confirmada" if not lista_espera else "lista_espera"
            })
    
    class EscucharReasignacionBehaviour(OneShotBehaviour):
        async def run(self):
            msg_gestor = await self.receive(timeout=10)
            if msg_gestor and msg_gestor.get_metadata("ontology") == "reasignacion_cita":
                datos_reasignacion = json.loads(msg_gestor.body)
                timeout = datos_reasignacion.get("timeout", 3600)
                cita_id = datos_reasignacion.get("cita_id")
                nueva_fecha_hora = datos_reasignacion.get("fecha_hora")

                db_session = SessionLocal()
                try:
                    cita = db_session.query(Cita).filter(Cita.id == cita_id).first()
                    if cita:
                        estado_original = cita.estado
                        cita.estado = "pendiente_aceptacion"
                        cita.fecha_hora_propuesta = nueva_fecha_hora
                        db_session.commit()

                        msg_humano = await self.receive(timeout=timeout)
                        respuesta_al_gestor = Message(to=str(msg_gestor.sender))
                        respuesta_al_gestor.set_metadata("ontology", "reasignacion_cita")

                        if msg_humano:
                            decision = json.loads(msg_humano.body).get("decision")
                            if decision == "aceptar":
                                respuesta_al_gestor.set_metadata("performative", "accept-proposal")
                            else:
                                respuesta_al_gestor.set_metadata("performative", "reject-proposal")
                                cita.fecha_hora_propuesta = None
                                cita.estado = estado_original
                                db_session.commit()
                        else:
                            print("[PatientAgent] El humano ignoró la notificación en la web.")
                            respuesta_al_gestor.set_metadata("performative", "reject-proposal")
                            cita.estado = estado_original
                            db_session.commit()

                        await self.send(respuesta_al_gestor)
                except Exception as e:
                    print(f"[PatientAgent] Error en BBDD: {e}")
                    db_session.rollback()
                finally:
                    db_session.close()
                
            await self.agent.stop()


    async def setup(self):
        print(f"Setting up PatientAgent {self.jid}")
        self.add_behaviour(self.BuscarCitaBehaviour())
        self.add_behaviour(self.EscucharReasignacionBehaviour())
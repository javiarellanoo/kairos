from spade.agent import Agent
from spade.behaviour import OneShotBehaviour
from spade.message import Message
import asyncio
import json

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
                    if lista_espera:
                        self.agent.resultado_cita.set_result({
                            "doctor_id": None,
                            "fecha_hora": None,
                            "estado": "lista_espera"
                        })
                    else:
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
                        await self.send(msg_rechazar)
                
                email_ganador = mejor_propuesta["medico_jid"].split("@")[0].replace("doctor_", "")
                self.agent.resultado_cita.set_result({
                    "doctor_id": email_ganador,
                    "fecha_hora": mejor_propuesta["fecha_hora"],
                    "estado": "confirmada" if not lista_espera else "lista_espera"
                })

    async def setup(self):
        print(f"Setting up PatientAgent {self.jid}")
        self.add_behaviour(self.BuscarCitaBehaviour())
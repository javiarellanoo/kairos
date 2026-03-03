# Import Agent directly from spade.agent; spade does not export Agent at the top level
from spade.agent import Agent
from spade.behaviour import CyclicBehaviour
import json
from database import SessionLocal
from models import Doctor, Cita
from datetime import datetime, timedelta

DIA_SEMANA = ["lunes", "martes", "miércoles", "jueves", "viernes"]

class DoctorAgent(Agent):
        
    class AtenderPeticionesBehaviour(CyclicBehaviour):
        async def run(self):
            msg = await self.receive(timeout=10)

            if msg:
                performative = msg.get_metadata("performative")
                remitente = msg.sender.bare

                if performative == "cfp":
                    print(f"CFP recibido por {self.agent.jid} de {remitente} con contenido: {msg.body}")
                    datos_peticion = json.loads(msg.body)

                    db = SessionLocal()
                    try:
                        my_email = str(self.agent.jid)
                        my_email = my_email.split("@")[0].replace("doctor_", "")
                        doctor = db.query(Doctor).filter(Doctor.email.like(f"{my_email}@%")).first()

                        if not doctor or not doctor.agenda:
                            await self._enviar_rechazo(msg, "No tengo agenda configurada.")
                            return
                        
                        hueco_ofrecido = None
                        mejor_hueco = None
                        mejor_puntuacion = -1
                        preferencias_paciente = datos_peticion.get("preferencias_horarias", [])
                        manana = datetime.now().date() + timedelta(days=1)  

                        fechas_ordenadas = sorted(doctor.agenda.keys())

                        for fecha_str in fechas_ordenadas:
                            fecha = datetime.strptime(fecha_str, "%Y-%m-%d").date()
                            turnos = doctor.agenda[fecha_str]

                            if fecha < manana or not turnos:
                                continue

                            posibles_huecos = []
                            for turno in turnos:
                                inicio_str, fin_str = turno.split("-")
                                hora_actual = datetime.strptime(f"{fecha_str} {inicio_str}", "%Y-%m-%d %H:%M")
                                hora_fin = datetime.strptime(f"{fecha_str} {fin_str}", "%Y-%m-%d %H:%M")

                                duracion = doctor.duracion_cita
                                while hora_actual + timedelta(minutes=duracion) <= hora_fin:
                                    posibles_huecos.append(hora_actual.strftime("%Y-%m-%d %H:%M"))
                                    hora_actual += timedelta(minutes=duracion)
                            
                            citas_ocupadas = db.query(Cita).filter(
                                Cita.medico_id == doctor.id,
                                Cita.fecha_hora.in_(posibles_huecos), Cita.estado != "cancelada"
                            ).all()

                            huecos_ocupados = [c.fecha_hora for c in citas_ocupadas]
                            huecos_libres = [h for h in posibles_huecos if h not in huecos_ocupados]

                            for hueco in huecos_libres:
                                print(hueco)
                                dia_semana = DIA_SEMANA[datetime.strptime(hueco, "%Y-%m-%d %H:%M").weekday()]
                                es_manana = datetime.strptime(hueco, "%Y-%m-%d %H:%M").hour < 15
                                turno_hueco = "M" if es_manana else "T"

                                puntuacion_actual = 50
                                preferencias_dia = datos_peticion.get("preferencias_horarias", [])
                                if turno_hueco in preferencias_dia:
                                    puntuacion_actual = 100
                                
                                dias_distancia = (datetime.strptime(hueco, "%Y-%m-%d %H:%M").date() - manana).days
                                puntuacion_actual -= dias_distancia

                                if puntuacion_actual > mejor_puntuacion:
                                    mejor_puntuacion = puntuacion_actual
                                    mejor_hueco = hueco
                                
                                if mejor_puntuacion == 100:
                                    break
                            
                            
                            hueco_ofrecido = mejor_hueco
                                
                        if hueco_ofrecido:
                            respuesta = msg.make_reply()
                            respuesta.set_metadata("performative", "propose")
                            respuesta.body = json.dumps({"fecha_hora": hueco_ofrecido, "puntuacion_afinidad": mejor_puntuacion})
                            await self.send(respuesta)
                        else:
                            await self._enviar_rechazo(msg, "No tengo huecos disponibles en mi agenda.")
                    finally:
                        db.close()
                
                elif performative == "accept-proposal":
                    datos_aceptacion = json.loads(msg.body)
                    fecha_hora = datos_aceptacion.get("fecha_hora")
                    print(f"Propuesta aceptada por {remitente} para fecha y hora: {fecha_hora}")
                
                elif performative == "reject-proposal":
                    print(f"Propuesta rechazada por {remitente}")
                    pass
            
        async def _enviar_rechazo(self, msg, motivo):
            respuesta = msg.make_reply()
            respuesta.set_metadata("performative", "refuse")
            respuesta.body = json.dumps({"motivo": motivo})
            await self.send(respuesta)


    async def setup(self):
        print(f"Setting up DoctorAgent {self.jid}")
        self.add_behaviour(self.AtenderPeticionesBehaviour())
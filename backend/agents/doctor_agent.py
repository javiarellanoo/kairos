
from spade.agent import Agent
from sqlalchemy import or_
from spade.behaviour import CyclicBehaviour
import json
from dependencies import get_today
from database import SessionLocal
from models import Doctor, Cita
from datetime import datetime, timedelta
import time

DIA_SEMANA = ["lunes", "martes", "miercoles", "jueves", "viernes"]

def evaluar_preferencias(preferencias, dia_semana, turno):
    for prefs in preferencias.items():
        preferencias_dia = [p.replace("'", "").strip() for p in prefs[1]]
        if prefs[0] == dia_semana and turno in preferencias_dia:
            return True
    return False

class DoctorAgent(Agent):
    def __init__(self, jid, password, verify_security=False):
        super().__init__(jid, password, verify_security=verify_security)
        self.huecos_bloqueados = {}
        
    class AtenderPeticionesBehaviour(CyclicBehaviour):
        async def run(self):
            msg = await self.receive(timeout=10)

            if msg:
                performative = msg.get_metadata("performative")
                remitente = msg.sender.bare

                if performative == "cfp":
                    tiempo_actual = time.time()
                    self.huecos_bloqueados = {h: t for h, t in self.agent.huecos_bloqueados.items() if tiempo_actual - t < 10}
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
                        manana = get_today() + timedelta(days=1)  

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
                                
                            citas_bloqueantes = db.query(Cita).filter(
                                Cita.medico_id == doctor.id,
                                Cita.estado != "cancelada",
                                or_(Cita.fecha_hora.in_(posibles_huecos), Cita.fecha_hora_propuesta.in_(posibles_huecos))).all()
                            
                            huecos_ocupados = set()

                            for cita in citas_bloqueantes:
                                if cita.fecha_hora in posibles_huecos and cita.estado != "pendiente_aceptacion":
                                    huecos_ocupados.add(cita.fecha_hora)
                                
                                if cita.fecha_hora_propuesta in posibles_huecos and cita.estado == "pendiente_aceptacion":
                                    huecos_ocupados.add(cita.fecha_hora_propuesta)

                                if cita.fecha_hora in posibles_huecos and cita.estado == "pendiente_aceptacion":
                                    huecos_ocupados.add(cita.fecha_hora)
                            
                            intervalos_ocupados_paciente = datos_peticion.get("intervalos_ocupados_paciente", [])
                            intervalos_paciente = []
                            
                            for intervalo in intervalos_ocupados_paciente:
                                p_inicio = datetime.strptime(intervalo["inicio"], "%Y-%m-%d %H:%M")
                                p_fin = datetime.strptime(intervalo["fin"], "%Y-%m-%d %H:%M")
                                intervalos_paciente.append((p_inicio, p_fin))

                            huecos_libres = []
                            for h in posibles_huecos:
                                if h in huecos_ocupados or h in self.agent.huecos_bloqueados:
                                    continue

                                doc_inicio = datetime.strptime(h, "%Y-%m-%d %H:%M")
                                doc_fin = doc_inicio + timedelta(minutes=doctor.duracion_cita)

                                solapa_con_paciente = False
                                for p_inicio, p_fin in intervalos_paciente:
                                    if (doc_inicio < p_fin and doc_fin > p_inicio):
                                        solapa_con_paciente = True
                                        break

                                if not solapa_con_paciente:
                                    huecos_libres.append(h)               

                            for hueco in huecos_libres:
                                dia_semana = DIA_SEMANA[datetime.strptime(hueco, "%Y-%m-%d %H:%M").weekday()]
                                es_manana = datetime.strptime(hueco, "%Y-%m-%d %H:%M").hour < 15
                                turno_hueco = "M" if es_manana else "T"

                                puntuacion_actual = 50
                                es_acorde_preferencias = evaluar_preferencias(preferencias_paciente, dia_semana, turno_hueco)

                                if es_acorde_preferencias:
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
                            self.agent.huecos_bloqueados[hueco_ofrecido] = tiempo_actual
                            respuesta = msg.make_reply()
                            respuesta.set_metadata("performative", "propose")
                            respuesta.body = json.dumps({"fecha_hora": hueco_ofrecido, "puntuacion_afinidad": mejor_puntuacion})
                            print(f"Propuesta enviada a {remitente} con fecha y hora: {hueco_ofrecido} y puntuación: {mejor_puntuacion}")
                            await self.send(respuesta)
                        else:
                            await self._enviar_rechazo(msg, "No tengo huecos disponibles en mi agenda.")
                    finally:
                        db.close()
                
                elif performative == "accept-proposal":
                    datos_aceptacion = json.loads(msg.body)
                    fecha_hora = datos_aceptacion.get("fecha_hora")
                    print(f"Propuesta aceptada por {remitente} para fecha y hora: {fecha_hora}")
                
                elif performative == "inform" and msg.get_metadata("ontology") == "confirmacion_db":
                    datos_confirmacion = json.loads(msg.body)
                    fecha_hora_confirmada = datos_confirmacion.get("fecha_hora")
                    print(f"Confirmación de cita recibida por {remitente} para fecha y hora: {fecha_hora_confirmada}")
                    self.agent.huecos_bloqueados.pop(fecha_hora_confirmada, None)
                
                elif performative == "reject-proposal":
                    datos = json.loads(msg.body)
                    print(f"Propuesta rechazada por {remitente}")
                    hueco_rechazado = datos.get("hueco_rechazado")
                    if hueco_rechazado in self.agent.huecos_bloqueados:
                        del self.agent.huecos_bloqueados[hueco_rechazado]
                    pass
            
        async def _enviar_rechazo(self, msg, motivo):
            respuesta = msg.make_reply()
            respuesta.set_metadata("performative", "refuse")
            respuesta.body = json.dumps({"motivo": motivo})
            await self.send(respuesta)


    async def setup(self):
        print(f"Setting up DoctorAgent {self.jid}")
        self.add_behaviour(self.AtenderPeticionesBehaviour())
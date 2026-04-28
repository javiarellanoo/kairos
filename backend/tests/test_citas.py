import pytest
import asyncio 
from httpx import AsyncClient, ASGITransport
from asgi_lifespan import LifespanManager
import main as main_module
from main import app
import uuid
from datetime import date

from database import SessionLocal
from sqlalchemy import event
from models import Cita, Paciente, Doctor, Volante, hash_searchable_field
from security import get_password_hash

# Inteceptamos la creación de Volantes en el contexto de pruebas para asignar un UUID
@event.listens_for(Volante, "before_insert")
def set_volante_id(mapper, connection, target):
    if not target.id:
        target.id = uuid.uuid4()

PATIENT_1 = {"username": "luissalo569@fakeemail.com", "password": "test_password"}
PATIENT_2 = {"username": "genode243@example.com",    "password": "test_password"}
DOCTOR_1 = {"username": "anadel212@fakeemail.com", "password": "test_password"}
DOCTOR_2 = {"username": "angesast324@test.com", "password": "test_password"}
DOCTOR_PEDIATRA = {"username": "tomaguio41@fakeemail.com", "password": "test_password"}
DOCTOR_DERMATOLOGO = {"username": "fideherr429@example.com", "password": "test_password"}


async def get_auth_headers(client: AsyncClient, credentials: dict) -> dict:
    response = await client.post("/api/login", data=credentials)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_citas_concurrentes():
    app.dependency_overrides.clear()
    async with LifespanManager(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
            headers_1, headers_2 = await asyncio.gather(
                get_auth_headers(ac, PATIENT_1),
                get_auth_headers(ac, PATIENT_2),
            )
            response1 = ac.post("/api/nueva-cita", json={
                "especialidad": "Medicina General",
                "motivo": "Consulta general",
                "lista_espera": False
            }, headers=headers_1)

            response2 = ac.post("/api/nueva-cita", json={
                "especialidad": "Medicina General",
                "motivo": "Consulta general",
                "lista_espera": False
            }, headers=headers_2)

            results = await asyncio.gather(response1, response2)

            respuesta_1 = results[0]
            respuesta_2 = results[1]
            assert respuesta_1.status_code == 200
            assert respuesta_2.status_code == 200
            print(f"Paciente 1 recibió: {respuesta_1.json()}")
            print(f"Paciente 2 recibió: {respuesta_2.json()}")

            assert respuesta_1.json()["fecha_hora"] != respuesta_2.json()["fecha_hora"]

            cita_1_id = respuesta_1.json()["id"]
            cita_2_id = respuesta_2.json()["id"]
            
            db = SessionLocal()
            db.query(Cita).filter(Cita.id.in_([cita_1_id, cita_2_id])).delete()
            db.commit()
            db.close()


@pytest.mark.asyncio
async def test_cita_sin_volante_para_especialidad_no_primaria(client):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.post("/api/nueva-cita", json={
        "especialidad": "Cardiología",
        "lista_espera": False
    }, headers=headers)

    assert response.status_code == 400

@pytest.mark.asyncio
async def test_cita_con_volante_para_especialidad_primaria(client):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.post("/api/nueva-cita", json={
        "especialidad": "Medicina General",
        "motivo": "Consulta general",
        "id_volante": "123e4567-e89b-12d3-a456-426614174000",  
        "lista_espera": False
    }, headers=headers)

    assert response.status_code == 400

@pytest.mark.asyncio
async def test_cita_con_volante_no_existente(client):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.post("/api/nueva-cita", json={
        "especialidad": "Cardiología",
        "id_volante": str(uuid.uuid4()),  
        "lista_espera": False
    }, headers=headers)

    assert response.status_code == 404

@pytest.mark.asyncio
async def test_cita_con_volante_de_otro_paciente(client):
    VOLANTE_PATIENT_2_CARDIOLOGIA = "9c622a08-f3e2-45f6-b02d-640407ca4291"
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.post("/api/nueva-cita", json={
        "especialidad": "Cardiología",
        "id_volante": VOLANTE_PATIENT_2_CARDIOLOGIA,
        "lista_espera": False
    }, headers=headers)

    assert response.status_code == 404

@pytest.mark.asyncio
async def test_cita_con_volante_con_especialidad_incompatible(client):
    VOLANTE_PATIENT_2_GINECOLOGIA = "caafc34a-75ff-492b-8045-e5af9ad2854f"
    headers = await get_auth_headers(client, PATIENT_2)
    response = await client.post("/api/nueva-cita", json={
        "especialidad": "Cardiología",
        "id_volante": VOLANTE_PATIENT_2_GINECOLOGIA,
        "lista_espera": False
    }, headers=headers)

    assert response.status_code == 400

@pytest.mark.asyncio
async def test_cita_con_volante_caducado_o_procesado(client):
    VOLANTE_PATIENT_2_CARDIOLOGIA_CONSUMIDO = "9c622a08-f3e2-45f6-b02d-640407ca4291"
    headers = await get_auth_headers(client, PATIENT_2)
    response = await client.post("/api/nueva-cita", json={
        "especialidad": "Cardiología",
        "id_volante": VOLANTE_PATIENT_2_CARDIOLOGIA_CONSUMIDO,
        "lista_espera": False
    }, headers=headers)

    assert response.status_code == 400

@pytest.mark.asyncio
async def test_cita_con_volante_pendiente(client):
    VOLANTE_PATIENT_1_CARDIOLOGIA_PENDIENTE = "9c622a08-f3e2-45f6-b02d-640407ca4293"
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.post("/api/nueva-cita", json={
        "especialidad": "Cardiología",
        "id_volante": VOLANTE_PATIENT_1_CARDIOLOGIA_PENDIENTE,
        "lista_espera": False
    }, headers=headers)

    assert response.status_code == 200

@pytest.mark.asyncio
async def test_cita_paciente_sin_medico_de_cabecera(client):

    sufijo_unico = uuid.uuid4().hex[:8]
    email = f"paciente_sin_medico_{sufijo_unico}@example.com"

    dni_test = f"{sufijo_unico}A"
    tarjeta_test = f"AN-{sufijo_unico}1"
    db = SessionLocal()
    try:
        nuevo_paciente = Paciente(
            email=email,
            name="Paciente Sin Medico",
            password=get_password_hash("test_password"),
            phone="600000000",
            dni=dni_test,
            dni_hash=hash_searchable_field(dni_test),
            birth_date=date(1990, 1, 1),
            tarjeta_sanitaria=tarjeta_test,
            tarjeta_sanitaria_hash=hash_searchable_field(tarjeta_test),
            medico_de_cabecera_id=None,
            preferencias_horarias={"lunes": ["M"], "martes": ["M"], "miercoles": ["M"], "jueves": ["M"], "viernes": ["M"]},
        )
        db.add(nuevo_paciente)
        db.commit()
        db.refresh(nuevo_paciente)
    finally:
        db.close()

    headers = await get_auth_headers(client, {"username": nuevo_paciente.email, "password": "test_password"})
    response = await client.post("/api/nueva-cita", json={
        "especialidad": "Medicina General",
        "motivo": "Consulta general",
        "lista_espera": False
    }, headers=headers)

    assert response.status_code == 400

@pytest.mark.asyncio
async def test_cita_con_especialidad_invalida(client):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.post("/api/nueva-cita", json={
        "especialidad": "Especialidad Inexistente",
        "motivo": "Consulta general",
        "lista_espera": False
    }, headers=headers)

    assert response.status_code == 400

@pytest.mark.asyncio
async def test_get_citas_adelantos(client):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.get("/api/citas/adelantos", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_mis_citas(client):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.get("/api/mis-citas", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_agenda_doctor(client):
    headers = await get_auth_headers(client, DOCTOR_1)
    response = await client.get("/api/agenda-doctor", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_agenda_hoy(client):
    headers = await get_auth_headers(client, DOCTOR_1)
    response = await client.get("/api/agenda-hoy", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_obtener_citas_proximas(client):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.get("/api/citas/proximas", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_cancelar_cita(client, db_session):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.patch("/api/cancelar-cita/296", headers=headers)
    cita = db_session.query(Cita).filter(Cita.id == 296).first()
    assert cita.estado == "cancelada"
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_cancelar_cita_con_cita_no_existente(client):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.patch("/api/cancelar-cita/9999", headers=headers)
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_cancelar_cita_de_otro_paciente(client):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.patch("/api/cancelar-cita/297", headers=headers)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_mis_citas(client):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.get("/api/mis-citas", headers=headers)
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_agenda_doctor(client):
    headers = await get_auth_headers(client, DOCTOR_1)
    response = await client.get("/api/agenda-doctor", headers=headers)
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_agenda_hoy_doctor(client):
    headers = await get_auth_headers(client, DOCTOR_1)
    response = await client.get("/api/agenda-hoy", headers=headers)
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_detalles_cita(client):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.get("/api/citas/296", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 296
    assert "fecha_hora" in data
    assert "estado" in data
    assert "especialidad" in data

@pytest.mark.asyncio
async def test_detalles_cita_no_existente(client):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.get("/api/citas/9999", headers=headers)
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_detalles_cita_de_otro_paciente(client):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.get("/api/citas/297", headers=headers)
    assert response.status_code == 403

async def create_test_cita(db_session, doctor_email, paciente_email, fecha_hora="2026-02-23 10:00", estado="confirmada"):
    medico = db_session.query(Doctor).filter(Doctor.email == doctor_email).first()
    paciente = db_session.query(Paciente).filter(Paciente.email == paciente_email).first()
    cita = Cita(
        paciente_id=paciente.id,
        medico_id=medico.id,
        fecha_hora=fecha_hora,
        especialidad=medico.especialidad,
        motivo="Consulta general",
        prioridad_peso=1.0,
        estado=estado
    )
    db_session.add(cita)
    db_session.commit()
    db_session.refresh(cita)
    return cita

@pytest.mark.asyncio
async def test_obtener_citas_adelantos_filtra_por_paciente_y_estado(client, db_session):
    cita_pendiente_paciente_1 = await create_test_cita(
        db_session,
        DOCTOR_1["username"],
        PATIENT_1["username"],
        fecha_hora="2026-05-10 10:00",
        estado="pendiente_aceptacion",
    )
    cita_confirmada_paciente_1 = await create_test_cita(
        db_session,
        DOCTOR_1["username"],
        PATIENT_1["username"],
        fecha_hora="2026-05-11 10:00",
        estado="confirmada",
    )
    cita_pendiente_paciente_2 = await create_test_cita(
        db_session,
        DOCTOR_1["username"],
        PATIENT_2["username"],
        fecha_hora="2026-05-12 10:00",
        estado="pendiente_aceptacion",
    )

    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.get("/api/citas/adelantos", headers=headers)

    assert response.status_code == 200
    citas = response.json()
    ids = {cita["id"] for cita in citas}

    assert cita_pendiente_paciente_1.id in ids
    assert cita_confirmada_paciente_1.id not in ids
    assert cita_pendiente_paciente_2.id not in ids


@pytest.mark.asyncio
async def test_adelantar_cita_aceptar_exitoso(client, db_session, monkeypatch):
    cita = await create_test_cita(
        db_session,
        DOCTOR_1["username"],
        PATIENT_1["username"],
        fecha_hora="2026-05-13 10:00",
        estado="pendiente_aceptacion",
    )

    async def fake_enviar_mensaje_xmpp(_msg):
        return None

    monkeypatch.setattr(main_module, "enviar_mensaje_xmpp", fake_enviar_mensaje_xmpp)

    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.post(
        f"/api/adelantar-cita/{cita.id}",
        json={"decision": "aceptar"},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["mensaje"] == "Has aceptado el adelanto de tu cita."


@pytest.mark.asyncio
async def test_adelantar_cita_rechazar_exitoso(client, db_session, monkeypatch):
    cita = await create_test_cita(
        db_session,
        DOCTOR_1["username"],
        PATIENT_1["username"],
        fecha_hora="2026-05-14 10:00",
        estado="pendiente_aceptacion",
    )

    async def fake_enviar_mensaje_xmpp(_msg):
        return None

    monkeypatch.setattr(main_module, "enviar_mensaje_xmpp", fake_enviar_mensaje_xmpp)

    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.post(
        f"/api/adelantar-cita/{cita.id}",
        json={"decision": "rechazar"},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["mensaje"] == "Has rechazado el adelanto de tu cita."


@pytest.mark.asyncio
async def test_adelantar_cita_decision_invalida(client, db_session):
    cita = await create_test_cita(
        db_session,
        DOCTOR_1["username"],
        PATIENT_1["username"],
        fecha_hora="2026-05-15 10:00",
        estado="pendiente_aceptacion",
    )

    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.post(
        f"/api/adelantar-cita/{cita.id}",
        json={"decision": "quizas"},
        headers=headers,
    )

    assert response.status_code == 400
    assert "La decisión debe ser 'aceptar' o 'rechazar'." in response.json()["detail"]


@pytest.mark.asyncio
async def test_adelantar_cita_no_existente(client):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.post(
        "/api/adelantar-cita/999999",
        json={"decision": "aceptar"},
        headers=headers,
    )

    assert response.status_code == 404
    assert "Cita no encontrada" in response.json()["detail"]


@pytest.mark.asyncio
async def test_adelantar_cita_de_otro_paciente(client, db_session):
    cita = await create_test_cita(
        db_session,
        DOCTOR_1["username"],
        PATIENT_2["username"],
        fecha_hora="2026-05-16 10:00",
        estado="pendiente_aceptacion",
    )

    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.post(
        f"/api/adelantar-cita/{cita.id}",
        json={"decision": "aceptar"},
        headers=headers,
    )

    assert response.status_code == 403
    assert "No tienes permiso para tomar esta decisión sobre la cita" in response.json()["detail"]


@pytest.mark.asyncio
async def test_adelantar_cita_con_estado_no_pendiente(client, db_session):
    cita = await create_test_cita(
        db_session,
        DOCTOR_1["username"],
        PATIENT_1["username"],
        fecha_hora="2026-05-17 10:00",
        estado="confirmada",
    )

    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.post(
        f"/api/adelantar-cita/{cita.id}",
        json={"decision": "aceptar"},
        headers=headers,
    )

    assert response.status_code == 400
    assert "Esta cita no está pendiente de aceptación para adelanto." in response.json()["detail"]


@pytest.mark.asyncio
async def test_adelantar_cita_error_al_enviar_mensaje(client, db_session, monkeypatch):
    cita = await create_test_cita(
        db_session,
        DOCTOR_1["username"],
        PATIENT_1["username"],
        fecha_hora="2026-05-18 10:00",
        estado="pendiente_aceptacion",
    )

    async def fake_enviar_mensaje_xmpp_fallando(_msg):
        raise RuntimeError("Fallo simulado en XMPP")

    monkeypatch.setattr(main_module, "enviar_mensaje_xmpp", fake_enviar_mensaje_xmpp_fallando)

    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.post(
        f"/api/adelantar-cita/{cita.id}",
        json={"decision": "aceptar"},
        headers=headers,
    )

    assert response.status_code == 500
    assert "Error al procesar tu decisión. Por favor, inténtalo de nuevo." in response.json()["detail"]

@pytest.mark.asyncio
async def test_crear_volante_exitoso_primaria(client, db_session):
    cita = await create_test_cita(db_session, DOCTOR_PEDIATRA["username"], PATIENT_1["username"])
    headers = await get_auth_headers(client, DOCTOR_PEDIATRA)
    response = await client.post(f"/api/volantes/{cita.id}", json={
        "especialidad_destino": "Cardiología",
        "motivo": "Volante - Derivación Media",
        "observaciones": "Derivación rutinaria"
    }, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["especialidad_destino"] == "Cardiología"
    assert data["estado"] == "pendiente"

@pytest.mark.asyncio
async def test_crear_volante_mismo_especialista(client, db_session):
    cita = await create_test_cita(db_session, DOCTOR_1["username"], PATIENT_1["username"])
    headers = await get_auth_headers(client, DOCTOR_1)
    response = await client.post(f"/api/volantes/{cita.id}", json={
        "especialidad_destino": "Cardiología",
        "motivo": "Volante - Derivación Alta"
    }, headers=headers)
    assert response.status_code == 200
    assert response.json()["especialidad_destino"] == "Cardiología"

@pytest.mark.asyncio
async def test_crear_volante_cita_no_existente(client):
    headers = await get_auth_headers(client, DOCTOR_PEDIATRA)
    response = await client.post("/api/volantes/99999", json={
        "especialidad_destino": "Cardiología",
        "motivo": "Volante - Derivación Media"
    }, headers=headers)
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_crear_volante_cita_ajena(client, db_session):
    cita = await create_test_cita(db_session, DOCTOR_PEDIATRA["username"], PATIENT_1["username"])
    headers = await get_auth_headers(client, DOCTOR_DERMATOLOGO)
    response = await client.post(f"/api/volantes/{cita.id}", json={
        "especialidad_destino": "Cardiología",
        "motivo": "Volante - Derivación Media"
    }, headers=headers)
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_crear_volante_especialista_diferente(client, db_session):
    # Un cardiólogo intentando derivar a Dermatología
    cita = await create_test_cita(db_session, DOCTOR_1["username"], PATIENT_1["username"])
    headers = await get_auth_headers(client, DOCTOR_1)
    response = await client.post(f"/api/volantes/{cita.id}", json={
        "especialidad_destino": "Dermatología",
        "motivo": "Volante - Derivación Media"
    }, headers=headers)
    assert response.status_code == 400
    assert "Solo puedes crear volantes para tu misma especialidad" in response.json()["detail"]

@pytest.mark.asyncio
async def test_crear_volante_hacia_primaria(client, db_session):
    cita = await create_test_cita(db_session, DOCTOR_PEDIATRA["username"], PATIENT_1["username"])
    headers = await get_auth_headers(client, DOCTOR_PEDIATRA)
    response = await client.post(f"/api/volantes/{cita.id}", json={
        "especialidad_destino": "Medicina General",
        "motivo": "Volante - Derivación Media"
    }, headers=headers)
    assert response.status_code == 400
    assert "No se pueden crear volantes para especialidades primarias" in response.json()["detail"]

@pytest.mark.asyncio
async def test_crear_volante_dias_pasados_o_futuros(client, db_session):
    cita = await create_test_cita(db_session, DOCTOR_PEDIATRA["username"], PATIENT_1["username"], fecha_hora="2026-02-24 10:00")
    headers = await get_auth_headers(client, DOCTOR_PEDIATRA)
    response = await client.post(f"/api/volantes/{cita.id}", json={
        "especialidad_destino": "Cardiología",
        "motivo": "Volante - Derivación Media"
    }, headers=headers)
    assert response.status_code == 400
    assert "días futuros o pasados" in response.json()["detail"]

@pytest.mark.asyncio
async def test_abrir_agenda_exitoso(client):
    headers = await get_auth_headers(client, DOCTOR_1)
    response = await client.patch("/api/doctors/me/agenda", json={
            "2026-03-09": ["09:00", "10:00", "11:00"],
            "2026-03-10": ["14:00", "15:00"]
    }, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "agenda" in data
    assert "2026-03-09" in data["agenda"]
    assert "2026-03-10" in data["agenda"]

@pytest.mark.asyncio
async def test_abrir_agenda_con_fechas_pasadas(client):
    headers = await get_auth_headers(client, DOCTOR_1)
    response = await client.patch("/api/doctors/me/agenda", json={
            "2020-01-01": ["09:00", "10:00"],
            "2026-03-10": ["14:00", "15:00"]
    }, headers=headers)
    assert response.status_code == 400
    assert "No se pueden agregar fechas pasadas" in response.json()["detail"]

@pytest.mark.asyncio
async def test_abrir_agenda_con_agenda_vacia(client):
    headers = await get_auth_headers(client, DOCTOR_1)
    response = await client.patch("/api/doctors/me/agenda", json={}, headers=headers)
    assert response.status_code == 400
    assert "La agenda no puede estar vacía" in response.json()["detail"]

@pytest.mark.asyncio 
async def test_abrir_agenda_con_fecha_mal_formateada(client):
    headers = await get_auth_headers(client, DOCTOR_1)
    response = await client.patch("/api/doctors/me/agenda", json={
            "2026/03/09": ["09:00", "10:00"],
            "2026-03-10": ["14:00", "15:00"]
    }, headers=headers)
    assert response.status_code == 400
    assert "Formato de fecha inválido. Usa YYYY-MM-DD." in response.json()["detail"]

@pytest.mark.asyncio
async def test_abrir_agenda_solapada(client):
    headers = await get_auth_headers(client, DOCTOR_1)
    response = await client.patch("/api/doctors/me/agenda", json={
            "2026-03-08": ["09:00", "10:00", "11:00"],
            "2026-03-10": ["14:00", "15:00"]
    }, headers=headers)
    assert response.status_code == 400
    assert "La nueva agenda debe comenzar después de la última fecha activa actual." in response.json()["detail"]

@pytest.mark.asyncio
async def test_actualizar_duracion_cita_exitoso(client):
    headers = await get_auth_headers(client, DOCTOR_1)
    response = await client.put("/api/doctors/me", json={"duracion_cita": 30}, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "duracion_cita" in data
    assert data["duracion_cita"] == 30

@pytest.mark.asyncio
async def test_actualizar_duracion_cita_con_valor_invalido(client):
    headers = await get_auth_headers(client, DOCTOR_1)
    response = await client.put("/api/doctors/me", json={"duracion_cita": -10}, headers=headers)
    assert response.status_code == 400
    assert "La duración de la cita debe ser un número positivo." in response.json()["detail"]

@pytest.mark.asyncio
async def test_actualizar_duracion_cita_con_valor_cero(client):
    headers = await get_auth_headers(client, DOCTOR_1)
    response = await client.put("/api/doctors/me", json={"duracion_cita": 0}, headers=headers)
    assert response.status_code == 400
    assert "La duración de la cita debe ser un número positivo." in response.json()["detail"]

@pytest.mark.asyncio
async def test_actualizar_estado_cita_exitoso(client):
    headers = await get_auth_headers(client, DOCTOR_1)
    response = await client.patch("/api/doctors/citas/8", json={"estado": "no_asistida"}, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "cita" in data
    assert data["cita"]["id"] == 8
    assert data["cita"]["estado"] == "no_asistida"

@pytest.mark.asyncio
async def test_actualizar_estado_cita_con_estado_invalido(client):
    headers = await get_auth_headers(client, DOCTOR_1)
    response = await client.patch("/api/doctors/citas/8", json={"estado": "lista_espera"}, headers=headers)
    assert response.status_code == 400
    assert "Estado inválido. Los estados válidos son: confirmada, no_asistida" in response.json()["detail"]

@pytest.mark.asyncio
async def test_actualizar_estado_cita_cancelada(client):
    headers = await get_auth_headers(client, DOCTOR_2)
    cita_cancelada = await create_test_cita(
        db_session=SessionLocal(),
        doctor_email=DOCTOR_2["username"],
        paciente_email=PATIENT_2["username"],
        fecha_hora="2026-05-20T10:00:00",
        estado="cancelada"
    )
    cita_cancelada_id = cita_cancelada.id
    response = await client.patch(f"/api/doctors/citas/{cita_cancelada_id}", json={"estado": "no_asistida"}, headers=headers)
    assert response.status_code == 400
    assert "No se puede actualizar una cita cancelada" in response.json()["detail"]

@pytest.mark.asyncio
async def test_actualizar_estado_cita_de_otro_doctor(client):
    headers = await get_auth_headers(client, DOCTOR_2)
    response = await client.patch("/api/doctors/citas/296", json={"estado": "confirmada"}, headers=headers)
    assert response.status_code == 403
    assert "No tienes permiso para actualizar esta cita" in response.json()["detail"]

@pytest.mark.asyncio
async def test_actualizar_estado_cita_no_existente(client):
    headers = await get_auth_headers(client, DOCTOR_1)
    response = await client.patch("/api/doctors/citas/9999", json={"estado": "confirmada"}, headers=headers)
    assert response.status_code == 404
    assert "Cita no encontrada" in response.json()["detail"]
import pytest
import asyncio 
from httpx import AsyncClient, ASGITransport
from asgi_lifespan import LifespanManager
from main import app
import uuid
from datetime import date

from database import SessionLocal
from models import Cita, Paciente, hash_searchable_field
from security import get_password_hash

PATIENT_1 = {"username": "luissalo569@fakeemail.com", "password": "test_password"}
PATIENT_2 = {"username": "genode243@example.com",    "password": "test_password"}
DOCTOR_1 = {"username": "anadel212@fakeemail.com", "password": "test_password"}

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
    # Volante real de PATIENT_2 (Cardiología, Consumido) — PATIENT_1 no es su dueño
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
    # Volante real de PATIENT_2 para Ginecología — se solicita Cardiología → incompatible
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
    # Volante real de PATIENT_2 para Cardiología con estado Consumido → ya procesado
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
    VOLANTE_PATIENT_1_CARDIOLOGIA_PENDIENTE = "9c622a08-f3e2-45f6-b02d-640407ca4293"  # Volante pendiente real de PATIENT_1 para Cardiología
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
    
    # Valores aleatorios para que NUNCA choquen
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






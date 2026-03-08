import pytest
import asyncio 
from httpx import AsyncClient, ASGITransport
from asgi_lifespan import LifespanManager
from main import app
import uuid

PATIENT_1 = {"username": "luissalo569@fakeemail.com", "password": "test_password"}
PATIENT_2 = {"username": "genode243@example.com",    "password": "test_password"}

async def get_auth_headers(ac: AsyncClient, credentials: dict) -> dict:
    response = await ac.post("/api/login", data=credentials)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_citas_concurrentes():
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


@pytest.mark.asyncio
async def test_cita_sin_volante_para_especialidad_no_primaria():
    async with LifespanManager(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
            headers = await get_auth_headers(ac, PATIENT_1)
            response = await ac.post("/api/nueva-cita", json={
                "especialidad": "Cardiología",
                "lista_espera": False
            }, headers=headers)

            assert response.status_code == 400
            print(f"Respuesta para cita sin volante: {response.json()}")

@pytest.mark.asyncio
async def test_cita_con_volante_para_especialidad_primaria():
    async with LifespanManager(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
            headers = await get_auth_headers(ac, PATIENT_1)
            response = await ac.post("/api/nueva-cita", json={
                "especialidad": "Medicina General",
                "motivo": "Consulta general",
                "id_volante": "123e4567-e89b-12d3-a456-426614174000",  
                "lista_espera": False
            }, headers=headers)

            assert response.status_code == 400
            print(f"Respuesta para cita con volante en especialidad primaria: {response.json()}")

@pytest.mark.asyncio
async def test_cita_con_volante_no_existente():
    async with LifespanManager(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
            headers = await get_auth_headers(ac, PATIENT_1)
            response = await ac.post("/api/nueva-cita", json={
                "especialidad": "Cardiología",
                "id_volante": str(uuid.uuid4()),  
                "lista_espera": False
            }, headers=headers)

            assert response.status_code == 404
            print(f"Respuesta para cita con volante no existente: {response.json()}")

@pytest.mark.asyncio
async def test_cita_con_volante_de_otro_paciente():
    async with LifespanManager(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
            headers = await get_auth_headers(ac, PATIENT_1)
            response = await ac.post("/api/nueva-cita", json={
                "especialidad": "Cardiología",
                "id_volante": "123e4567-e89b-12d3-a456-426614174000",  
                "lista_espera": False
            }, headers=headers)

            assert response.status_code == 404
            print(f"Respuesta para cita con volante de otro paciente: {response.json()}")




import pytest
import asyncio 
from httpx import AsyncClient, ASGITransport
from asgi_lifespan import LifespanManager
from main import app
from datetime import date

PATIENT_1 = {"username": "luissalo569@fakeemail.com", "password": "test_password"}
PATIENT_2 = {"username": "genode243@example.com",    "password": "test_password"}
ADMIN = {"username": "admin@tfg.com", "password": "admin123"}

async def get_auth_headers(client: AsyncClient, credentials: dict) -> dict:
    response = await client.post("/api/login", data=credentials)
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.asyncio
async def test_login_exitoso(client):
    response = await client.post("/api/login", data=PATIENT_1)
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_login_fallido(client):
    response = await client.post("/api/login", data={"username": "test_user", "password": "wrong_password"})
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_root(client):
    response = await client.get("/")
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_signup_paciente_mayor_edad(client):
    response = await client.post("/api/signup", json={
    "email": "test@gmail.com",
    "name": "Test User",
    "password": "test_password",
    "phone": "111111111",
    "dni": "22222222N",
    "birth_date": "2004-02-27",
    "tarjeta_sanitaria": "AN 222222222",
    "preferencias_horarias": {
        "lunes": ["M"], "martes": ["M", "T"], "miercoles": ["T"], "jueves": ["M", "T"], "viernes": ["M", "T"]
    }
    })
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_signup_paciente_menor_edad(client):
    response = await client.post("/api/signup", json={
    "email": "test@gmail.com",
    "name": "Test User",
    "password": "test_password",
    "phone": "111111111",
    "dni": "33333333N",
    "birth_date": "2024-02-27",
    "tarjeta_sanitaria": "AN 333333333",
    "preferencias_horarias": {
        "lunes": ["M"], "martes": ["M", "T"], "miercoles": ["T"], "jueves": ["M", "T"], "viernes": ["M", "T"]
    }
    })
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_signup_email_duplicado(client):
    response = await client.post("/api/signup", json={
    "email": "luissalo569@fakeemail.com",
    "name": "Test User",
    "password": "test_password",
    "phone": "111111111",
    "dni": "44444444N",
    "birth_date": "2024-02-27",
    "tarjeta_sanitaria": "AN 444444444",
    "preferencias_horarias": {
        "lunes": ["M"], "martes": ["M", "T"], "miercoles": ["T"], "jueves": ["M", "T"], "viernes": ["M", "T"]
    }
    })
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_signup_dni_duplicado(client):
    response = await client.post("/api/signup", json={
    "email": "test2@gmail.com",
    "name": "Test User 2",
    "password": "test_password",
    "phone": "222222222",
    "dni": "04248696K",
    "birth_date": "2024-02-27",
    "tarjeta_sanitaria": "AN 555555555",
    "preferencias_horarias": {
        "lunes": ["M"], "martes": ["M", "T"], "miercoles": ["T"], "jueves": ["M", "T"], "viernes": ["M", "T"]
    }
    })
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_signup_tarjeta_duplicada(client):
    response = await client.post("/api/signup", json={
    "email": "test3@gmail.com",
    "name": "Test User 3",
    "password": "test_password",
    "phone": "333333333",
    "dni": "66666666N",
    "birth_date": "2024-02-27",
    "tarjeta_sanitaria": "AN 7682198194",
    "preferencias_horarias": {
        "lunes": ["M"], "martes": ["M", "T"], "miercoles": ["T"], "jueves": ["M", "T"], "viernes": ["M", "T"]
    }
    })
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_signup_doctor(client):
    headers = await get_auth_headers(client, ADMIN)
    response = await client.post("/api/signup-doctor", json={
    "email": "test_doctor@gmail.com",
    "name": "Test Doctor",
    "password": "test_password",
    "phone": "444444444",
    "duracion_cita": 30,
    "especialidad": "Medicina General"
    }, headers = headers)
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_signup_doctor_email_duplicado(client):
    headers = await get_auth_headers(client, ADMIN)
    response = await client.post("/api/signup-doctor", json={
    "email": "anadel212@fakeemail.com",
    "name": "Test Doctor 2",
    "password": "test_password",
    "phone": "555555555",
    "duracion_cita": 30,
    "especialidad": "Medicina General"
    }, headers = headers)
    assert response.status_code == 400

@pytest.mark.asyncio
async def test_signup_doctor_especialidad_invalida(client):
    headers = await get_auth_headers(client, ADMIN)
    response = await client.post("/api/signup-doctor", json={
    "email": "test_doctor_invalid@gmail.com",
    "name": "Test Doctor Invalid",
    "password": "test_password",
    "phone": "666666666",
    "duracion_cita": 30,
    "especialidad": "Especialidad Invalida"
    }, headers = headers)
    assert response.status_code == 400


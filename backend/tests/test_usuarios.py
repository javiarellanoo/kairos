import pytest
import asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from asgi_lifespan import LifespanManager
from backend.database import SessionLocal
from backend.models import Paciente
from backend.models import Paciente
from main import app
from datetime import date, datetime
import random

def generate_valid_dni():
    num = random.randint(10000000, 99999999)
    letras = "TRWAGMYFPDXBNJZSQVHLCKE"
    letra_esperada = letras[num % 23]
    return f"{num}{letra_esperada}"

def generate_valid_ts():
    num = random.randint(1000000000, 9999999999)
    return f"AN {num}"

PATIENT_1 = {"username": "luissalo569@fakeemail.com", "password": "test_password"}
PATIENT_2 = {"username": "genode243@example.com",    "password": "test_password"}
ADMIN = {"username": "admin@tfg.com", "password": "admin123"}
DOCTOR = {"username": "aguemart303@example.com", "password": "test_password"}

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
    "password": "test_Password1!",
    "phone": "611111111",
    "dni": "53585090N",
    "birth_date": "2004-02-27",
    "tarjeta_sanitaria": "AN 1234567890",
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
    "password": "test_Password1!",
    "phone": "611111111",
    "dni": "53585090N",
    "birth_date": "2024-02-27",
    "tarjeta_sanitaria": "AN 1234567890",
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
    "password": "test_Password1!",
    "phone": "611111111",
    "dni": "53585090N",
    "birth_date": "2024-02-27",
    "tarjeta_sanitaria": "AN 1234567890",
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
    "password": "test_Password1!",
    "phone": "622222222",
    "dni": "04248696K",
    "birth_date": "2024-02-27",
    "tarjeta_sanitaria": "AN 1234567890",
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
    "password": "test_Password1!",
    "phone": "633333333",
    "dni": "53585090N",
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

@pytest.mark.asyncio
async def test_mi_perfil_paciente(client):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.get("/api/pacientes/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == PATIENT_1["username"]
    assert "name" in data
    assert "phone" in data
    assert "dni" in data
    assert "birth_date" in data
    assert "tarjeta_sanitaria" in data
    assert "preferencias_horarias" in data

@pytest.mark.asyncio
async def test_mi_perfil_sin_autenticar(client):
    response = await client.get("/api/pacientes/me")
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_actualizar_perfil_paciente(client):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.put("/api/pacientes/me", json={
        "password": "test_Password1!",
        "phone": "677777777",
        "preferencias_horarias": {
            "lunes": ["T"], "martes": ["M"], "miercoles": ["M", "T"], "jueves": ["T"], "viernes": ["M"]
        }
    }, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["phone"] == "677777777"
    assert data["preferencias_horarias"] == {
        "lunes": ["T"], "martes": ["M"], "miercoles": ["M", "T"], "jueves": ["T"], "viernes": ["M"]
    }

@pytest.mark.asyncio
async def test_obtener_ultimo_dia_agenda(client):
    headers = await get_auth_headers(client, DOCTOR)
    response = await client.get("/api/doctors/me/ultimo-dia-agenda", headers=headers)
    assert response.status_code in [200, 400]

@pytest.mark.asyncio
async def test_obtener_info_doctor(client):
    headers_doc = await get_auth_headers(client, DOCTOR)
    response = await client.get("/api/doctors/me", headers=headers_doc)
    assert response.status_code == 200
    assert "email" in response.json()

@pytest.mark.asyncio
async def test_obtener_perfil_usuario_paciente(client):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.get("/api/users/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["rol"] == "paciente"

@pytest.mark.asyncio
async def test_get_especialidades(client):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.get("/api/especialidades", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_get_especialidades_doctor(client):
    headers_doc = await get_auth_headers(client, DOCTOR)
    response = await client.get("/api/doctors/especialidades", headers=headers_doc)
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_listar_especialidades_admin(client):
    headers = await get_auth_headers(client, ADMIN)
    response = await client.get("/api/admin/especialidades", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_listar_usuarios_admin(client):
    headers = await get_auth_headers(client, ADMIN)
    response = await client.get("/api/admin/usuarios", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_actualizar_info_paciente_admin(client):
    headers = await get_auth_headers(client, ADMIN)
    usuarios = await client.get("/api/admin/usuarios", headers=headers)
    pacientes = [u for u in usuarios.json() if u["rol"] == "paciente"]
    if pacientes:
        paciente_id = pacientes[0]["id"]
        response = await client.put(f"/api/admin/pacientes/{paciente_id}", json={
            "phone": "699999999"
        }, headers=headers)
        assert response.status_code == 200

@pytest.mark.asyncio
async def test_actualizar_info_doctor_admin(client):
    headers = await get_auth_headers(client, ADMIN)
    usuarios = await client.get("/api/admin/usuarios", headers=headers)
    doctores = [u for u in usuarios.json() if u["rol"] == "doctor"]
    if doctores:
        doctor_id = doctores[0]["id"]
        response = await client.put(f"/api/admin/doctors/{doctor_id}", json={
            "phone": "899999999"
        }, headers=headers)
        assert response.status_code in [200, 400, 404]

@pytest.mark.asyncio
async def test_eliminar_usuario_admin(client):
    headers = await get_auth_headers(client, ADMIN)
    response = await client.post("/api/signup", json={
        "email": "tobedelete@gmail.com",
        "name": "To Be Deleted",
        "password": "test_Password1!",
        "phone": "611111111",
        "dni": "99999999X",
        "birth_date": "1990-02-27",
        "tarjeta_sanitaria": "AN 9999999999",
        "preferencias_horarias": {
            "lunes": ["M"]
        }
    })
    
    usuarios = await client.get("/api/admin/usuarios", headers=headers)
    del_user = [u for u in usuarios.json() if u["email"] == "tobedelete@gmail.com"]
    if del_user:
        uid = del_user[0]["id"]
        response = await client.delete(f"/api/admin/usuarios/{uid}", headers=headers)
        assert response.status_code == 200

@pytest.mark.asyncio
async def test_signup_admin(client):
    headers = await get_auth_headers(client, ADMIN)
    response = await client.post("/api/signup-admin", json={
        "email": "newadmin@example.com",
        "name": "New Admin",
        "password": "adminpassword123",
        "phone": "600123456"
    }, headers=headers)
    assert response.status_code == 200
    assert "access_token" in response.json()

@pytest.mark.asyncio
async def test_crear_especialidad(client):
    headers = await get_auth_headers(client, ADMIN)
    response = await client.post("/api/especialidades", json={
        "name": "NuevaEspecialidad",
        "description": "Una descripcion"
    }, headers=headers)
    assert response.status_code in [200, 400]

@pytest.mark.asyncio
async def test_get_volantes_por_especialidad(client):
    headers = await get_auth_headers(client, PATIENT_1)
    response = await client.get("/api/volantes/especialidad/Cardiología", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_actualizar_info_doctor(client):
    headers_doc = await get_auth_headers(client, DOCTOR)
    response = await client.put("/api/doctors/me", json={
        "phone": "688888888",
        "duracion_cita": 45
    }, headers=headers_doc)
    assert response.status_code == 200

@pytest.mark.asyncio
async def test_eliminar_usuario_paciente(client):
    headers = await get_auth_headers(client, ADMIN)
    rnd = str(uuid.uuid4())[:8]
    email = f"paciente.borrar.{rnd}@gmail.com"
    response_signup = await client.post("/api/signup", json={
        "email": email,
        "name": "Paciente a Borrar",
        "password": "Password1!",
        "phone": "600000001",
        "dni": generate_valid_dni(),
        "birth_date": "1990-01-01",
        "tarjeta_sanitaria": generate_valid_ts(),
        "preferencias_horarias": {"lunes": []}
    })
    assert response_signup.status_code == 200
    
    usuarios = await client.get("/api/admin/usuarios", headers=headers)
    del_user = [u for u in usuarios.json() if u["email"] == email]
    uid = del_user[0]["id"]
    
    response = await client.delete(f"/api/admin/usuarios/{uid}", headers=headers)
    assert response.status_code == 200
    assert response.json()["mensaje"] == "Usuario eliminado exitosamente"

@pytest.mark.asyncio
async def test_eliminar_usuario_doctor_especialidad_no_primaria(client):
    headers = await get_auth_headers(client, ADMIN)
    rnd = str(uuid.uuid4())[:8]
    email = f"doctor.cardiologia.{rnd}@gmail.com"
    res = await client.post("/api/signup-doctor", json={
        "email": email,
        "name": "Doc Cardio",
        "password": "Password1!",
        "phone": "600000002",
        "duracion_cita": 20,
        "especialidad": "Cardiología"
    }, headers=headers)
    assert res.status_code == 200
    
    usuarios = await client.get("/api/admin/usuarios", headers=headers)
    del_user = [u for u in usuarios.json() if u["email"] == email]
    uid = del_user[0]["id"]
    
    response = await client.delete(f"/api/admin/usuarios/{uid}", headers=headers)
    assert response.status_code == 200
    assert response.json()["mensaje"] == "Usuario eliminado exitosamente"

@pytest.mark.asyncio
async def test_eliminar_usuario_doctor_medicina_general(client):
    headers = await get_auth_headers(client, ADMIN)
    rnd = str(uuid.uuid4())[:8]
    email = f"doctor.general.{rnd}@gmail.com"
    res = await client.post("/api/signup-doctor", json={
        "email": email,
        "name": "Doc General",
        "password": "Password1!",
        "phone": "600000003",
        "duracion_cita": 20,
        "especialidad": "Medicina General"
    }, headers=headers)
    assert res.status_code == 200
    
    usuarios = await client.get("/api/admin/usuarios", headers=headers)
    del_user = [u for u in usuarios.json() if u["email"] == email]
    uid = del_user[0]["id"]
    
    response = await client.delete(f"/api/admin/usuarios/{uid}", headers=headers)
    assert response.status_code == 200
    assert response.json()["mensaje"] == "Usuario eliminado exitosamente"

@pytest.mark.asyncio
async def test_eliminar_usuario_admin_fallido(client):
    headers = await get_auth_headers(client, ADMIN)
    perfil_response = await client.get("/api/users/me", headers=headers)
    admin_id = perfil_response.json()["id"]

    response = await client.delete(f"/api/admin/usuarios/{admin_id}", headers=headers)
    assert response.status_code == 403
    assert response.json()["detail"] == "No se pueden eliminar usuarios con rol admin"

@pytest.mark.asyncio
async def test_eliminar_usuario_no_encontrado(client):
    headers = await get_auth_headers(client, ADMIN)
    fake_uuid = str(uuid.uuid4())
    response = await client.delete(f"/api/admin/usuarios/{fake_uuid}", headers=headers)
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_actualizar_paciente_admin_exito(client):
    headers = await get_auth_headers(client, ADMIN)
    rnd = str(uuid.uuid4())[:8]
    email = f"pac1.admin.{rnd}@gmail.com"
    email_nuevo = f"pac1.admin.nuevo.{rnd}@gmail.com"
    res = await client.post("/api/signup", json={
        "email": email,
        "name": "Pac1",
        "password": "Password1!",
        "phone": "611111100",
        "dni": generate_valid_dni(),
        "birth_date": "1990-01-01",  # Se pasa el string directamente
        "tarjeta_sanitaria": generate_valid_ts(),
        "preferencias_horarias": {}
    })
    assert res.status_code == 200
    
    usuarios = await client.get("/api/admin/usuarios", headers=headers)
    uid = [u["id"] for u in usuarios.json() if u["email"] == email][0]
    
    response = await client.put(f"/api/admin/pacientes/{uid}", json={
        "name": "Pac1 Actualizado",
        "email": email_nuevo,
        "dni": generate_valid_dni(),
        "tarjeta_sanitaria": generate_valid_ts(),
        "password": "Password1!NUEVA",
        "phone": "600000000",
        "birth_date": "1990-02-02",
        "preferencias_horarias": {}
    }, headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Pac1 Actualizado"
    assert data["email"] == email_nuevo
    
    response2 = await client.put(f"/api/admin/pacientes/{uid}", json={
        "name": "Pac1 Actualizado",
        "email": email_nuevo,
        "dni": generate_valid_dni(),
        "tarjeta_sanitaria": generate_valid_ts(),
        "password": "Password1!NUEVA",
        "phone": "600000000",
        "birth_date": "1990-02-02",
        "preferencias_horarias": {}
    }, headers=headers)
    
    assert response2.status_code == 200

@pytest.mark.asyncio
async def test_actualizar_paciente_admin_no_encontrado(client):
    headers = await get_auth_headers(client, ADMIN)
    fake_uuid = str(uuid.uuid4())
    response = await client.put(f"/api/admin/pacientes/{fake_uuid}", json={
        "name": "test"
    }, headers=headers)
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_actualizar_paciente_admin_email_duplicado(client):
    headers = await get_auth_headers(client, ADMIN)
    rnd1 = str(uuid.uuid4())[:8]
    rnd2 = str(uuid.uuid4())[:8]
    email1 = f"pac1.admin.{rnd1}@gmail.com"
    email2 = f"pac2.admin.{rnd2}@gmail.com"
    
    await client.post("/api/signup", json={
        "email": email1,
        "name": "Pac1",
        "password": "Password1!",
        "phone": "611111100",
        "dni": generate_valid_dni(),
        "birth_date": "1990-01-01",
        "tarjeta_sanitaria": generate_valid_ts(),
        "preferencias_horarias": {}
    })
    # Crear otro paciente para el conflicto
    await client.post("/api/signup", json={
        "email": email2,
        "name": "Pac2",
        "password": "Password1!",
        "phone": "611111101",
        "dni": generate_valid_dni(),
        "birth_date": "1990-01-01",
        "tarjeta_sanitaria": generate_valid_ts(),
        "preferencias_horarias": {}
    })
    
    usuarios = await client.get("/api/admin/usuarios", headers=headers)
    uid = [u["id"] for u in usuarios.json() if u["email"] == email1][0]
    
    response = await client.put(f"/api/admin/pacientes/{uid}", json={
        "email": email2
    }, headers=headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "El email ya está registrado por otro usuario"

@pytest.mark.asyncio
async def test_actualizar_paciente_admin_dni_duplicado(client):
    headers = await get_auth_headers(client, ADMIN)
    rnd1 = str(uuid.uuid4())[:8]
    rnd2 = str(uuid.uuid4())[:8]
    email1 = f"pac1.dni.{rnd1}@gmail.com"
    email2 = f"pac2.dni.{rnd2}@gmail.com"
    dni2 = generate_valid_dni()
    
    await client.post("/api/signup", json={"email": email1, "name": "P1", "password": "Password1!", "phone": "600000001", "dni": generate_valid_dni(), "birth_date": "1990-01-01", "tarjeta_sanitaria": generate_valid_ts(), "preferencias_horarias": {}})
    await client.post("/api/signup", json={"email": email2, "name": "P2", "password": "Password1!", "phone": "600000002", "dni": dni2, "birth_date": "1990-01-01", "tarjeta_sanitaria": generate_valid_ts(), "preferencias_horarias": {}})
    
    usuarios = await client.get("/api/admin/usuarios", headers=headers)
    uid = [u["id"] for u in usuarios.json() if u["email"] == email1][0]
    
    response = await client.put(f"/api/admin/pacientes/{uid}", json={
        "dni": dni2
    }, headers=headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "El DNI ya está registrado por otro paciente"

@pytest.mark.asyncio
async def test_actualizar_paciente_admin_tarjeta_duplicada(client):
    headers = await get_auth_headers(client, ADMIN)
    rnd1 = str(uuid.uuid4())[:8]
    rnd2 = str(uuid.uuid4())[:8]
    email1 = f"pac1.ts.{rnd1}@gmail.com"
    email2 = f"pac2.ts.{rnd2}@gmail.com"
    ts2 = generate_valid_ts()
    
    await client.post("/api/signup", json={"email": email1, "name": "P1", "password": "Password1!", "phone": "600000003", "dni": generate_valid_dni(), "birth_date": "1990-01-01", "tarjeta_sanitaria": generate_valid_ts(), "preferencias_horarias": {}})
    await client.post("/api/signup", json={"email": email2, "name": "P2", "password": "Password1!", "phone": "600000004", "dni": generate_valid_dni(), "birth_date": "1990-01-01", "tarjeta_sanitaria": ts2, "preferencias_horarias": {}})
    
    usuarios = await client.get("/api/admin/usuarios", headers=headers)
    uid = [u["id"] for u in usuarios.json() if u["email"] == email1][0]
    
    response = await client.put(f"/api/admin/pacientes/{uid}", json={
        "tarjeta_sanitaria": ts2
    }, headers=headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "La tarjeta sanitaria ya está registrada por otro paciente"

@pytest.mark.asyncio
async def test_actualizar_paciente_admin_fecha_futura(client):
    headers = await get_auth_headers(client, ADMIN)
    rnd1 = str(uuid.uuid4())[:8]
    email1 = f"pac1.fut.{rnd1}@gmail.com"
    
    await client.post("/api/signup", json={"email": email1, "name": "P1", "password": "Password1!", "phone": "600000005", "dni": generate_valid_dni(), "birth_date": "1990-01-01", "tarjeta_sanitaria": generate_valid_ts(), "preferencias_horarias": {}})
    
    usuarios = await client.get("/api/admin/usuarios", headers=headers)
    uid = [u["id"] for u in usuarios.json() if u["email"] == email1][0]
    
    response = await client.put(f"/api/admin/pacientes/{uid}", json={
        "birth_date": "2050-01-01"
    }, headers=headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "La fecha de nacimiento no puede ser en el futuro"


# ======================== 
# TESTS ACTUALIZAR INFO DOCTOR ADMIN 
# ========================

@pytest.mark.asyncio
async def test_actualizar_doctor_admin_exito(client):
    headers = await get_auth_headers(client, ADMIN)
    rnd = str(uuid.uuid4())[:8]
    email = f"doc.admin.{rnd}@gmail.com"
    email_nuevo = f"doc.admin.nuevo.{rnd}@gmail.com"
    res = await client.post("/api/signup-doctor", json={
        "email": email,
        "name": "Doc1",
        "password": "Password1!",
        "phone": "600000010",
        "duracion_cita": 30,
        "especialidad": "Dermatología",
        "consulta": "Consultorio 1"
    }, headers=headers)
    assert res.status_code == 200
    
    usuarios = await client.get("/api/admin/usuarios", headers=headers)
    uid = [u["id"] for u in usuarios.json() if u["email"] == email][0]
    
    response = await client.put(f"/api/admin/doctors/{uid}", json={
        "name": "Doc1 Actualizado",
        "email": email_nuevo,
        "password": "Password1!NUEVA",
        "consulta": "Consultorio 2",
        "duracion_cita": 40
    }, headers=headers)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Doc1 Actualizado"
    assert data["email"] == email_nuevo
    assert data["consulta"] == "Consultorio 2"
    assert data["duracion_cita"] == 40

@pytest.mark.asyncio
async def test_actualizar_doctor_admin_no_encontrado(client):
    headers = await get_auth_headers(client, ADMIN)
    fake_uuid = str(uuid.uuid4())
    response = await client.put(f"/api/admin/doctors/{fake_uuid}", json={
        "name": "test"
    }, headers=headers)
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_actualizar_doctor_admin_email_duplicado(client):
    headers = await get_auth_headers(client, ADMIN)
    rnd1 = str(uuid.uuid4())[:8]
    rnd2 = str(uuid.uuid4())[:8]
    email1 = f"doc1.admin.{rnd1}@gmail.com"
    email2 = f"doc2.admin.{rnd2}@gmail.com"
    
    # Se añaden headers de autorización y especialidad válida existente (Medicina General). Teléfono y Contraseña válidos.
    await client.post("/api/signup-doctor", json={"email": email1, "name": "D1", "password": "Password1!", "phone": "600000006", "duracion_cita": 30, "especialidad": "Medicina General"}, headers=headers)
    await client.post("/api/signup-doctor", json={"email": email2, "name": "D2", "password": "Password1!", "phone": "600000007", "duracion_cita": 30, "especialidad": "Medicina General"}, headers=headers)
    
    usuarios = await client.get("/api/admin/usuarios", headers=headers)
    uid = [u["id"] for u in usuarios.json() if u["email"] == email1][0]
    
    response = await client.put(f"/api/admin/doctors/{uid}", json={
        "email": email2
    }, headers=headers)
    assert response.status_code == 400
    assert response.json()["detail"] == "El email ya está registrado por otro usuario"

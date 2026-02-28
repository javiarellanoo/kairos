from fastapi import FastAPI
from database import engine, Base
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db
from models import Usuario
from security import verify_password, create_access_token
from dependencies import get_current_user

# Esto crea todas las tablas en Postgres si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(title="API TFG - Sistema Multi-Agente Médico")

@app.get("/")
def read_root():
    return {"mensaje": "¡Backend de FastAPI funcionando correctamente!"}



@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    
    # 1. Buscar al usuario por email
    usuario = db.query(Usuario).filter(Usuario.email == form_data.username).first()
    
    # 2. Verificar que existe y que la contraseña (hash) es correcta
    if not usuario or not verify_password(form_data.password, usuario.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Generar el Token JWT con los datos importantes dentro
    token_data = {
        "sub": usuario.email, 
        "rol": usuario.rol,
        "nombre": usuario.name
    }
    access_token = create_access_token(data=token_data)
    
    # 4. Devolver el token al frontend
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "rol": usuario.rol
    }

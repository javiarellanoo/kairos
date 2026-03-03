from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from database import get_db
from models import Usuario
from security import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se han podido validar las credenciales de inicio de sesión",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_name: str = payload.get("sub")
        if user_name is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(Usuario).filter(Usuario.email == user_name).first()
    if user is None:
        raise credentials_exception
    return user

def get_is_admin(current_user: Usuario = Depends(get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No tienes suficientes privilegios para acceder a este recurso. Esta acción es solo para administradores.")
    return current_user

def get_is_doctor(current_user: Usuario = Depends(get_current_user)):
    if current_user.rol != "doctor":
        raise HTTPException(status_code=403, detail="No tienes suficientes privilegios para acceder a este recurso. Esta acción es solo para doctores.")
    return current_user

def get_is_paciente(current_user: Usuario = Depends(get_current_user)):
    if current_user.rol != "paciente":
        raise HTTPException(status_code=403, detail="No tienes suficientes privilegios para acceder a este recurso. Esta acción es solo para pacientes.")
    return current_user
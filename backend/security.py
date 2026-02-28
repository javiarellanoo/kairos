import os
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta

# Use a pure-Python hash to avoid native bcrypt backend issues on Windows.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


SECRET_KEY = os.getenv("SECRET_KEY", "mysecretkey")  
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
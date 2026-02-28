from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 1. Definimos la URL de conexión apuntando al localhost donde Docker expone Postgres
SQLALCHEMY_DATABASE_URL = "postgresql://tfg_user:tfg_password@localhost:5432/tfg_db"

# 2. Creamos el "Motor" (Engine). Es el puente que envía el SQL a Postgres
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# 3. Creamos la fábrica de Sesiones (para las transacciones)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. Base para los modelos
Base = declarative_base()

# 5. Dependencia para inyectar la BBDD en los endpoints de FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
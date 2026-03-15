
import pytest
from sqlalchemy import event
from httpx import AsyncClient, ASGITransport
from asgi_lifespan import LifespanManager

from database import engine, SessionLocal, get_db
from main import app

@pytest.fixture
def db_session():
    """Sesión de BBDD con Rollback automático"""
    connection = engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)

    session.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(sess, trans):
        if trans.nested and not trans._parent.nested:
            sess.begin_nested()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
async def client(db_session):
    """Cliente HTTP asíncrono que levanta a los agentes (Lifespan)"""
    app.dependency_overrides[get_db] = lambda: db_session

    async with LifespanManager(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
            yield ac

    app.dependency_overrides.clear()
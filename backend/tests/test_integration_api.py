import pytest, asyncio, sqlalchemy as sa
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from backend.main import app, get_session, init_db
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI
from backend.db_connection import Base  # wherever your declarative Base lives

pytestmark = pytest.mark.asyncio

'''
@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"
'''

@pytest_asyncio.fixture
async def db_engine(tmp_path_factory):
    url = f"sqlite+aiosqlite:///{tmp_path_factory.mktemp('db')}/test.db"
    eng = create_async_engine(url, future=True)
    # Directly create all tables on your test engine:
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()

@pytest_asyncio.fixture
async def session(db_engine):
    async with AsyncSession(db_engine) as s:
        yield s

@pytest_asyncio.fixture
async def client(session):
    # override the FastAPI dependency so get_session() returns our session
    app.dependency_overrides[get_session] = lambda: session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.pop(get_session, None)

@pytest.mark.asyncio
async def test_full_flow(client):
    user = {
        "email": "full@test",
        "password": "p",
        "first_name": "F",
        "last_name": "L",
        "role": "student",
    }

    # 1) create user
    r = await client.post("/create_user", json=user)
    assert r.status_code == 200

    # 2) login
    r = await client.post("/login", json={"Email": user["email"], "Password": user["password"]})
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3) submit request
    req = {
        "title": "demo",
        "student_email": user["email"],
        "details": "d",
        "files": {},
        "grade_appeal": None,
        "schedule_change": None,
    }
    r = await client.post("/submit_request/create", json=req, headers=headers)
    assert r.status_code == 200

    # 4) list notifications
    r = await client.get(f"/notifications/{user['email']}", headers=headers)
    assert r.status_code == 200



import pytest
import asyncio
from backend.main import app, get_session
from backend.tests.test_main_utils import (
    get_fake_session_with_expected_data,
    get_fake_session,
    get_fake_session_student,
    get_fake_session_professor,
)

@pytest.fixture
def override_session_with_data(monkeypatch):
    app.dependency_overrides[get_session] = get_fake_session_with_expected_data
    yield
    app.dependency_overrides.pop(get_session, None)

@pytest.fixture
def override_session_without_data(monkeypatch):
    app.dependency_overrides[get_session] = get_fake_session
    yield
    app.dependency_overrides.pop(get_session, None)

@pytest.fixture
def override_student_session(monkeypatch):
    app.dependency_overrides[get_session] = get_fake_session_student
    yield
    app.dependency_overrides.pop(get_session, None)

@pytest.fixture
def override_professor_session(monkeypatch):
    app.dependency_overrides[get_session] = get_fake_session_professor
    yield
    app.dependency_overrides.pop(get_session, None)
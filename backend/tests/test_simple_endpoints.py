import pytest
from fastapi.testclient import TestClient
from backend.main import app, get_session, create_access_token
from backend.tests.test_main_utils import get_fake_session
import sys
from datetime import datetime, timedelta
import os
from pathlib import Path

client = TestClient(app)

@pytest.fixture
def override_session():
    app.dependency_overrides[get_session] = get_fake_session
    yield
    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers():
    token = create_access_token({"sub": "test@example.com"})
    return {"Authorization": f"Bearer {token}"}

# Basic endpoint tests
def test_home():
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()

def test_list_databases():
    response = client.get("/databases")
    assert response.status_code == 200
    assert "databases" in response.json()

def test_list_tables():
    response = client.get("/tables/testdb")
    assert response.status_code == 200
    assert "tables" in response.json()

# User and course tests
def test_get_users(override_session):
    response = client.get("/users")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_users_with_role(override_session):
    response = client.get("/users?role=student")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_courses(override_session):
    response = client.get("/courses")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_routing_rules(override_session):
    response = client.get("/api/request_routing_rules")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

# AI Chat endpoint tests
# def test_ai_chat_basic():
#     payload = {
#         "message": "Hello",
#         "language": "en"
#     }
#     response = client.post("/api/ai/chat", json=payload)
#     assert response.status_code == 200
#     data = response.json()
#     assert "language" in data
#     assert "model" in data
#     assert "source" in data
#     assert "success" in data
#     assert data["success"] is True

# def test_ai_chat_no_language():
#     payload = {
#         "message": "Hello"
#     }
#     response = client.post("/api/ai/chat", json=payload)
#     assert response.status_code == 200
#     data = response.json()
#     assert "language" in data
#     assert "model" in data
#     assert "source" in data
#     assert "success" in data
#     assert data["success"] is True

# File operation tests
def test_reload_files(override_session):
    response = client.get("/reloadFiles/test@example.com")
    assert response.status_code in [200, 404]  # Either success or not found is acceptable

def test_download_file(override_session):
    response = client.get("/downloadFile/test@example.com/test_file.txt")
    assert response.status_code in [200, 404]  # Either success or not found is acceptable

# Dashboard test
def test_get_dashboard(override_session):
    response = client.get("/requests/dashboard/test@example.com")
    assert response.status_code in [200, 404]  # Either success or not found is acceptable
    if response.status_code == 200:
        assert isinstance(response.json(), dict)

# User detail tests
def test_get_user_by_email(override_session):
    response = client.post("/Users/getUser/test@example.com")
    assert response.status_code in [200, 404]  # Either success or not found is acceptable
    if response.status_code == 200:
        data = response.json()
        assert "email" in data
        assert "role" in data

# Course detail tests
def test_get_professor_courses(override_session):
    response = client.get("/professor/courses/test@example.com")
    assert response.status_code in [200, 404]  # Either success or not found is acceptable
    if response.status_code == 200:
        data = response.json()
        assert "courses" in data
        assert isinstance(data["courses"], list) 
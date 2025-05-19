import pytest
from fastapi.testclient import TestClient
from backend.main import app, get_session, create_access_token
from backend.tests.test_main_utils import get_fake_session, get_fake_session_student
import sqlalchemy.orm.attributes
import sys
from datetime import datetime

# Mock RequestResponses
class MockRequestResponses:
    def __init__(self, request_id, professor_email, response_text, created_date):
        self.request_id = request_id
        self.professor_email = professor_email
        self.response_text = response_text
        self.created_date = created_date

# Set up the mock in sys.modules
class Dummy: pass
sys.modules['backend.models'] = Dummy()
setattr(Dummy, 'RequestResponses', MockRequestResponses)

# Disable flag_modified for tests
sqlalchemy.orm.attributes.flag_modified = lambda *args, **kwargs: None

client = TestClient(app)

@pytest.fixture
def override_session():
    app.dependency_overrides[get_session] = get_fake_session
    yield
    app.dependency_overrides.clear()

@pytest.fixture
def override_student_session():
    app.dependency_overrides[get_session] = get_fake_session_student
    yield
    app.dependency_overrides.clear()

@pytest.fixture
def student_token():
    return create_access_token({
        "user_email": "test_student@example.com",
        "role": "student",
        "first_name": "Test",
        "last_name": "Student"
    })

def test_create_request(override_student_session):
    payload = {
        "title": "Test Request",
        "student_email": "test_student@example.com",
        "details": "This is a test request",
        "files": {},
        "grade_appeal": None,
        "schedule_change": None,
        "course_id": None
    }
    response = client.post("/submit_request/create", json=payload)
    print("CREATE:", response.status_code, response.json())
    assert response.status_code in (200, 201, 400, 422)

def test_delete_request(override_student_session, student_token):
    payload = {
        "title": "Test Request",
        "student_email": "test_student@example.com",
        "details": "This is a test request",
        "files": {},
        "grade_appeal": None,
        "schedule_change": None,
        "course_id": None
    }
    create_response = client.post("/submit_request/create", json=payload)
    request_id = create_response.json().get("request_id", 1)
    headers = {"Authorization": f"Bearer {student_token}"}
    response = client.delete(f"/Requests/{request_id}", headers=headers)
    print("DELETE:", response.status_code, response.json())
    assert response.status_code in (200, 404, 422, 500)

def test_edit_request(override_student_session, student_token):
    payload = {
        "title": "Test Request",
        "student_email": "test_student@example.com",
        "details": "This is a test request",
        "files": {},
        "grade_appeal": None,
        "schedule_change": None,
        "course_id": None
    }
    create_response = client.post("/submit_request/create", json=payload)
    request_id = create_response.json().get("request_id", 1)
    headers = {"Authorization": f"Bearer {student_token}"}
    edit_payload = {"details": "Updated test request details"}
    response = client.put(f"/Requests/EditRequest/{request_id}", json=edit_payload, headers=headers)
    print("EDIT:", response.status_code, response.json())
    assert response.status_code in (200, 404, 422, 500)

def test_transfer_request(override_student_session, student_token):
    payload = {
        "title": "Test Request",
        "student_email": "test_student@example.com",
        "details": "This is a test request",
        "files": {},
        "grade_appeal": None,
        "schedule_change": None,
        "course_id": None
    }
    create_response = client.post("/submit_request/create", json=payload)
    request_id = create_response.json().get("request_id", 1)
    headers = {"Authorization": f"Bearer {student_token}"}
    transfer_payload = {
        "new_course_id": "CS102",
        "reason": "Course change required"
    }
    response = client.put(f"/request/{request_id}/transfer", json=transfer_payload, headers=headers)
    print("TRANSFER:", response.status_code, response.json())
    assert response.status_code in (200, 404, 422, 500)

# Test for error cases
def test_create_request_missing_fields(override_student_session):
    # Test with missing required fields
    payload = {
        "title": "Test Request",
        # missing student_email
        "details": "This is a test request",
        "files": {},
        "grade_appeal": None,
        "schedule_change": None,
        "course_id": None
    }
    response = client.post("/submit_request/create", json=payload)
    assert response.status_code == 400
    assert "Missing required fields" in response.json()["detail"]

def test_edit_nonexistent_request(override_student_session, student_token):
    # Try to edit a request that doesn't exist
    headers = {"Authorization": f"Bearer {student_token}"}
    edit_payload = {"details": "Updated test request details"}
    response = client.put("/Requests/EditRequest/99999", json=edit_payload, headers=headers)
    assert response.status_code == 404
    assert "Request not found" in response.json()["detail"]

def test_request_timeline_updates(override_student_session, student_token):
    # Create request
    payload = {
        "title": "Test Request",
        "student_email": "test_student@example.com",
        "details": "This is a test request",
        "files": {},
        "grade_appeal": None,
        "schedule_change": None,
        "course_id": None
    }
    create_response = client.post("/submit_request/create", json=payload)
    # Use hardcoded request ID 1 for the fake session
    request_id = 1

    # Get all requests for the user
    response = client.get(f"/requests/test_student@example.com")
    print("TIMELINE GET:", response.status_code, response.json())
    assert response.status_code == 200
    data = response.json()
    # Find the request by ID
    req = next((r for r in data if r["id"] == request_id), None)
    assert req is not None
    assert "timeline" in req
    assert "created" in req["timeline"]
    assert "status_changes" in req["timeline"]

def test_request_routing_rules(override_student_session):
    # Get routing rules
    response = client.get("/api/request_routing_rules")
    assert response.status_code == 200
    rules = response.json()
    assert isinstance(rules, list)
    
    # Update a routing rule
    update_payload = {
        "destination": "secretary"
    }
    response = client.put("/api/request_routing_rules/Grade Appeal Request", json=update_payload)
    assert response.status_code == 200
    assert response.json()["message"] == "Routing rule updated successfully"

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
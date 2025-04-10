# test_main.py
import bcrypt
import os
import pytest
from fastapi.testclient import TestClient
from main import app, get_session
import io

# Use the updated FakeAsyncSession from above.
# (You can also place the FakeUser, FakeResult, FakeAsyncSession code in your test file or a shared test_utils module.)

class FakeUser:
    def __init__(self, email, hashed_password, role, first_name, last_name):
        self.email = email
        self.hashed_password = hashed_password
        self.role = role
        self.first_name = first_name
        self.last_name = last_name

class FakeResult:
    def __init__(self, user):
        self.user = user

    def scalars(self):
        return self

    def first(self):
        return self.user

class FakeAsyncSession:
    async def execute(self, query):
        query_str = str(query).lower()
        # Check if the query is selecting from the Users table.
        if "from users" in query_str or "where" in query_str:
            # Here, return the fake user for testing login.
            hashed = bcrypt.hashpw("password".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            fake_user = FakeUser("test@example.com", hashed, "student", "Test", "User")
            return FakeResult(fake_user)
        return FakeResult(None)

    async def commit(self):
        pass

# Dependency override to inject our fake session.
async def get_fake_session():
    return FakeAsyncSession()

app.dependency_overrides[get_session] = get_fake_session

client = TestClient(app)

###########################################
# Tests for Public Endpoints
###########################################

def test_login_success():
    # Arrange: use the expected keys (capitalized as per your endpoint).
    payload = {"Email": "test@example.com", "Password": "password"}

    # Act: call the login endpoint.
    response = client.post("/login", json=payload)
    print("Response JSON:", response.json())

    # Assert: Check that we got a successful login response.
    assert response.status_code == 200
    json_resp = response.json()
    assert "access_token" in json_resp
    assert json_resp["token_type"] == "bearer"
    assert json_resp["message"] == "Login successful"



def test_home():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to FastAPI Backend!"}


###########################################
# Tests for File Upload / Reload Endpoints
###########################################

def test_upload_file_success(monkeypatch):
    """
    Simulate a file upload to /uploadfile/{userEmail}.
    We override os.makedirs to avoid creating real directories.
    """
    # Fake os.makedirs to do nothing.
    monkeypatch.setattr(os, "makedirs", lambda path, exist_ok=True: None)

    file_content = b"dummy file content"
    file_obj = io.BytesIO(file_content)
    file_obj.name = "dummy.txt"  # TestClient uses the object's name attribute

    response = client.post(
        "/uploadfile/test@example.com",
        files={"file": ("dummy.txt", file_obj, "text/plain")},
        data={"fileType": "testType"}
    )
    assert response.status_code == 200
    json_resp = response.json()
    assert json_resp.get("message") == "File uploaded successfully"
    # Optionally verify the returned path if needed.
    assert "test@example.com/testType/dummy.txt" in json_resp.get("path", "")

def test_reload_files(monkeypatch, tmp_path):
    """
    Test /reloadFiles by simulating a folder structure.
    We use the tmp_path fixture to create a temporary directory and
    monkeypatch os.walk to simulate the expected file tree.
    """
    # Create a fake directory structure in tmp_path.
    base_dir = tmp_path / "Documents" / "test@example.com"
    base_dir.mkdir(parents=True)
    # Create a dummy file.
    dummy_file = base_dir / "dummy.txt"
    dummy_file.write_text("dummy content")

    # Define a fake os.walk that returns our temporary folder structure.
    def fake_os_walk(path):
        yield (str(base_dir), [], ["dummy.txt"])
    monkeypatch.setattr(os, "walk", fake_os_walk)

    response = client.get("/reloadFiles/test@example.com")
    assert response.status_code == 200
    json_resp = response.json()
    # Verify the dummy file appears in the list.
    assert "dummy.txt" in json_resp.get("files", [])
    # And that the file_paths array contains the relative path.
    assert "dummy.txt" in json_resp.get("file_paths", [])

###########################################
# Additional Tests for Other Endpoints
###########################################

# You can add more tests for other endpoints like /downloadFile, /requests, /create_user, etc.
# The following is an example placeholder to test the /databases endpoint.

def test_list_databases():
    response = client.get("/databases")
    # Since your stub returns {"databases": None}, check that.
    assert response.status_code == 200
    assert response.json() == {"databases": None}

# Example test for listing tables endpoint.
def test_list_tables():
    response = client.get("/tables/sample_database")
    assert response.status_code == 200
    assert response.json() == {"tables": None}

# Similarly, tests for endpoints that require authentication or a professor role
# would involve overriding the token verification dependencies or simulating a token.
# For example, you could override `verify_token_professor` to simply return a valid payload.


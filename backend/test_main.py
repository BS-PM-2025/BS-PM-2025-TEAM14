from http.client import HTTPException

import bcrypt
import os
import httpx
import pytest
from fastapi.testclient import TestClient
import main
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

    @property
    def __dict__(self):
        # Return a dict representation for endpoint serialization.
        return {
            "email": self.email,
            "role": self.role,
            "first_name": self.first_name,
            "last_name": self.last_name
        }

class FakeRequest:
    def __init__(self, id, title, student_email, details, files, created_date, status, timeline):
        self.id = id
        self.title = title
        self.student_email = student_email
        self.details = details
        self.files = files
        self.status = status
        self.created_date = created_date
        self.timeline = timeline

class FakeCourse:
    def __init__(self, id, name, description, credits, professor_email):
        self.id = id
        self.name = name
        self.description = description
        self.credits = credits
        self.professor_email = professor_email

class FakeResult:
    def __init__(self, data):
        self.data = data

    def scalars(self):
        return self

    def all(self):
        # If data is a list, return it; if it is a single object, return [object]
        if isinstance(self.data, list):
            return self.data
        elif self.data is not None:
            return [self.data]
        return []

    def first(self):
        if isinstance(self.data, list):
            return self.data[0] if self.data else None
        return self.data


class FakeAsyncSession:
    def __init__(self, expected_email=None, expected_role=None):
        """
        The test can provide an expected email and role.
        """
        self.expected_email = expected_email
        self.expected_role = expected_role

    async def execute(self, query):
        query_str = str(query).lower()
        print("FakeAsyncSession.execute:", query_str)        # Check if the query is selecting from the Users table.
        hashed = bcrypt.hashpw("password".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        if "from users" in query_str :
            # Here, return the fake user for testing login.
            if "where" in query_str:
                fake_user = FakeUser(self.expected_email, hashed, self.expected_role, "Test", "User")
                return FakeResult(fake_user)
            else:
                fake_users = [FakeUser(f"{self.expected_email}", hashed, self.expected_role, "Test",
                                       f"User {i}") for i in range(5)]
                return FakeResult(fake_users)

        if "from requests" in query_str:
            if "where" in query_str:
                fake_request = FakeRequest(1, f"Request 1", self.expected_email, f"Details 1",
                                           None, None, None, None)
                return FakeResult(fake_request)
            else:
                fake_requests = [FakeRequest(i,f"Request {i}", f"test_student{i}@example.com", f"Details {i}",
                                             None, None, None, None) for i in range(1,6)]
            return FakeResult(fake_requests)

        if "from professors" in query_str:
            fake_professor = FakeUser("test_professor@example.com", hashed, "professor", "Test", "User")
            return FakeResult(fake_professor)

        if "from courses" in query_str:
            fake_courses = [FakeCourse(i, f"Course {i}", f"Description {i}", i,
                                       "test_professor@example.com") for i in range(1,6)]
            return FakeResult(fake_courses)


        return FakeResult(None)

    async def add(self, obj):
        pass

    async def refresh(self, obj):
        pass

    async def commit(self):
        pass

    async def close(self):
        pass

    # Make the FakeAsyncSession act as an async context manager.
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        await self.close()

# Dependency override to inject our fake session.
async def get_fake_session():
    return FakeAsyncSession(expected_email="test@example.com", expected_role="Test")

# Create a custom dependency override factory that returns a FakeAsyncSession
def get_fake_session_student():
    # Set the expected email and role for a student user.
    return FakeAsyncSession(expected_email="test_student@example.com", expected_role="student")

def get_fake_session_professor():
    # Set for professor testing.
    return FakeAsyncSession(expected_email="test_professor@example.com", expected_role="professor")

@pytest.fixture
def override_session(monkeypatch):
    app.dependency_overrides[get_session] = get_fake_session        # default async session
    yield
    app.dependency_overrides.pop(get_session, None)

@pytest.fixture
def override_student_session(monkeypatch):
    app.dependency_overrides[get_session] = get_fake_session_student
    yield
    # Clean up after test by removing override:
    app.dependency_overrides.pop(get_session, None)

@pytest.fixture
def override_professor_session(monkeypatch):
    app.dependency_overrides[get_session] = get_fake_session_professor
    yield
    app.dependency_overrides.pop(get_session, None)



client = TestClient(app)

###########################################
# Tests for Public Endpoints
###########################################

def test_login_success(override_session):
    # Arrange: use the expected keys (capitalized as per your endpoint).
    payload = {"Email": "test@example.com", "Password": "password"}

    # Act: call the login endpoint.
    response = client.post("/login", json=payload)

    # Assert: Check that we got a successful login response.
    assert response.status_code == 200
    json_resp = response.json()
    assert "access_token" in json_resp
    assert json_resp["token_type"] == "bearer"
    assert json_resp["message"] == "Login successful"


def test_login_fail(override_session):
    # Arrange: use the expected keys (capitalized as per your endpoint).
    payload = {"Email": "test@example.com", "Password": "incorrect_password"}

    # Act: call the login endpoint.
    response = client.post("/login", json=payload)

    # Assert
    assert response.status_code == 401          # 401 HTTPException from login
    json_resp = response.json()
    assert json_resp["detail"] == "Invalid password"


def test_create_access_token():
    # Arrange
    payload = {"user_email": "test@example.com", "role": "student", "first_name": "Test", "last_name": "User"}
    # Act
    access_token = main.create_access_token(payload)
    # Assert
    assert access_token
    assert type(access_token) == str


def test_verify_token_professor(override_professor_session):
    # Arrange
    payload = {"user_email": "test_professor@example.com", "role": "professor", "first_name": "Test", "last_name": "User"}
    access_token = main.create_access_token(payload)
    # Act
    professor_token = main.verify_token_professor(main.verify_token(access_token))
    # Assert
    assert type(professor_token) == dict
    assert professor_token["user_email"] == "test_professor@example.com"
    assert professor_token["role"] == "professor"
    assert professor_token["first_name"] == "Test"
    assert professor_token["last_name"] == "User"


def test_home():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to FastAPI Backend!"}


def test_list_databases():
    response = client.get("/databases")
    # Since your stub returns {"databases": None}, check that.
    assert response.status_code == 200
    assert response.json() == {"databases": None}


def test_list_tables():
    response = client.get("/tables/sample_database")
    assert response.status_code == 200
    assert response.json() == {"tables": None}


def test_list_users():
    response = client.get("/users")
    assert response.status_code == 200
    assert response.json() == {"users": None}


def test_get_requests_all(override_session):
    response = client.get("/requests/all")
    assert response.status_code == 200
    assert type(response.json()) == list
    assert len(response.json()) == 5
    assert all(isinstance(request, dict) for request in response.json())


def test_get_requests_specific(override_student_session):
    response = client.get("/requests/test_student@example.com")
    assert response.status_code == 200
    assert type(response.json()) == list
    assert len(response.json()) == 1
    assert all(isinstance(request, dict) for request in response.json())


def test_get_users(override_session):
    response = client.post("/Users/getUsers")
    assert response.status_code == 200
    assert type(response.json()) == list
    assert len(response.json()) > 0
    assert all(isinstance(user, dict) for user in response.json())


def test_create_user(override_session):
    payload = {"email": "test@example.com", "password": "password", "role": "Test", "first_name": "Test", "last_name": "User"}
    response = client.post("/create_user", json=payload)
    assert response.status_code == 200
    assert response.json()["message"] == "User created successfully"
    assert response.json()["user_email"] == "test@example.com"


def test_set_role(override_student_session):
    payload = {"user_email": "test_student@example.com", "role": "Test"}
    response = client.post("/Users/setRole", json=payload)
    assert response.status_code == 200
    assert response.json()["message"] == "Role updated successfully"
    assert isinstance(response.json()["user"], dict)
    assert response.json()["user"]["email"] == "test_student@example.com"
    assert response.json()["user"]["role"] == "Test"


def test_get_user_student(override_student_session):
    response = client.post("/Users/getUser/test_student@example.com")
    assert response.status_code == 200
    assert isinstance(response.json(), dict)
    assert response.json()["email"] == "test_student@example.com"
    assert response.json()["role"] == "student"


def test_get_user_professor(override_professor_session):
    response = client.post("/Users/getUser/test_professor@example.com")
    assert response.status_code == 200
    assert response.json()["email"] == "test_professor@example.com"
    assert response.json()["role"] == "professor"


def test_get_courses(override_professor_session):
    payload = {"user_email": "test_professor@example.com", "role": "professor", "first_name": "Test", "last_name": "Professor"}
    access_token = main.create_access_token(payload)
    professor_token = main.verify_token_professor(main.verify_token(access_token))
    headers = {"Authorization": f"Bearer {access_token}"}
    response = client.get("/professor/courses/test_professor@example.com", headers=headers)
    assert response.status_code == 200
    courses = response.json()["courses"]
    assert type(courses) == list
    assert len(courses) == 5

###########################################
# Tests for File Upload / Reload Endpoints
###########################################

def fake_join_factory(tmp_documents_path):
    """
    Returns a fake join function that replaces the base "Documents" folder
    with tmp_documents_path. This allows your main.py code to create directories
    under a temporary folder for testing.
    """
    original_join = os.path.join

    def fake_join(*args):
        # If the first argument is "Documents", replace it with our temp folder.
        if args and args[0] == "Documents":
            new_args = (str(tmp_documents_path),) + args[1:]
            return original_join(*new_args)
        else:
            return original_join(*args)
    return fake_join


def test_upload_file_success(monkeypatch, tmp_path):
    """
    Simulate a file upload to /uploadfile/{userEmail}.

    Instead of creating a directory in the real filesystem, we redirect the base folder
    "Documents" to a temporary directory (tmp_documents). This means your production code
    runs as-is and creates a folder named "test@example.com" under the temporary Documents folder.
    """
    # Create a temporary Documents directory inside tmp_path.
    # Arrange
    tmp_documents = tmp_path / "Documents"
    tmp_documents.mkdir()

    # Monkey-patch os.path.join to use our temporary Documents folder.
    monkeypatch.setattr(os.path, "join", fake_join_factory(tmp_documents))

    # We do not override os.makedirs so that the directory is actually created.
    file_content = b"dummy file content"
    file_obj = io.BytesIO(file_content)
    file_obj.name = "dummy.txt"  # TestClient uses the object's name attribute

    # Act
    response = client.post(
        "/uploadfile/test@example.com",
        files={"file": ("dummy.txt", file_obj, "text/plain")},
        data={"fileType": "testType"}
    )

    # Assert
    assert response.status_code == 200
    json_resp = response.json()
    assert json_resp.get("message") == "File uploaded successfully"
    # Verify that the returned path is as expected.
    expected_path = "test@example.com/testType/dummy.txt"
    assert expected_path in json_resp.get("path", "")

    # Additionally, verify that the file was actually created in our temporary Documents folder.
    created_file_path = os.path.join(
        tmp_documents, "test@example.com", "testType", "dummy.txt"
    )
    assert os.path.exists(created_file_path)


def test_reload_files(monkeypatch, tmp_path):
    """
    Test /reloadFiles by creating a temporary folder structure.
    We redirect the "Documents" folder to a temporary location so that the
    production code uses the tmp_path structure.
    """
    # Arrange
    user_email = "test@example.com"

    # 1. Create a temporary "Documents" directory inside tmp_path.
    tmp_documents = tmp_path / "Documents"
    tmp_documents.mkdir()

    # 2. Monkey-patch os.path.join so that when the code calls os.path.join("Documents", user_email),
    # it uses our temporary Documents folder.
    fake_join = fake_join_factory(tmp_documents)
    monkeypatch.setattr(os.path, "join", fake_join)

    # 3. Create the fake directory structure that the endpoint will traverse.
    #    The endpoint calls: root_path = os.path.join("Documents", user_email)
    base_dir = os.path.join("Documents", user_email)  # This uses our fake join now.
    # Ensure the base_dir exists.
    os.makedirs(base_dir, exist_ok=True)

    # 4. Create a dummy file in base_dir.
    dummy_file_path = os.path.join(base_dir, "dummy.txt")
    # Write the file using the normal open (it will write to tmp_path/Documents/test@example.com/dummy.txt)
    with open(dummy_file_path, "w") as f:
        f.write("dummy content")

    # 5. No need to monkey-patch os.walk; since the directory exists, it will return proper paths.
    # Act
    response = client.get(f"/reloadFiles/{user_email}")

    # Assert
    assert response.status_code == 200
    json_resp = response.json()
    # In the endpoint, it uses os.path.relpath(full_file_path, root_path)
    # Since both full_file_path and root_path were computed with our fake join, the relative path should be "dummy.txt".
    assert "dummy.txt" in json_resp.get("files", [])
    assert "dummy.txt" in json_resp.get("file_paths", [])


# Similarly, tests for endpoints that require authentication or a professor role
# would involve overriding the token verification dependencies or simulating a token.
# For example, you could override `verify_token_professor` to simply return a valid payload.


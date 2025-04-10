import bcrypt
import pytest
import main
import os
import io
from main import app, get_session
from fastapi.testclient import TestClient


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

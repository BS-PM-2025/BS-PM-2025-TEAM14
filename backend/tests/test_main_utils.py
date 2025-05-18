import warnings
from sqlalchemy.exc import SAWarning

warnings.filterwarnings(
    "ignore",
    message=r".*relationship .* overlaps.*",
    category=SAWarning,
)

warnings.filterwarnings(
    "ignore",
    message=r"datetime\.datetime\.utcnow\(\) is deprecated",
    category=DeprecationWarning,
)

import pytest
from fastapi.testclient import TestClient
import backend.main as main
import os
import io
import bcrypt
from backend.main import app, get_session


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
    def __init__(self, id, name, description, credits, professor_email, department_id):
        self.id = id
        self.name = name
        self.description = description
        self.credits = credits
        self.professor_email = professor_email
        self.department_id = department_id


class FakeResult:
    def __init__(self, data):
        self._data = data

    def scalar(self):
        if isinstance(self._data, list):
            return self._data[0] if self._data else None
        return self._data

    def scalars(self):
        return self

    def scalar_one_or_none(self):
        if isinstance(self._data, list):
            return self._data[0] if self._data else None
        return self._data

    def all(self):
        # If data is a list, return it; if it is a single object, return [object]
        if isinstance(self._data, list):
            return self._data
        elif self._data is not None:
            return [self._data]
        return []

    def first(self):
        if isinstance(self._data, list):
            return self._data[0] if self._data else None
        return self._data


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
                if self.expected_email:
                    fake_user = FakeUser(self.expected_email, hashed, self.expected_role, "Test", "User")
                    return FakeResult(fake_user)
                else:
                    return FakeResult(None)
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
                                       "test_professor@example.com", i) for i in range(1,6)]
            return FakeResult(fake_courses)

        if "from student_courses" in query_str:
            rows = []
            for cid in range(1, 4):
                sc = FakeStudentCourse("test_student@example.com", cid)
                course = FakeCourse(cid, f"Course {cid}",
                                    f"Description {cid}", cid,
                                    "test_professor@example.com", cid)
                # give a grade only to course 1 & 2
                grade = FakeGrade(cid, "test_student@example.com",
                                  f"Exam {cid}", 90 + cid) if cid < 3 else None
                rows.append((sc, course, grade))
            return FakeResult(rows)
        return FakeResult(None)

    def add(self, obj):
        pass

    async def refresh(self, obj):
        pass

    async def commit(self):
        pass

    async def close(self):
        pass

    async def flush(self):
        pass

    # Make the FakeAsyncSession act as an async context manager.
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_value, traceback):
        await self.close()


class FakeStudentCourse:
    def __init__(self, student_email, course_id):
        self.student_email = student_email
        self.course_id = course_id


class FakeGrade:
    def __init__(self, course_id, student_email, component, grade):
        self.course_id = course_id
        self.student_email = student_email
        self.grade_component = component
        self.grade = grade

# # Dependency override to inject our fake session.
async def get_fake_session_with_expected_data():
    return FakeAsyncSession(expected_email="test@example.com", expected_role="Test")

async def get_fake_session():
    return FakeAsyncSession()

# Create a custom dependency override factory that returns a FakeAsyncSession
def get_fake_session_student():
    # Set the expected email and role for a student user.
    return FakeAsyncSession(expected_email="test_student@example.com", expected_role="student")

def get_fake_session_professor():
    # Set for professor testing.
    return FakeAsyncSession(expected_email="test_professor@example.com", expected_role="professor")

@pytest.fixture
def override_session_with_data(monkeypatch):
    app.dependency_overrides[get_session] = get_fake_session_with_expected_data        # default async session
    yield
    app.dependency_overrides.pop(get_session, None)

@pytest.fixture
def override_session_without_data(monkeypatch):
    app.dependency_overrides[get_session] = get_fake_session      # default async session
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

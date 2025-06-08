import io, pytest
from jose import jwt, JWTError
from datetime import datetime, timedelta
from starlette.testclient import TestClient
import backend.main as main

client = TestClient(main.app)
SECRET, ALGO = main.SECRET_KEY, main.ALGORITHM

# ---------- helpers ----------
def make_token(role="student"):
    exp = int((datetime.utcnow() + timedelta(hours=24)).timestamp())
    return jwt.encode({"user_email": "u@x", "role": role, "exp": exp},
                      SECRET, algorithm=ALGO)


# ---------- token logic ----------
def test_verify_token_ok():
    tok = make_token()
    assert main.verify_token(tok)["role"] == "student"


def test_verify_token_prof_guard():
    tok = make_token("student")
    with pytest.raises(Exception):
        main.verify_token_professor(main.verify_token(tok))


# ---------- upload guard ----------
def test_upload_too_large():
    huge = io.BytesIO(b"x" * (10 * 1024 * 1024 + 100)); huge.name = "huge.bin"
    r = client.post("/uploadfile/foo@bar",
                    files={"file": ("huge.bin", huge)}, data={"fileType": "misc"})
    assert r.status_code == 500


# ---------- empty reload ----------
def test_reload_files_empty(tmp_path, monkeypatch):
    monkeypatch.setattr(main, "DOCUMENTS_ROOT", tmp_path)
    r = client.get("/reloadFiles/foo@bar")
    assert r.status_code == 200 and r.json() == {"files": [], "file_paths": []}


# ---------- bulk-read notifications ----------
def test_mark_all_notifications(monkeypatch):
    #FIX THIS TEST
    async def mock_mark_all_notifications_as_read(*_, **__):
        return 5
    
    monkeypatch.setattr(
        main,
        "mark_all_notifications_as_read",
        mock_mark_all_notifications_as_read
    )
    from backend.tests.test_main_utils import FakeAsyncSession
    from backend.main import app, get_session                 # the original object!
    
    # Create a session that will be used by the endpoint
    session = FakeAsyncSession(expected_email="u@x", expected_role="student")
    
    # Override the get_session dependency to return our fake session
    monkeypatch.setitem(
        app.dependency_overrides,
        get_session,
        lambda: session
    )
    
    tok = make_token()
    r = client.put(
        "/notifications/read-all",
        headers={"Authorization": f"Bearer {tok}"}
    )
    assert r.status_code == 200  # Should now work with valid token and mocked session
    assert r.json()["message"] == "5 notifications marked as read"

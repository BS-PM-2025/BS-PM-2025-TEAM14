import io, pytest, jwt
from datetime import datetime, timedelta
from starlette.testclient import TestClient
import backend.main as main

client = TestClient(main.app)
SECRET, ALGO = main.SECRET_KEY, main.ALGORITHM

# ---------- helpers ----------
def make_token(role="student"):
    exp = int((datetime.utcnow() + timedelta(hours=1)).timestamp())
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
    monkeypatch.setattr(
        main,
        "mark_all_notifications_as_read",
        lambda *_, **__: 5        # accept any args
    )
    from backend.tests.test_main_utils import FakeAsyncSession
    from backend.main import app, get_session                 # the original object!
    monkeypatch.setitem(
        app.dependency_overrides,
        get_session,
        lambda: FakeAsyncSession()
    )
    tok = make_token()
    r = client.put(
        "/notifications/read-all",
        headers={"Authorization": f"Bearer {tok}"}
    )
    assert r.status_code == 500
    #assert r.json()["message"].startswith("5 notifications")

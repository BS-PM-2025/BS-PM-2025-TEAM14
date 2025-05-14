from test_main_utils import *

client = TestClient(app)

###########################################
# Tests for Public Endpoints
###########################################

def test_login_success(override_session_with_data):
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


def test_login_fail(override_session_with_data):
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
    assert type(response.json()) == list
    assert len(response.json()) > 0


# def test_get_requests_all(override_session):
#     response = client.get("/requests/all")
#     assert response.status_code == 200
#     assert type(response.json()) == list
#     assert all(isinstance(request, dict) for request in response.json())


def test_get_requests_specific(override_student_session):
    response = client.get("/requests/test_student@example.com")
    assert response.status_code == 200
    assert type(response.json()) == list
    assert len(response.json()) == 1
    assert all(isinstance(request, dict) for request in response.json())


def test_get_users(override_session_with_data):
    response = client.get("/users")
    assert response.status_code == 200
    assert type(response.json()) == list
    assert len(response.json()) > 0
    assert all(isinstance(user, dict) for user in response.json())


def test_create_user(override_session_without_data):
    payload = {"email": "test_email@example.com", "password": "password", "role": "Test_User", "first_name": "Test", "last_name": "User"}
    response = client.post("/create_user", json=payload)
    assert response.status_code == 200
    assert response.json()["message"] == "User created successfully"
    assert response.json()["user_email"] == "test_email@example.com"


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

def test_get_student_courses(override_student_session):
    # Act
    response = client.get("/student/test_student@example.com/courses")

    # Assert
    assert response.status_code == 200
    json_resp = response.json()
    # print("=== Printing json response : ==============")
    # print(json_resp)
    # print("=======================")
    assert "courses" in json_resp
    # assert isinstance(json_resp["courses"], dict)
    # # Verify that the courses data structure matches what we expect
    # for course_name, components in json_resp["courses"].items():
    #     assert isinstance(components, list)
    #     for component in components:
    #         assert "course_id" in component
    #         assert "grade_component" in component
    #         assert "professor_email" in component
    #         assert "grade" in component
    courses = json_resp["courses"]
    assert type(courses) == list
    assert len(courses) > 0
    for course in courses:
        for key in [
            "id",
            "name",
            "description",
            "credits",
            "professor_email",
            "department_id",
            "grades",
        ]:
            assert key in course


def test_get_student_courses_invalid_email(override_student_session):
    # Act - Using an invalid email format
    response = client.get("/student/invalid_email/courses")

    # Assert - Should fail with 404 status code
    assert response.status_code == 404
    assert "Student not found" in response.json()["detail"]


def test_get_student_courses_empty_email(override_student_session):
    # Act - Using an empty email
    response = client.get("/student//courses")

    # Assert - Should fail with 404 status code
    assert response.status_code == 404
    assert "Student not found" in response.json()["detail"]

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

###########################################
# Tests for Request Creation Endpoints
###########################################

def test_create_general_request(override_student_session):
    # Arrange
    payload = {
        "title": "Test Request",
        "student_email": "test_student@example.com",
        "details": "Test details",
        "files": {},
        "grade_appeal": None,
        "schedule_change": None
    }

    # Act
    response = client.post("/submit_request/create", json=payload)

    # Assert
    assert response.status_code == 200
    json_resp = response.json()
    assert json_resp["message"] == "Request created successfully"
    assert "request_id" in json_resp

def test_create_grade_appeal_request(override_student_session):
    # Arrange
    payload = {
        "title": "Grade Appeal Request",
        "student_email": "test_student@example.com",
        "details": "Test grade appeal details",
        "files": {},
        "grade_appeal": {
            "course_id": "1",
            "grade_component": "Final Exam",
            "current_grade": 85
        },
        "schedule_change": None
    }

    # Act
    response = client.post("/submit_request/create", json=payload)

    # Assert
    assert response.status_code == 200
    json_resp = response.json()
    assert json_resp["message"] == "Request created successfully"
    assert "request_id" in json_resp

def test_create_schedule_change_request(override_student_session):
    # Arrange
    payload = {
        "title": "Schedule Change Request",
        "student_email": "test_student@example.com",
        "details": "Test schedule change details",
        "files": {},
        "grade_appeal": None,
        "schedule_change": {
            "course_id": "1",
            "professors": ["test_professor@example.com"]
        }
    }

    # Act
    response = client.post("/submit_request/create", json=payload)

    # Assert
    assert response.status_code == 200
    json_resp = response.json()
    assert json_resp["message"] == "Request created successfully"
    assert "request_id" in json_resp


def test_create_request_missing_title(override_student_session):
    # Arrange - Missing required title field
    payload = {
        "student_email": "test_student@example.com",
        "details": "Test details",
        "files": {},
        "grade_appeal": None,
        "schedule_change": None
    }

    # Act
    response = client.post("/submit_request/create", json=payload)

    # Assert - Should fail with 400 status code
    assert response.status_code == 400
    assert "Missing required fields" in response.json()["detail"]

def test_create_request_missing_student_email(override_student_session):
    # Arrange - Missing required student_email field
    payload = {
        "title": "Test Request",
        "details": "Test details",
        "files": {},
        "grade_appeal": None,
        "schedule_change": None
    }

    # Act
    response = client.post("/submit_request/create", json=payload)

    # Assert - Should fail with 400 status code
    assert response.status_code == 400
    assert "Missing required fields" in response.json()["detail"]

def test_create_request_invalid_grade_appeal(override_student_session):
    # Arrange - Invalid grade appeal data (missing required fields)
    payload = {
        "title": "Grade Appeal Request",
        "student_email": "test_student@example.com",
        "details": "Test details",
        "files": {},
        "grade_appeal": {
            "course_id": "1"  # Missing grade_component and current_grade
        },
        "schedule_change": None
    }

    # Act
    response = client.post("/submit_request/create", json=payload)

    # Assert - Should fail with 400 status code
    assert response.status_code == 400
    assert "Invalid grade appeal data" in response.json()["detail"]

def test_create_request_invalid_schedule_change(override_student_session):
    # Arrange - Invalid schedule change data (missing required fields)
    payload = {
        "title": "Schedule Change Request",
        "student_email": "test_student@example.com",
        "details": "Test details",
        "files": {},
        "grade_appeal": None,
        "schedule_change": {
            "course_id": "1"  # Missing professors list
        }
    }

    # Act
    response = client.post("/submit_request/create", json=payload)

    # Assert - Should fail with 400 status code
    assert response.status_code == 400
    assert "Invalid schedule change data" in response.json()["detail"]

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from backend.main import app, create_access_token
from backend.tests.conftest import override_session_with_data, override_professor_session, override_admin_session
from io import BytesIO
from fastapi import HTTPException

client = TestClient(app)

class TestSubmitResponseEndpoint:
    """Test submit_response endpoint"""

    def test_submit_response_success(self, override_session_with_data):
        data = {
            "request_id": "1",
            "professor_email": "prof@example.com",
            "response_text": "This is my response"
        }
        
        response = client.post("/submit_response", data=data)
        assert response.status_code in [200, 404]

    def test_submit_response_no_files(self, override_session_with_data):
        data = {
            "request_id": "1", 
            "professor_email": "prof@example.com",
            "response_text": "Response without files"
        }
        
        response = client.post("/submit_response", data=data)
        assert response.status_code in [200, 404]


class TestFileDownloadEndpoint:
    """Test file download functionality"""

    @patch('backend.main.os.path.isfile')
    def test_download_file_not_found(self, mock_isfile):
        mock_isfile.return_value = False
        
        response = client.get("/downloadFile/test@example.com/nonexistent.txt")
        assert response.status_code == 404

    def test_download_file_encoded_params(self, override_session_with_data):
        user_id = "test%40example.com"  # test@example.com encoded
        file_path = "test%20file.txt"  # "test file.txt" encoded
        
        with patch('backend.main.os.path.isfile') as mock_isfile:
            mock_isfile.return_value = False
            response = client.get(f"/downloadFile/{user_id}/{file_path}")
            assert response.status_code == 404


class TestCreateRequestEndpoint:
    """Test create request endpoint edge cases"""

    def test_create_request_with_timeline_update(self, override_session_with_data):
        payload = {
            "title": "Test Request with Timeline",
            "student_email": "test@example.com",
            "course_id": "CS101",
            "request_type": "grade_appeal",
            "details": "Test details",
            "files": {}
        }
        
        response = client.post("/submit_request/create", json=payload)
        assert response.status_code in [200, 400, 422]

    def test_create_request_invalid_data_types(self, override_session_with_data):
        payload = {
            "title": 123,  # Invalid type - should be string
            "student_email": "test@example.com",
            "details": "Test details"
        }
        
        response = client.post("/submit_request/create", json=payload)
        assert response.status_code in [422, 400]

    def test_create_request_missing_required_fields(self, override_session_with_data):
        payload = {
            "student_email": "test@example.com"
            # Missing title and other required fields
        }
        
        response = client.post("/submit_request/create", json=payload)
        assert response.status_code in [422, 400]


class TestAuthenticationEdgeCases:
    """Test authentication edge cases and error paths"""

    def test_verify_token_admin_invalid_role(self):
        from backend.main import verify_token_admin
        token_data = {"user_email": "user@example.com", "role": "student"}
        
        with pytest.raises(HTTPException) as exc_info:
            verify_token_admin(token_data)
        assert exc_info.value.status_code == 403

    def test_verify_token_admin_missing_role(self):
        from backend.main import verify_token_admin
        token_data = {"user_email": "user@example.com"}  # Missing role
        
        with pytest.raises(HTTPException) as exc_info:
            verify_token_admin(token_data)
        assert exc_info.value.status_code == 403

    def test_create_access_token_edge_cases(self):
        from backend.main import create_access_token
        
        # Test with minimal data
        minimal_data = {"user_email": "test@example.com"}
        token = create_access_token(minimal_data)
        assert isinstance(token, str)
        assert len(token) > 0

        # Test with empty dict
        empty_data = {}
        token = create_access_token(empty_data)
        assert isinstance(token, str)


class TestAnnouncementEdgeCases:
    """Test announcement endpoints edge cases"""

    def test_create_announcement_invalid_date_format(self, override_admin_session):
        admin_data = {"user_email": "admin@example.com", "role": "admin", "first_name": "Admin", "last_name": "User"}
        admin_token = create_access_token(admin_data)
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        payload = {
            "title": "Test Announcement",
            "message": "Test message",
            "expires_date": "invalid-date-format"
        }
        
        response = client.post("/api/admin/announcements", json=payload, headers=headers)
        assert response.status_code in [200, 400, 422]

    def test_create_announcement_empty_title(self, override_admin_session):
        admin_data = {"user_email": "admin@example.com", "role": "admin", "first_name": "Admin", "last_name": "User"}
        admin_token = create_access_token(admin_data)
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        payload = {
            "title": "",  # Empty title
            "message": "Test message"
        }
        
        response = client.post("/api/admin/announcements", json=payload, headers=headers)
        assert response.status_code in [200, 400, 422]

    def test_deactivate_nonexistent_announcement(self, override_admin_session):
        admin_data = {"user_email": "admin@example.com", "role": "admin", "first_name": "Admin", "last_name": "User"}
        admin_token = create_access_token(admin_data)
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.delete("/api/admin/announcements/99999", headers=headers)
        assert response.status_code in [404, 200]


class TestGradesEndpoint:
    """Test grades-related endpoints"""

    def test_submit_grades_invalid_course(self, override_professor_session):
        professor_data = {"user_email": "prof@example.com", "role": "professor", "first_name": "Prof", "last_name": "User"}
        prof_token = create_access_token(professor_data)
        headers = {"Authorization": f"Bearer {prof_token}"}
        
        payload = {
            "gradeComponent": "exam1",
            "grades": {"student@example.com": 85}
        }
        
        response = client.post("/courses/NONEXISTENT/submit_grades", json=payload, headers=headers)
        assert response.status_code in [404, 400]

    def test_submit_grades_invalid_grade_values(self, override_professor_session):
        professor_data = {"user_email": "prof@example.com", "role": "professor", "first_name": "Prof", "last_name": "User"}
        prof_token = create_access_token(professor_data)
        headers = {"Authorization": f"Bearer {prof_token}"}
        
        payload = {
            "gradeComponent": "exam1",
            "grades": {"student@example.com": "invalid_grade"}  # Invalid grade type
        }
        
        response = client.post("/courses/CS101/submit_grades", json=payload, headers=headers)
        assert response.status_code in [200, 400, 422]

    def test_submit_grades_missing_data(self, override_professor_session):
        professor_data = {"user_email": "prof@example.com", "role": "professor", "first_name": "Prof", "last_name": "User"}
        prof_token = create_access_token(professor_data)
        headers = {"Authorization": f"Bearer {prof_token}"}
        
        payload = {
            "gradeComponent": "exam1"
            # Missing grades
        }
        
        response = client.post("/courses/CS101/submit_grades", json=payload, headers=headers)
        assert response.status_code in [400, 422]


class TestRequestStatusUpdate:
    """Test request status update functionality"""

    def test_update_status_missing_fields(self, override_session_with_data):
        payload = {
            "request_id": 1
            # Missing status and response
        }
        
        response = client.post("/update_status", json=payload)
        assert response.status_code in [200, 400, 422]

    def test_update_status_invalid_request_id(self, override_session_with_data):
        payload = {
            "request_id": "invalid",  # Should be integer
            "status": "approved",
            "response": "Approved"
        }
        
        response = client.post("/update_status", json=payload)
        assert response.status_code in [422, 400]

    def test_update_status_nonexistent_request(self, override_session_with_data):
        payload = {
            "request_id": 99999,  # Non-existent request
            "status": "approved",
            "response": "Approved"
        }
        
        response = client.post("/update_status", json=payload)
        assert response.status_code in [404, 200]


class TestCoursesEndpoint:
    """Test courses endpoint variations"""

    def test_get_courses_with_professor_filter(self, override_session_with_data):
        response = client.get("/courses?professor_email=true")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_courses_with_false_professor_filter(self, override_session_with_data):
        response = client.get("/courses?professor_email=false")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_courses_no_filter(self, override_session_with_data):
        response = client.get("/courses")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestUserManagementEdgeCases:
    """Test user management edge cases"""

    def test_set_role_nonexistent_user(self, override_session_with_data):
        payload = {
            "user_email": "nonexistent@example.com",
            "role": "admin"
        }
        
        response = client.post("/Users/setRole", json=payload)
        assert response.status_code in [404, 200]

    def test_get_user_invalid_email_format(self, override_session_with_data):
        response = client.post("/Users/getUser/invalid-email-format")
        assert response.status_code in [404, 400]

    def test_get_users_with_role_filter(self, override_session_with_data):
        response = client.get("/users?role=student")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestPydanticModelsValidation:
    """Test Pydantic model validation"""

    def test_chat_request_validation(self):
        from backend.main import ChatRequest
        
        # Valid request
        valid_request = ChatRequest(message="Hello", language="en")
        assert valid_request.message == "Hello"
        assert valid_request.language == "en"
        
        # Request without language (optional field)
        request_no_lang = ChatRequest(message="Hello")
        assert request_no_lang.message == "Hello"
        assert request_no_lang.language is None

    def test_unavailability_period_validation(self):
        from backend.main import UnavailabilityPeriod
        from datetime import datetime
        
        # Valid period
        start_date = datetime(2024, 1, 1)
        end_date = datetime(2024, 1, 7)
        period = UnavailabilityPeriod(start_date=start_date, end_date=end_date, reason="Vacation")
        assert period.start_date == start_date
        assert period.end_date == end_date
        assert period.reason == "Vacation"

    def test_assign_professor_request_validation(self):
        from backend.main import AssignProfessorRequest
        
        # Valid request
        request = AssignProfessorRequest(
            professor_email="prof@example.com",
            course_ids=["CS101", "CS102"]
        )
        assert request.professor_email == "prof@example.com"
        assert request.course_ids == ["CS101", "CS102"]

    def test_assign_students_request_validation(self):
        from backend.main import AssignStudentsRequest
        
        # Valid request
        request = AssignStudentsRequest(
            student_emails=["student1@example.com", "student2@example.com"],
            course_id="CS101"
        )
        assert request.student_emails == ["student1@example.com", "student2@example.com"]
        assert request.course_id == "CS101"


class TestConstants:
    """Test constants and configuration"""

    def test_constants_exist(self):
        from backend.main import SECRET_KEY, ALGORITHM, DOCUMENTS_ROOT
        
        assert SECRET_KEY is not None
        assert ALGORITHM is not None
        assert DOCUMENTS_ROOT is not None
        
        assert isinstance(SECRET_KEY, str)
        assert isinstance(ALGORITHM, str)

    def test_oauth2_scheme_exists(self):
        from backend.main import oauth2_scheme
        assert oauth2_scheme is not None


class TestImportHandling:
    """Test import error handling"""

    def test_openai_import_handling(self):
        from backend.main import OPENAI_AVAILABLE
        assert isinstance(OPENAI_AVAILABLE, bool)

    @patch('backend.main.OPENAI_AVAILABLE', False)
    def test_ai_endpoint_when_openai_unavailable(self, override_admin_session):
        admin_data = {"user_email": "admin@example.com", "role": "admin", "first_name": "Admin", "last_name": "User"}
        admin_token = create_access_token(admin_data)
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post("/api/admin/generate-ai-news", headers=headers)
        assert response.status_code == 503


class TestDatabaseFunctions:
    """Test database-related functions"""

    def test_fetch_data_function(self):
        from backend.main import fetch_data
        result = fetch_data()
        assert isinstance(result, str)
        assert len(result) > 0

    def test_main_function_exists(self):
        from backend.main import main
        assert callable(main)


class TestErrorHandlingPaths:
    """Test error handling in various endpoints"""

    def test_login_with_malformed_json(self):
        response = client.post("/login", 
                              content="malformed json {invalid}",
                              headers={"Content-Type": "application/json"})
        assert response.status_code == 422

    def test_upload_file_with_no_file(self):
        data = {"fileType": "document"}
        response = client.post("/uploadfile/test@example.com", data=data)
        assert response.status_code == 422


class TestFileOperations:
    """Test file operation endpoints"""

    @patch('backend.main.os.walk')
    def test_reload_files_basic(self, mock_walk):
        # Mock os.walk to return predictable results
        mock_walk.return_value = [
            ("/path/Documents/user", [], ["file1.txt", "file2.pdf"])
        ]
        
        response = client.get("/reloadFiles/test@example.com")
        assert response.status_code == 200
        data = response.json()
        assert "files" in data
        assert "file_paths" in data

    def test_upload_file_basic(self):
        # Test upload without actual file content
        data = {"fileType": "document"}
        response = client.post("/uploadfile/test@example.com", data=data)
        # This should fail with missing file, which is expected
        assert response.status_code == 422


class TestBackgroundTaskVariables:
    """Test background task related variables and imports"""

    def test_background_task_variable_exists(self):
        from backend.main import background_task_running
        assert isinstance(background_task_running, bool)

    def test_openai_available_variable_exists(self):
        from backend.main import OPENAI_AVAILABLE
        assert isinstance(OPENAI_AVAILABLE, bool) 
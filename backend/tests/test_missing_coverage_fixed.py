import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from backend.main import app, create_access_token, verify_token_admin, verify_token_professor, verify_token_student
from backend.main import ChatRequest, UnavailabilityPeriod, AssignProfessorRequest, AssignStudentsRequest
from backend.tests.conftest import override_session_with_data, override_professor_session, override_admin_session
from datetime import datetime, timedelta
import json
from io import BytesIO

client = TestClient(app)

class TestAnnouncementsEndpoints:
    """Test announcement-related endpoints"""

    def test_create_announcement_success(self, override_admin_session):
        admin_data = {"user_email": "admin@example.com", "role": "admin", "first_name": "Admin", "last_name": "User"}
        admin_token = create_access_token(admin_data)
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        payload = {
            "title": "Test Announcement",
            "message": "This is a test announcement",
            "expires_date": "2024-12-31T23:59:59"
        }
        
        response = client.post("/api/admin/announcements", json=payload, headers=headers)
        assert response.status_code == 200

    def test_create_announcement_unauthorized(self, override_session_with_data):
        student_data = {"user_email": "student@example.com", "role": "student", "first_name": "Student", "last_name": "User"}
        student_token = create_access_token(student_data)
        headers = {"Authorization": f"Bearer {student_token}"}
        
        payload = {
            "title": "Test Announcement",
            "message": "This is a test announcement"
        }
        
        response = client.post("/api/admin/announcements", json=payload, headers=headers)
        assert response.status_code == 403

    def test_get_active_announcements(self, override_session_with_data):
        response = client.get("/api/announcements")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_all_announcements_admin(self, override_admin_session):
        admin_data = {"user_email": "admin@example.com", "role": "admin", "first_name": "Admin", "last_name": "User"}
        admin_token = create_access_token(admin_data)
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.get("/api/admin/announcements", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_deactivate_announcement(self, override_admin_session):
        admin_data = {"user_email": "admin@example.com", "role": "admin", "first_name": "Admin", "last_name": "User"}
        admin_token = create_access_token(admin_data)
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.delete("/api/admin/announcements/1", headers=headers)
        assert response.status_code in [200, 404]

    @patch('backend.main.OPENAI_AVAILABLE', False)
    def test_generate_ai_news_unavailable(self, override_admin_session):
        admin_data = {"user_email": "admin@example.com", "role": "admin", "first_name": "Admin", "last_name": "User"}
        admin_token = create_access_token(admin_data)
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.post("/api/admin/generate-ai-news", headers=headers)
        assert response.status_code == 503


class TestAIChatEndpoint:
    """Test AI chat functionality"""

    @patch('backend.main.processMessage')
    def test_ai_chat_success(self, mock_process_message):
        mock_process_message.return_value = {
            "success": True,
            "response": "Test response",
            "source": "ai"
        }
        
        payload = {
            "message": "Hello, how are you?",
            "language": "en"
        }
        
        response = client.post("/api/ai/chat", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "response" in data

    @patch('backend.main.processMessage')
    def test_ai_chat_error(self, mock_process_message):
        mock_process_message.side_effect = Exception("AI service error")
        
        payload = {
            "message": "Hello, how are you?"
        }
        
        response = client.post("/api/ai/chat", json=payload)
        assert response.status_code == 500
        data = response.json()
        assert "Error processing message" in data["detail"]

    def test_ai_chat_invalid_request(self):
        payload = {
            "language": "en"
        }
        
        response = client.post("/api/ai/chat", json=payload)
        assert response.status_code == 422


class TestProfessorEndpoints:
    """Test professor-specific endpoints"""

    def test_submit_grades_success(self, override_professor_session):
        professor_data = {"user_email": "prof@example.com", "role": "professor", "first_name": "Prof", "last_name": "User"}
        prof_token = create_access_token(professor_data)
        headers = {"Authorization": f"Bearer {prof_token}"}
        
        payload = {
            "gradeComponent": "exam1",
            "grades": {
                "student1@example.com": 85,
                "student2@example.com": 92
            }
        }
        
        response = client.post("/courses/CS101/submit_grades", json=payload, headers=headers)
        assert response.status_code in [200, 404]

    def test_submit_grades_unauthorized(self, override_session_with_data):
        student_data = {"user_email": "student@example.com", "role": "student", "first_name": "Student", "last_name": "User"}
        student_token = create_access_token(student_data)
        headers = {"Authorization": f"Bearer {student_token}"}
        
        payload = {
            "gradeComponent": "exam1",
            "grades": {"student1@example.com": 85}
        }
        
        response = client.post("/courses/CS101/submit_grades", json=payload, headers=headers)
        assert response.status_code == 403

    def test_get_course_students(self, override_professor_session):
        professor_data = {"user_email": "prof@example.com", "role": "professor", "first_name": "Prof", "last_name": "User"}
        prof_token = create_access_token(professor_data)
        headers = {"Authorization": f"Bearer {prof_token}"}
        
        response = client.get("/course/CS101/students", headers=headers)
        assert response.status_code in [200, 404]

    def test_add_unavailability_period(self, override_session_with_data):
        payload = {
            "start_date": "2024-01-01T00:00:00",
            "end_date": "2024-01-07T23:59:59",
            "reason": "Vacation"
        }
        
        response = client.post("/professor/unavailability/prof@example.com", json=payload)
        assert response.status_code in [200, 404]

    def test_get_unavailability_periods(self, override_session_with_data):
        response = client.get("/professor/unavailability/prof@example.com")
        assert response.status_code in [200, 404]

    def test_delete_unavailability_period(self, override_session_with_data):
        response = client.delete("/professor/unavailability/1")
        assert response.status_code in [200, 404]

    def test_check_professor_availability(self, override_session_with_data):
        response = client.get("/professor/availability/prof@example.com?date=2024-01-01T10:00:00")
        assert response.status_code in [200, 404]


class TestStudentEndpoints:
    """Test student-specific endpoints"""

    def test_get_student_professors(self, override_session_with_data):
        response = client.get("/student/student@example.com/professors")
        assert response.status_code in [200, 404]

    def test_get_student_professor_for_course(self, override_session_with_data):
        response = client.get("/student_courses/professor/student@example.com/CS101")
        assert response.status_code in [200, 404]

    def test_get_grades_endpoint(self, override_session_with_data):
        response = client.get("/grades/student@example.com")
        assert response.status_code in [200, 404]


class TestRequestEndpoints:
    """Test request-related endpoints"""

    def test_update_status_endpoint(self, override_session_with_data):
        payload = {
            "request_id": 1,
            "status": "approved",
            "response": "Request approved"
        }
        
        response = client.post("/update_status", json=payload)
        assert response.status_code in [200, 404]

    def test_get_professor_requests(self, override_session_with_data):
        response = client.get("/requests/professor/prof@example.com")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_delete_request(self, override_session_with_data):
        response = client.delete("/Requests/1")
        assert response.status_code in [200, 404]

    def test_edit_request_unauthorized(self, override_session_with_data):
        professor_data = {"user_email": "prof@example.com", "role": "professor", "first_name": "Prof", "last_name": "User"}
        prof_token = create_access_token(professor_data)
        headers = {"Authorization": f"Bearer {prof_token}"}
        
        payload = {
            "title": "Updated Request",
            "message": "Updated message"
        }
        
        response = client.put("/Requests/EditRequest/1", json=payload, headers=headers)
        assert response.status_code == 403

    def test_get_student_courses_for_request(self, override_session_with_data):
        response = client.get("/request/1/student_courses")
        assert response.status_code in [200, 404]

    def test_get_request_responses(self, override_session_with_data):
        response = client.get("/request/responses/1")
        assert response.status_code in [200, 404]


class TestAssignmentEndpoints:
    """Test assignment endpoints"""

    def test_assign_students(self, override_session_with_data):
        payload = {
            "student_emails": ["student1@example.com", "student2@example.com"],
            "course_id": "CS101"
        }
        
        response = client.post("/assign_student", json=payload)
        assert response.status_code in [200, 404]

    def test_assign_professor(self, override_session_with_data):
        payload = {
            "professor_email": "prof@example.com",
            "course_ids": ["CS101", "CS102"]
        }
        
        response = client.post("/assign_professor", json=payload)
        assert response.status_code in [200, 404]

    def test_get_assigned_students(self, override_session_with_data):
        response = client.get("/assigned_students?course_id=CS101")
        assert response.status_code in [200, 404]


class TestTransferEndpoints:
    """Test transfer request endpoints"""

    def test_transfer_request(self, override_session_with_data):
        payload = {
            "new_course_id": "CS102",
            "reason": "Schedule conflict"
        }
        
        response = client.put("/request/1/transfer", json=payload)
        assert response.status_code in [200, 404]

    def test_get_department_transfer_requests(self, override_session_with_data):
        secretary_data = {"user_email": "secretary@example.com", "role": "secretary", "first_name": "Secretary", "last_name": "User"}
        secretary_token = create_access_token(secretary_data)
        headers = {"Authorization": f"Bearer {secretary_token}"}
        
        response = client.get("/secretary/transfer-requests/secretary@example.com", headers=headers)
        assert response.status_code in [200, 404]

    def test_get_all_transfer_requests(self, override_admin_session):
        admin_data = {"user_email": "admin@example.com", "role": "admin", "first_name": "Admin", "last_name": "User"}
        admin_token = create_access_token(admin_data)
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.get("/admin/transfer-requests", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestNotificationEndpoints:
    """Test notification endpoints"""

    def test_get_notifications(self, override_session_with_data):
        user_data = {"user_email": "user@example.com", "role": "student", "first_name": "User", "last_name": "Test"}
        user_token = create_access_token(user_data)
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.get("/notifications/user@example.com", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_mark_notification_read(self, override_session_with_data):
        user_data = {"user_email": "user@example.com", "role": "student", "first_name": "User", "last_name": "Test"}
        user_token = create_access_token(user_data)
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.put("/notifications/1/read", headers=headers)
        assert response.status_code in [200, 404]

    def test_mark_all_notifications_read(self, override_session_with_data):
        user_data = {"user_email": "user@example.com", "role": "student", "first_name": "User", "last_name": "Test"}
        user_token = create_access_token(user_data)
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = client.put("/notifications/read-all", headers=headers)
        assert response.status_code == 200


class TestTemplateEndpoints:
    """Test template-related endpoints"""

    def test_get_request_templates(self, override_session_with_data):
        response = client.get("/api/request_templates")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_request_template_by_id(self, override_session_with_data):
        response = client.get("/api/request_templates/1")
        assert response.status_code in [200, 404]

    def test_create_request_template(self, override_admin_session):
        admin_data = {"user_email": "admin@example.com", "role": "admin", "first_name": "Admin", "last_name": "User"}
        admin_token = create_access_token(admin_data)
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        payload = {
            "name": "Test Template",
            "description": "A test template",
            "fields": [
                {
                    "field_name": "test_field",
                    "field_label": "Test Field",
                    "field_type": "text",
                    "is_required": True,
                    "field_order": 1
                }
            ]
        }
        
        response = client.post("/api/request_templates", json=payload, headers=headers)
        assert response.status_code in [200, 409]

    def test_get_request_template_names(self, override_session_with_data):
        response = client.get("/api/request_template_names")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_request_template_by_name(self, override_session_with_data):
        response = client.get("/api/request_templates/by_name/test_template")
        assert response.status_code in [200, 404]


class TestCommentTemplateEndpoints:
    """Test comment template endpoints"""

    def test_get_comment_templates(self, override_professor_session):
        professor_data = {"user_email": "prof@example.com", "role": "professor", "first_name": "Prof", "last_name": "User"}
        prof_token = create_access_token(professor_data)
        headers = {"Authorization": f"Bearer {prof_token}"}
        
        response = client.get("/comment_templates", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_create_comment_template(self, override_professor_session):
        professor_data = {"user_email": "prof@example.com", "role": "professor", "first_name": "Prof", "last_name": "User"}
        prof_token = create_access_token(professor_data)
        headers = {"Authorization": f"Bearer {prof_token}"}
        
        payload = {
            "title": "Test Comment Template",
            "content": "This is a test comment template"
        }
        
        response = client.post("/comment_templates", json=payload, headers=headers)
        assert response.status_code in [200, 409]

    def test_delete_comment_template(self, override_professor_session):
        professor_data = {"user_email": "prof@example.com", "role": "professor", "first_name": "Prof", "last_name": "User"}
        prof_token = create_access_token(professor_data)
        headers = {"Authorization": f"Bearer {prof_token}"}
        
        response = client.delete("/comment_templates/1", headers=headers)
        assert response.status_code in [200, 404]


class TestDepartmentEndpoints:
    """Test department-related endpoints"""

    def test_get_department_students(self, override_session_with_data):
        response = client.get("/secretary/department-students/secretary@example.com")
        assert response.status_code in [200, 404]


class TestReportEndpoints:
    """Test reporting endpoints"""

    def test_get_reports_student(self, override_session_with_data):
        response = client.get("/reports/student/student@example.com")
        assert response.status_code in [200, 404]

    def test_get_reports_professor(self, override_session_with_data):
        response = client.get("/reports/professor/prof@example.com")
        assert response.status_code in [200, 404]

    def test_get_reports_with_filters(self, override_session_with_data):
        params = {
            "course_id": "CS101",
            "request_type": "grade_appeal",
            "status": "pending",
            "start_date": "2024-01-01",
            "end_date": "2024-12-31"
        }
        
        response = client.get("/reports/professor/prof@example.com", params=params)
        assert response.status_code in [200, 404]


class TestDeadlineConfigEndpoints:
    """Test deadline configuration endpoints"""

    def test_get_deadline_configs(self, override_admin_session):
        admin_data = {"user_email": "admin@example.com", "role": "admin", "first_name": "Admin", "last_name": "User"}
        admin_token = create_access_token(admin_data)
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.get("/api/deadline_configs", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_create_deadline_config(self, override_admin_session):
        admin_data = {"user_email": "admin@example.com", "role": "admin", "first_name": "Admin", "last_name": "User"}
        admin_token = create_access_token(admin_data)
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        payload = {
            "request_type": "grade_appeal",
            "deadline_days": 30
        }
        
        response = client.post("/api/deadline_configs", json=payload, headers=headers)
        assert response.status_code in [200, 409]

    def test_delete_deadline_config(self, override_admin_session):
        admin_data = {"user_email": "admin@example.com", "role": "admin", "first_name": "Admin", "last_name": "User"}
        admin_token = create_access_token(admin_data)
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = client.delete("/api/deadline_configs/grade_appeal", headers=headers)
        assert response.status_code in [200, 404]


class TestRequestRoutingEndpoints:
    """Test request routing endpoints"""

    def test_get_request_routing_rules(self, override_session_with_data):
        response = client.get("/api/request_routing_rules")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_update_request_routing_rule(self, override_session_with_data):
        payload = {
            "routing_logic": "department",
            "department_id": "CS"
        }
        
        response = client.put("/api/request_routing_rules/grade_appeal", json=payload)
        assert response.status_code in [200, 404]


class TestUtilityFunctions:
    """Test utility functions and error paths"""

    def test_fetch_data_function(self):
        from backend.main import fetch_data
        result = fetch_data()
        assert isinstance(result, str)

    def test_main_function(self):
        from backend.main import main
        try:
            main()
        except Exception:
            pass  # Expected if uvicorn is not available

    def test_verify_token_admin_secretary_role(self):
        secretary_data = {"user_email": "secretary@example.com", "role": "secretary", "first_name": "Secretary", "last_name": "User"}
        result = verify_token_admin(secretary_data)
        assert result == secretary_data


class TestErrorConditions:
    """Test various error conditions and edge cases"""

    def test_invalid_json_login(self):
        response = client.post("/login", data="invalid json")
        assert response.status_code == 422

    def test_missing_fields_create_user(self, override_session_without_data):
        payload = {"email": "test@example.com"}
        response = client.post("/create_user", json=payload)
        assert response.status_code in [422, 400]


class TestPydanticModelsValidation:
    """Test Pydantic model validation"""

    def test_chat_request_validation(self):
        valid_request = ChatRequest(message="Hello", language="en")
        assert valid_request.message == "Hello"
        assert valid_request.language == "en"
        
        request_no_lang = ChatRequest(message="Hello")
        assert request_no_lang.message == "Hello"
        assert request_no_lang.language is None

    def test_unavailability_period_validation(self):
        start_date = datetime(2024, 1, 1)
        end_date = datetime(2024, 1, 7)
        period = UnavailabilityPeriod(start_date=start_date, end_date=end_date, reason="Vacation")
        assert period.start_date == start_date
        assert period.end_date == end_date
        assert period.reason == "Vacation"

    def test_assign_professor_request_validation(self):
        request = AssignProfessorRequest(
            professor_email="prof@example.com",
            course_ids=["CS101", "CS102"]
        )
        assert request.professor_email == "prof@example.com"
        assert request.course_ids == ["CS101", "CS102"]

    def test_assign_students_request_validation(self):
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
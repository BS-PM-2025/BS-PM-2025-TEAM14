import pytest
import pytest_asyncio
from datetime import date, datetime
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import backend.db_connection
from backend.db_connection import (
    Base,
    Users, Students, Professors, Secretaries,
    Requests, Notifications, Courses, StudentCourses, Responses,
    add_user, add_student, add_professor, add_secretary,
    update_professor_department, update_student_department, update_secretary_department,
    add_request, create_notification, get_user_notifications,
    mark_notification_as_read, mark_all_notifications_as_read,
    add_course, add_student_course, add_professor_response,
    assign_student_to_course, assign_professor_to_course
)


@pytest_asyncio.fixture
async def session():
    # in-memory SQLite for testing
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False, future=True)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as sess:
        yield sess
    await engine.dispose()


@pytest.mark.asyncio
async def test_add_user_and_duplicate(session):
    # add a student
    user = await add_user(session, "stud@example.com", "First", "Last", "pwd", "student")
    assert user.email == "stud@example.com"
    # underlying Students created
    student = await session.get(Students, "stud@example.com")
    assert student is not None and student.email == "stud@example.com"
    # duplicate should error
    with pytest.raises(ValueError):
        await add_user(session, "stud@example.com", "First", "Last", "pwd", "student")


@pytest.mark.asyncio
async def test_add_user_professor(session):
    user = await add_user(session, "prof@example.com", "Prof", "One", "pwd", "professor")
    assert isinstance(user, Users)
    prof = await session.get(Professors, "prof@example.com")
    assert prof is not None and prof.email == "prof@example.com"


@pytest.mark.asyncio
async def test_direct_add_and_update(session):
    # direct student
    std = await add_student(session, "s2@example.com", department_id="D1")
    assert std.department_id == "D1"
    # direct professor
    prof = await add_professor(session, "p2@example.com", department_id="D2")
    assert prof.department_id == "D2"
    # direct secretary
    sec = await add_secretary(session, "sec@example.com", department_id="D3")
    assert sec.department_id == "D3"
    # update existing
    updated_prof = await update_professor_department(session, "p2@example.com", "D9")
    assert updated_prof.department_id == "D9"
    assert await update_professor_department(session, "nope@example.com", "X") is None
    updated_std = await update_student_department(session, "s2@example.com", "D8")
    assert updated_std.department_id == "D8"
    assert await update_student_department(session, "no@example.com", "X") is None
    updated_sec = await update_secretary_department(session, "sec@example.com", "D7")
    assert updated_sec.department_id == "D7"
    assert await update_secretary_department(session, "absent@example.com", "X") is None


@pytest.mark.asyncio
async def test_requests_and_notifications_flow(session):
    # prepare user and request
    await add_user(session, "u1@example.com", "A", "B", "pwd", "student")
    req = await add_request(session, "Title", "u1@example.com", "Details", files={"f":1}, status="new")
    assert req.title == "Title" and req.student_email == "u1@example.com"
    # notifications
    note = await create_notification(session, "u1@example.com", req.id, "Hello", type="info")
    assert note.request_id == req.id and note.is_read is False
    # get_user_notifications
    no_user = await get_user_notifications(session, "no@example.com")
    assert no_user == []
    nots = await get_user_notifications(session, "u1@example.com")
    assert len(nots) == 1 and nots[0].id == note.id
    # mark single
    ok = await mark_notification_as_read(session, note.id)
    assert ok is True
    notif = (await session.execute(select(Notifications).where(Notifications.id==note.id))).scalar_one()
    assert notif.is_read is True
    # mark nonexistent
    assert await mark_notification_as_read(session, 9999) is False
    # bulk
    # create more
    await create_notification(session, "u1@example.com", req.id, "N2", type="info")
    await create_notification(session, "u1@example.com", req.id, "N3", type="info")
    count = await mark_all_notifications_as_read(session, "u1@example.com")
    assert count >= 2


@pytest.mark.asyncio
async def test_course_student_course_and_response_and_assign(session):
    # setup users
    await add_user(session, "stu@example.com", "S", "T", "pwd", "student")
    await add_user(session, "prof1@example.com", "P", "One", "pwd", "professor")
    # add course
    course = await add_course(session, "C1", "Name", "Desc", 3.0, "prof1@example.com", None)
    assert course.id == "C1"
    # add student_course should raise TypeError because StudentCourses has no grade fields
    with pytest.raises(TypeError):
        await add_student_course(session, "stu@example.com", "C1", "prof1@example.com", "comp", 95)
    # add professor response
    req2 = await add_request(session, "T2", "stu@example.com", "D2")
    resp = await add_professor_response(session, req2.id, "prof1@example.com", "Rtext", files=None)
    assert resp.professor_email == "prof1@example.com"
    fresh_req = await session.get(Requests, req2.id)
    assert isinstance(fresh_req.timeline, list) and fresh_req.timeline[-1]["status"] == "response added"
    with pytest.raises(ValueError):
        await add_professor_response(session, 9999, "prof1@example.com", "X")
    # assign student to course idempotent
    asg1 = await assign_student_to_course(session, "stu@example.com", "C1")
    asg2 = await assign_student_to_course(session, "stu@example.com", "C1")
    assert asg1.student_email == asg2.student_email
    # assign professor to course
    await add_user(session, "prof2@example.com", "P2", "Two", "pwd", "professor")
    updated = await assign_professor_to_course(session, "prof2@example.com", "C1")
    assert updated.professor_email == "prof2@example.com"
    with pytest.raises(Exception):
        await assign_professor_to_course(session, "nope@example.com", "C1")
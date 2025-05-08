import os
import shutil
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import urllib.parse
from fastapi import FastAPI, UploadFile, File, Form, Response, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from sqlalchemy import select, literal, literal_column, ColumnElement, delete, and_
import json
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified
from starlette.requests import Request
from starlette.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from db_connection import *
import bcrypt
import cryptography
import jwt
from jwt.exceptions import PyJWTError
from typing import Optional
from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from pydantic import BaseModel, constr
from typing import List

# Import the AI Service - using the Python wrapper
from AIService import processMessage

# Model for AI chat requests
class ChatRequest(BaseModel):
    message: str
    language: Optional[str] = None

class UnavailabilityPeriod(BaseModel):
    start_date: datetime
    end_date: datetime
    reason: Optional[str] = None

class AssignProfessorRequest(BaseModel):
    professor_email: str
    course_ids: List[str]


class AssignStudentsRequest(BaseModel):
    student_emails: List[str]
    course_id: str


# Session Management and Authentication #
SECRET_KEY = "SSRSTEAM14"  # In production, use a secure secret key
ALGORITHM = "HS256"

def create_access_token(user_data: dict):
    to_encode = user_data.copy()
    expire = datetime.utcnow() + timedelta(hours=1)
    to_encode["exp"] = int(expire.timestamp())
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM, headers={"alg": "HS256", "typ": "JWT"})
    print("generated token:", token)
    return token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


def verify_token(token: str = Depends(oauth2_scheme)):
    '''
    try:
        unverified_payload = jwt.decode(token, options={"verify_signature": False})
        print("Unverified payload:", unverified_payload)
    except Exception as ex:
        print("Error decoding unverified token:", ex)
    '''
    try:
        print('Token from header:', token)  # Debug line
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_signature": False})
        print('after decode', payload)
        user_email: str = payload.get("user_email")
        role: str = payload.get("role")
        if user_email is None or role is None:
            print("user-email:", user_email, "role:", role)
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        return payload
    except PyJWTError:
        print("Invalid token - PyJWTError")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

def verify_token_professor(token_data: dict = Depends(verify_token)):
    if token_data.get("role") != "professor":
        print("Bad role in token")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized: Professor role required")
    print("Authorized as professor!!!!!!!!")
    return token_data

def verify_token_student(token_data: dict = Depends(verify_token)):
    if token_data.get("role") != "student":
        print("Bad role in token")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized: Student role required")
    print("Authorized as student")
    return token_data

###

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database on startup
    await init_db()
    yield
    # Clean up on shutdown (if needed)
    pass


app = FastAPI(lifespan=lifespan)

# app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "Welcome to FastAPI Backend!"}


@app.post("/login")
async def login(request: Request, session: AsyncSession = Depends(get_session)):
    data = await request.json()
    email = data.get("Email")
    password = data.get("Password")

    res_user = await session.execute(select(Users).where(Users.email == email))
    user = res_user.scalars().first()
    if user:
        stored_password = user.hashed_password
        if bcrypt.checkpw(password.encode('utf-8'), stored_password.encode('utf-8')):
            access_token = create_access_token({"user_email": user.email, "role": user.role, "first_name": user.first_name,
                                                "last_name": user.last_name})
            return {"access_token": access_token, "token_type": "bearer", "message": "Login successful"}
        else:
            raise HTTPException(status_code=401, detail="Invalid password")
    else:
        raise HTTPException(status_code=404, detail="User not found")


# AI Service endpoint
@app.post("/api/ai/chat")
async def ai_chat(chat_request: ChatRequest):
    try:
        print(f"\nAPI DEBUG: Received chat request - message: '{chat_request.message}', language: {chat_request.language}")
        
        # Process the message through the AI service
        response = await processMessage(chat_request.message, chat_request.language)
        
        print(f"API DEBUG: AI response - source: {response.get('source')}, success: {response.get('success')}")
        return response
    except Exception as e:
        print(f"API ERROR: Error processing message: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing message: {str(e)}"
        )


@app.get("/databases")
def list_databases():
    return {"databases": None}


@app.get("/tables/{database_name}")
def list_tables(database_name: str):
    return {"tables": None}





@app.post("/uploadfile/{userEmail}")
async def upload_file(userEmail: str, file: UploadFile = File(...), fileType: str = Form(...)):
    try:
        # Validate file size (example: 10MB limit)
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes
        file_size = 0
        file_content = await file.read()
        file_size = len(file_content)
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400, 
                detail="File size too large. Maximum size is 10MB"
            )

        # Create directory if it doesn't exist
        save_path = os.path.join("Documents", userEmail, fileType)
        os.makedirs(save_path, exist_ok=True)
        
        # Save the file
        file_path = os.path.join(save_path, file.filename)
        with open(file_path, "wb") as f:
            f.write(file_content)

        return {
            "message": "File uploaded successfully",
            "path": f"{userEmail}/{fileType}/{file.filename}"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading file: {str(e)}"
        )


@app.get("/reloadFiles/{userEmail}")
async def reload_files(userEmail: str):
    root_path = os.path.join("Documents", userEmail)
    files = []
    file_paths = []
    for root, _, filenames in os.walk(root_path):
        for filename in filenames:
            print("filename:", filename)
            print("root:", root)

            file_path = os.path.relpath(os.path.join(root, filename), root_path)
            print("file_path:", file_path)
            files.append(filename)
            file_paths.append(file_path)
    print({"files": files, "file_paths": file_paths})
    return {"files": files, "file_paths": file_paths}


@app.get("/downloadFile/{userId}/{file_path:path}")
async def download_file(userId: str, file_path: str):
    print(file_path)
    decoded_path = urllib.parse.unquote(file_path)

    full_path = os.path.abspath(decoded_path)
    print(f"Downloading file from: {full_path}")

    if not os.path.isfile(full_path):
        print("File not found!")
        return {"error": "File not found"}

    return FileResponse(full_path, filename=os.path.basename(full_path))


@app.get("/requests/{user_email}")
async def get_requests(user_email: str, session: AsyncSession = Depends(get_session)):
    try:
        # Fetch the user role from the database based on the email
        result = await session.execute(select(Users).filter(Users.email == user_email))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        # If the user is a secretary, return all requests
        if user.role == "secretary":
            result = await session.execute(select(Requests))
        else:
            # If not a secretary, only return requests for the current user
            result = await session.execute(
                select(Requests).filter(Requests.student_email == user_email)
            )

        requests = result.scalars().all()

        return [
            {
                "id": req.id,
                "title": req.title,
                "student_email": req.student_email,
                "details": req.details,
                "files": req.files,
                "status": req.status,
                "created_date": str(req.created_date),
                "timeline": req.timeline,
            }
            for req in requests
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching requests: {str(e)}")

@app.post("/update_status")
async def update_status(request_id: int, status: str, session: AsyncSession = Depends(get_session)):
    try:
        # result = await session.execute(select(Users).filter(Users.email == user_email))
        # user = result.scalar_one_or_none()
        #
        # if not user:
        #     raise HTTPException(status_code=404, detail="User not found")
        #
        #
        # if user.role != "secretary":
        #     raise HTTPException(status_code=403, detail="Only a secretary can change the status")

        result = await session.execute(select(Requests).filter(Requests.id == request_id))
        request = result.scalar_one_or_none()

        if not request:
            raise HTTPException(status_code=404, detail="Request not found")

        request.status = status
        await session.commit()

        return {"message": "Status updated successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating status: {str(e)}")

@app.get("/requests/professor/{professor_email}")
async def get_professor_requests(professor_email: str, session: AsyncSession = Depends(get_session)):
    try:
        result = await session.execute(
            select(Courses.id).where(Courses.professor_email == professor_email))
        course_ids = [row[0] for row in result.all()]

        if not course_ids:
            return []

        result = await session.execute(
            select(Requests).where(
                and_(
                    Requests.course_id.in_(course_ids),
                    Requests.status == "pending"
                )
            )
        )
        requests = result.scalars().all()

        return [
            {
                "id": req.id,
                "title": req.title,
                "student_email": req.student_email,
                "details": req.details,
                "files": req.files,
                "status": req.status,
                "created_date": str(req.created_date),
                "timeline": req.timeline,
                "course_id": req.course_id,
                "course_component": req.course_component,
            }
            for req in requests
        ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching requests: {str(e)}")
@app.post("/create_user")
async def create_user(request: Request, session: AsyncSession = Depends(get_session)):
    data = await request.json()
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    email = data.get("email")
    password = data.get("password")
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    role = data.get("role")

    # This already handles adding the student/professor internally:
    new_user = await add_user(session, email, first_name, last_name, hashed_password, role)

    return {"message": "User created successfully", "user_email": new_user.email}


@app.get("/users")
async def get_users(role: str = None, session: AsyncSession = Depends(get_session)):
    query = select(Users)
    if role:
        query = query.where(Users.role == role)
    result = await session.execute(query)
    return result.scalars().all()


@app.get("/courses")
async def get_courses(professor_email: bool = None, session: AsyncSession = Depends(get_session)):
    query = select(Courses)
    if professor_email:
        query = query.where(Courses.professor_email is not None)
    print(query)
    result = await session.execute(select(Courses))
    return result.scalars().all()

@app.post("/Users/setRole")
async def set_role(request: Request, session: AsyncSession = Depends(get_session)):
    print("in the set role function")
    data = await request.json()
    user_email = data.get("user_email")
    role = data.get("role")

    res = await session.execute(select(Users).filter(Users.email == user_email))
    user = res.scalars().first()

    if user:
        user.role = role  # Update the role
        await session.commit()  # Commit changes
        return {"message": "Role updated successfully", "user": {"email": user.email, "role": user.role}}
    else:
        return {"error": "User not found"}


@app.post("/Users/getUser/{UserEmail}")
async def get_user(UserEmail : str, session: AsyncSession = Depends(get_session)):
    print("in the func", UserEmail)
    res_user = await session.execute(select(Users).where(Users.email == UserEmail))
    user = res_user.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch role-specific data
    if user.role == "student":
        student_data = await session.execute(select(Students).filter(Students.email == user.email))
        student = student_data.scalars().first()
        return {**user.__dict__, "student_data": student}

    if user.role == "professor":
        professor_data = await session.execute(select(Professors).filter(Professors.email == user.email))
        professor = professor_data.scalars().first()
        return {**user.__dict__, "professor_data": professor}

    return user


@app.get("/professor/courses/{professor_email}")
async def get_courses(professor_email: str, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Professors).filter(Professors.email == professor_email))
    professor = result.scalars().first()
    if not professor:
        raise HTTPException(status_code=404, detail="Professor not found")

    result = await session.execute(select(Courses).filter(Courses.professor_email == professor_email))
    courses = result.scalars().all()

    courses_data = [{
        "id": course.id,
        "name": course.name,
        "description": course.description,
        "credits": course.credits,
        "professor_email": course.professor_email,
        "department_id": course.department_id
    } for course in courses]
    courses_names = [course.name for course in courses]

    return {"courses": courses_data}



@app.post("/courses/{course_id}/submit_grades")
async def submit_grades(
        course_id: str,
        data: dict = Body(...),  # data will include: gradeComponent, grades (dict: email -> grade)
        session: AsyncSession = Depends(get_session),
        token_data: dict = Depends(verify_token_professor)
):
    print(course_id, data)
    grade_component = data.get("gradeComponent")
    grades = data.get("grades")  # dict: { "student@email.com": 95 }

    if not grade_component or not grades:
        raise HTTPException(status_code=400, detail="Missing grade component or grades")

    professor_email = token_data.get("user_email")

    for student_email, grade in grades.items():
        result = await session.execute(
            select(Students).filter(Students.email == student_email)
        )
        student = result.scalars().first()
        if not student:
            raise HTTPException(status_code=404, detail=f"Student {student_email} not found")

        # Check if grade exists
        existing = await session.execute(
            select(Grades).filter_by(
                student_email=student_email,
                course_id=course_id,
                professor_email=professor_email,
                grade_component=grade_component
            )
        )
        grade_record = existing.scalars().first()

        if grade_record:
            grade_record.grade = grade
        else:
            new_grade = Grades(
                student_email=student_email,
                course_id=course_id,
                professor_email=professor_email,
                grade_component=grade_component,
                grade=grade
            )
            session.add(new_grade)

    await session.commit()
    return {"message": "Grades submitted successfully"}


@app.get("/course/{course_id}/students")
async def get_students(course_id: str, session: AsyncSession = Depends(get_session),
                       token_data: dict = Depends(verify_token_professor)):
    result = await session.execute(
        select(Courses)
        .filter(Courses.id == course_id)
        .options(selectinload(Courses.students))
    )
    course = result.scalars().first()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    return jsonable_encoder(course.students)


# Create a request
@app.post("/submit_request/create")
async def create_general_request(
        request: Request,
        session: AsyncSession = Depends(get_session)
):
    print("in submit request")
    data = await request.json()
    title = data.get("title")
    student_email = data.get("student_email")
    details = data.get("details")
    files = data.get("files", {})
    grade_appeal = data.get("grade_appeal")
    schedule_change = data.get("schedule_change")
    course_id = data.get("course_id")
    print(data)
    if not title or not student_email or not details:
        raise HTTPException(status_code=400, detail="Missing required fields")

    timeline = {
        "created": datetime.now().isoformat(),
        "status_changes": [{
            "status": "pending",
            "date": datetime.now().isoformat()
        }]
    }

    # Add specific details based on request type
    if title == "Grade Appeal Request" and grade_appeal:
        required_keys = {"course_id", "grade_component", "current_grade"}
        if not required_keys.issubset(grade_appeal.keys()):
            raise HTTPException(status_code=400, detail="Invalid grade appeal data")
        course_id = grade_appeal.get('course_id')
        course_component = grade_appeal.get('grade_component')
    elif title == "Schedule Change Request" and schedule_change:
        if (
                "course_id" not in schedule_change or
                "professors" not in schedule_change or
                not isinstance(schedule_change["professors"], list) or
                not schedule_change["professors"]
        ):
            raise HTTPException(status_code=400, detail="Invalid schedule change data")
        #course_id = schedule_change.get('course_id')
        course_id = None
        course_component = None
    else:
        course_id = None
        course_component = None

    new_request = await add_request(
        session=session,
        title=title,
        student_email=student_email,
        details=details,
        course_id=course_id,
        course_component=course_component,
        files=files,
        status="pending",
        created_date=datetime.now().date(),
        timeline=timeline
    )

    return {"message": "Request created successfully", "request_id": new_request.id}

@app.delete("/Requests/{request_id}")
async def delete_request(request_id: int, session: AsyncSession = Depends(get_session)):
    try:
        # Fetch the request to ensure it exists
        request = await session.get(Requests, request_id)
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
        if request.status != "pending":
            raise HTTPException(status_code=400, detail="Cannot delete a request that is not pending")
        # Delete the request
        await session.delete(request)
        await session.commit()

        return {"message": "Request deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting request: {str(e)}")

@app.put("/Requests/EditRequest/{request_id}")
async def edit_request(request_id: int, request: Request ,session: AsyncSession = Depends(get_session),
                       student: dict = Depends(verify_token_student)
                       ):
    try :
        existing_request = await session.get(Requests, request_id)
        if not existing_request:
            raise HTTPException(status_code=404, detail="Request not found")
        if existing_request.status != "pending":
            raise HTTPException(status_code=400, detail="Cannot edit a request that is not pending")
        data = await request.json()
        print(data)
        # Edit the request
        existing_request.details = data["details"]
        # existing_request.files = data["files"]

        existing_request_timeline = dict(existing_request.timeline)
        try:
            edits = existing_request_timeline["edits"]
            edits.append((f"details: {data['details']}", datetime.now().isoformat()))
        except KeyError as e:
            print("Error", e)
            edits = [(f"details: {data['details']}", datetime.now().isoformat())]
        existing_request_timeline["edits"] = edits
        existing_request.timeline = existing_request_timeline
        flag_modified(existing_request, "timeline")
        #session.add(existing_request)
        await session.commit()

        return {"message": "Request updated successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error editing request: {str(e)}")

@app.get("/student/{student_email:path}/courses")
async def get_student_courses(student_email: str, session: AsyncSession = Depends(get_session)):
    if not student_email or "@" not in student_email:
        raise HTTPException(status_code=404, detail="Student not found")

    # Query to get courses along with the grades for the student
    result = await session.execute(
        select(StudentCourses, Courses, Grades)
        .join(Courses, StudentCourses.course_id == Courses.id)
        .join(Grades, (Grades.course_id == Courses.id) & (Grades.student_email == student_email), isouter=True)
        .filter(StudentCourses.student_email == student_email)
    )
    rows = result.all()

    # A dictionary to store courses and their grades
    courses_data = {}

    for sc, course, grade in rows:
        if course.id not in courses_data:
            courses_data[course.id] = {
                "id": course.id,
                "name": course.name,
                "description": course.description,
                "credits": course.credits,
                "professor_email": course.professor_email,
                "department_id": course.department_id,
                "grades": []
            }

        # If there are grades for this course, add them
        if grade:
            courses_data[course.id]["grades"].append({
                "grade_component": grade.grade_component,
                "grade": grade.grade
            })

    # Convert the dictionary to a list of courses
    courses_list = list(courses_data.values())

    print(courses_list)

    return {"courses": courses_list}

@app.get("/grades/{student_email}")
async def get_grades(student_email: str, db: AsyncSession = Depends(get_session)):
    stmt = (
        select(Grades, Courses.name)
        .join(Courses, Courses.id == Grades.course_id)  # Join on course_id
        .where(Grades.student_email == student_email)
    )
    result = await db.execute(stmt)
    grades = result.all()

    if not grades:
        raise HTTPException(status_code=404, detail="No grades found for this student")

    formatted_grades = [
        {
            "course_id": grade.course_id,
            "course_name": course_name,
            "professor_email": grade.professor_email,
            "grade_component": grade.grade_component,
            "grade": grade.grade,
            "student_email": grade.student_email
        }
        for grade, course_name in grades
    ]

    return formatted_grades


@app.post("/assign_student")
async def assign_students(
        data: AssignStudentsRequest,
        db: AsyncSession = Depends(get_session)
):
    stmt = select(StudentCourses).filter(StudentCourses.course_id == data.course_id)
    result = await db.execute(stmt)
    existing_students = result.scalars().all()

    new_students_emails = set(data.student_emails)
    print(f"New students emails: {new_students_emails}")
    print(f"Existing students: {existing_students}")

    for student in existing_students:
        if student.student_email not in new_students_emails:
            await db.delete(student)

    for email in data.student_emails:
        await assign_student_to_course(db, email, data.course_id)

    await db.commit()
    return {"message": "Students assigned successfully"}


@app.post("/assign_professor")
async def assign_professor(
        data: AssignProfessorRequest,
        db: AsyncSession = Depends(get_session)
):
    result = await db.execute(select(Courses).filter(Courses.professor_email == data.professor_email))
    existing_courses = result.scalars().all()

    existing_course_ids = [course.id for course in existing_courses]
    new_course_ids = data.course_ids

    for course_id in existing_course_ids:
        if course_id not in new_course_ids:
            stmt = delete(Courses).filter(Courses.id == course_id, Courses.professor_email == data.professor_email)
            await db.execute(stmt)

    for course_id in new_course_ids:
        await assign_professor_to_course(db, data.professor_email, course_id)

    await db.commit()

    return {"message": "Courses assigned successfully"}



@app.get("/assigned_students")
async def get_assigned_students(course_id: str, db: AsyncSession = Depends(get_session)):
    stmt = select(StudentCourses.student_email).filter(StudentCourses.course_id == course_id)
    result = await db.execute(stmt)
    assigned_students = result.scalars().all()
    return [{"email": email} for email in assigned_students]


# Testing
import sqlite3

def fetch_data():
    # Opens a connection using sqlite3.
    connection = sqlite3.connect('mydb.db')
    cursor = connection.cursor()
    cursor.execute("SELECT * FROM my_table")
    rows = cursor.fetchall()
    return rows

def main():
    data = fetch_data()
    print(data)

if __name__ == '__main__':
    main()

@app.post("/professor/unavailability/{professor_email}")
async def add_unavailability_period(
    professor_email: str,
    period: UnavailabilityPeriod,
    session: AsyncSession = Depends(get_session)
):
    # Verify professor exists
    result = await session.execute(select(Professors).where(Professors.email == professor_email))
    professor = result.scalars().first()
    if not professor:
        raise HTTPException(status_code=404, detail="Professor not found")

    # Create new unavailability period
    new_period = ProfessorUnavailability(
        professor_email=professor_email,
        start_date=period.start_date.date(),
        end_date=period.end_date.date(),
        reason=period.reason
    )
    
    session.add(new_period)
    await session.commit()
    await session.refresh(new_period)
    
    return {"message": "Unavailability period added successfully", "period": new_period}

@app.get("/professor/unavailability/{professor_email}")
async def get_unavailability_periods(
    professor_email: str,
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(Professors).where(Professors.email == professor_email))
    professor = result.scalars().first()
    if not professor:
        raise HTTPException(status_code=404, detail="Professor not found")

    result = await session.execute(
        select(ProfessorUnavailability)
        .filter(ProfessorUnavailability.professor_email == professor_email)
        .order_by(ProfessorUnavailability.start_date)
    )
    periods = result.scalars().all()
    
    return {"periods": periods}

@app.delete("/professor/unavailability/{period_id}")
async def delete_unavailability_period(
    period_id: int,
    session: AsyncSession = Depends(get_session)
):
    period = await session.get(ProfessorUnavailability, period_id)
    if not period:
        raise HTTPException(status_code=404, detail="Unavailability period not found")

    await session.delete(period)
    await session.commit()
    
    return {"message": "Unavailability period deleted successfully"}

@app.get("/professor/availability/{professor_email}")
async def check_professor_availability(
    professor_email: str,
    date: datetime,
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(select(Professors).where(Professors.email == professor_email))
    professor = result.scalars().first()
    if not professor:
        raise HTTPException(status_code=404, detail="Professor not found")

    result = await session.execute(
        select(ProfessorUnavailability)
        .filter(
            ProfessorUnavailability.professor_email == professor_email,
            ProfessorUnavailability.start_date <= date.date(),
            ProfessorUnavailability.end_date >= date.date()
        )
    )
    periods = result.scalars().all()
    
    if periods:
        return {
            "is_available": False,
            "periods": periods
        }
    
    return {"is_available": True}



@app.get("/student_courses/professor/{student_email}/{course_id}")
async def get_student_professor(
    student_email: str,
    course_id: str,
    session: AsyncSession = Depends(get_session)
):
    result = await session.execute(
        select(StudentCourses.professor_email)
        .where(
            StudentCourses.student_email == student_email,
            StudentCourses.course_id == course_id
        )
    )
    student_course = result.scalars().first()
    if not student_course:
        raise HTTPException(status_code=404, detail="No professor found for this student in the specified course")
    return {"professor_email": student_course}

@app.get("/student/{student_email}/professors")
async def get_student_professors(
    student_email: str,
    session: AsyncSession = Depends(get_session)
):
    try:
        # First, get all courses for the student
        student_courses_query = select(StudentCourses).where(StudentCourses.student_email == student_email)
        student_courses = (await session.execute(student_courses_query)).scalars().all()
        
        if not student_courses:
            return {"professors": []}
            
        # Get unique professor emails from the courses
        professor_emails = set()
        for course in student_courses:
            professor_emails.add(course.professor_email)
            
        # Get professor details from Users table
        professors_query = select(Users).where(Users.email.in_(professor_emails))
        professors = (await session.execute(professors_query)).scalars().all()
        
        # Format the response
        professors_data = [
            {
                "email": prof.email,
                "first_name": prof.first_name,
                "last_name": prof.last_name
            }
            for prof in professors
        ]
        
        return {"professors": professors_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/secretary/transfer-requests/{secretary_email}")
async def get_department_transfer_requests(
    secretary_email: str,
    session: AsyncSession = Depends(get_session),
    token_data: dict = Depends(verify_token)
):
    # Verify the user is a secretary
    if token_data["role"] not in ["admin", "secretary"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin and secretary can access this endpoint"
        )
    
    # Get secretary's department
    secretary = await session.execute(
        select(Secretaries).where(Secretaries.email == secretary_email)
    )
    secretary = secretary.scalar_one_or_none()
    
    if not secretary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secretary not found"
        )
    
    # Get all students in the same department
    students = await session.execute(
        select(Students).where(Students.department_id == secretary.department_id)
    )
    students = students.scalars().all()
    
    # Get all requests from these students
    student_emails = [student.email for student in students]
    requests = await session.execute(
        select(Requests)
        .where(
            and_(
                Requests.student_email.in_(student_emails),
                Requests.status == "pending"
            )
        )
        .order_by(Requests.created_date.desc())
    )
    requests = requests.scalars().all()
    
    # Format the response
    formatted_requests = []
    for request in requests:
        # Get student details
        student = await session.execute(
            select(Users).where(Users.email == request.student_email)
        )
        student = student.scalar_one_or_none()
        
        formatted_request = {
            "id": request.id,
            "title": request.title,
            "student_email": request.student_email,
            "student_name": f"{student.first_name} {student.last_name}" if student else "Unknown",
            "details": request.details,
            "course_id": request.course_id,
            "course_component": request.course_component,
            "files": request.files,
            "status": request.status,
            "created_date": request.created_date,
            "timeline": request.timeline
        }
        formatted_requests.append(formatted_request)
    
    return formatted_requests

@app.post("/submit_response")
async def submit_response(
        request_id: int = Form(...),
        professor_email: str = Form(...),
        response_text: str = Form(...),
        files: Optional[List[UploadFile]] = File(None),
        db: AsyncSession = Depends(get_session)):
    saved_files = []
    upload_dir = f"Documents/{professor_email}/{request_id}"
    os.makedirs(upload_dir, exist_ok=True)

    if files:
        for file in files:
            file_path = os.path.join(upload_dir, file.filename)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_files.append(file.filename)

    try:
        result = await db.execute(select(Requests).where(Requests.id == request_id))
        request = result.scalar_one()

        # עדכון ה-timeline
        if not request.timeline:
            request.timeline = {
                "created": request.created_date.isoformat() if request.created_date else datetime.now().isoformat(),
                "status_changes": []
            }

        request.timeline["status_changes"].append({
            "status": "responded",
            "by": professor_email,
            "date": datetime.now().isoformat()
        })
        request.status = "responded"
        db.flush()


        # אחרי ששמרת את השינויים ב-request
        print("=== בקשה לאחר עדכון ===")
        print(f"ID: {request.id}")
        print(f"נושא: {request.title}")
        print(f"תיאור: {request.details}")
        print(f"סטטוס: {request.status}")
        print(f"Timeline: {json.dumps(request.timeline, indent=2, ensure_ascii=False)}")
        print("=======================")


        # שמירה מחדש
        db.add(request)

        # שמירת תגובה חדשה
        response = Responses(
            request_id=request_id,
            professor_email=professor_email,
            response_text=response_text,
            files=saved_files if saved_files else None,
            created_date=datetime.now().date()
        )
        db.add(response)
        await db.commit()

        return {"message": "Response submitted and timeline updated"}

    except NoResultFound:
        await db.rollback()
        return {"error": "Request not found"}, 404

    except Exception as e:
        await db.rollback()
        print("Error:", e)
        return {"error": "Failed to submit response"}, 500

    finally:
        await db.close()



@app.get("/request/responses/{request_id}")
async def get_request_responses(request_id: int, db: AsyncSession = Depends(get_session)):
    result = await db.execute(
        select(Responses).where(Responses.request_id == request_id)
    )
    responses = result.scalars().all()

    return [
        {
            "id": r.id,
            "professor_email": r.professor_email,
            "response_text": r.response_text,
            "files": r.files,
            "created_date": str(r.created_date),
        }
        for r in responses
    ]

@app.get("/request/{request_id}/student_courses")
async def get_student_courses_for_request(
    request_id: int,
    session: AsyncSession = Depends(get_session)
):
    try:
        # Get the request to find the student email
        result = await session.execute(select(Requests).where(Requests.id == request_id))
        request = result.scalar_one_or_none()
        
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
            
        # Get all courses for the student
        result = await session.execute(
            select(StudentCourses, Courses)
            .join(Courses, StudentCourses.course_id == Courses.id)
            .where(StudentCourses.student_email == request.student_email)
        )
        courses = result.all()
        
        return [{
            "course_id": course.id,
            "course_name": course.name,
            "professor_email": sc.professor_email
        } for sc, course in courses]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/request/{request_id}/transfer")
async def transfer_request(
    request_id: int,
    transfer_data: dict = Body(...),
    session: AsyncSession = Depends(get_session)
):
    try:
        new_course_id = transfer_data.get("new_course_id")
        transfer_reason = transfer_data.get("reason", "No reason provided")
        
        # Get the request
        result = await session.execute(select(Requests).where(Requests.id == request_id))
        request = result.scalar_one_or_none()
        
        if not request:
            raise HTTPException(status_code=404, detail="Request not found")
            
        # Update the course_id (can be null)
        request.course_id = new_course_id
        
        # Update timeline
        if not request.timeline:
            request.timeline = {
                "created": request.created_date.isoformat() if request.created_date else datetime.now().isoformat(),
                "status_changes": []
            }
            
        request.timeline["status_changes"].append({
            "status": "transferred",
            "new_course_id": new_course_id if new_course_id else "Department Secretary",
            "reason": transfer_reason,
            "date": datetime.now().isoformat()
        })

        # Create notifications
        # 1. Notify the student
        if new_course_id:
            # Get the professor for this course from student_courses
            result = await session.execute(
                select(StudentCourses)
                .where(
                    and_(
                        StudentCourses.course_id == new_course_id,
                        StudentCourses.student_email == request.student_email
                    )
                )
            )
            student_course = result.scalar_one_or_none()
            
            if student_course and student_course.professor_email:
                await create_notification(
                    session=session,
                    user_email=request.student_email,
                    request_id=request_id,
                    message=f"Your request '{request.title}' has been transferred to {student_course.professor_email}. Reason: {transfer_reason}",
                    type="transfer"
                )
            else:
                await create_notification(
                    session=session,
                    user_email=request.student_email,
                    request_id=request_id,
                    message=f"Your request '{request.title}' has been transferred to Department Secretary. Reason: {transfer_reason}",
                    type="transfer"
                )
        else:
            await create_notification(
                session=session,
                user_email=request.student_email,
                request_id=request_id,
                message=f"Your request '{request.title}' has been transferred to Department Secretary. Reason: {transfer_reason}",
                type="transfer"
            )

        # 2. If transferred to a course, notify the professor
        if new_course_id:
            # Get the professor for this course from student_courses
            result = await session.execute(
                select(StudentCourses)
                .where(
                    and_(
                        StudentCourses.course_id == new_course_id,
                        StudentCourses.student_email == request.student_email
                    )
                )
            )
            student_course = result.scalar_one_or_none()
            
            if student_course and student_course.professor_email:
                await create_notification(
                    session=session,
                    user_email=student_course.professor_email,
                    request_id=request_id,
                    message=f"A new request '{request.title}' has been assigned to you from {request.student_email}. Reason for transfer: {transfer_reason}",
                    type="transfer"
                )
        else:
            # If transferred to Department Secretary, notify the relevant secretary
            # First get the student's department
            result = await session.execute(
                select(Students).where(Students.email == request.student_email)
            )
            student = result.scalar_one_or_none()
            
            if student and student.department_id:
                # Get the secretary for this department
                result = await session.execute(
                    select(Secretaries).where(Secretaries.department_id == student.department_id)
                )
                secretary = result.scalar_one_or_none()
                
                if secretary:
                    await create_notification(
                        session=session,
                        user_email=secretary.email,
                        request_id=request_id,
                        message=f"A new request '{request.title}' has been transferred to you from {request.student_email}. Reason for transfer: {transfer_reason}",
                        type="transfer"
                    )
        
        await session.commit()
        return {"message": "Request transferred successfully"}
        
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/transfer-requests")
async def get_all_transfer_requests(
    session: AsyncSession = Depends(get_session),
    token_data: dict = Depends(verify_token)
):
    # Verify the user is an admin
    if token_data["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can access this endpoint"
        )
    
    # Get all pending requests
    requests = await session.execute(
        select(Requests)
        .where(Requests.status == "pending")
        .order_by(Requests.created_date.desc())
    )
    requests = requests.scalars().all()
    
    # Format the response
    formatted_requests = []
    for request in requests:
        # Get student details
        student = await session.execute(
            select(Users).where(Users.email == request.student_email)
        )
        student = student.scalar_one_or_none()
        
        # Get student's department
        student_dept = await session.execute(
            select(Students).where(Students.email == request.student_email)
        )
        student_dept = student_dept.scalar_one_or_none()
        
        formatted_request = {
            "id": request.id,
            "title": request.title,
            "student_email": request.student_email,
            "student_name": f"{student.first_name} {student.last_name}" if student else "Unknown",
            "details": request.details,
            "course_id": request.course_id,
            "course_component": request.course_component,
            "files": request.files,
            "status": request.status,
            "created_date": request.created_date,
            "timeline": request.timeline,
            "department_id": student_dept.department_id if student_dept else None
        }
        formatted_requests.append(formatted_request)
    
    return formatted_requests

# Notification endpoints
@app.get("/notifications/{user_email}")
async def get_notifications(
    user_email: str,
    session: AsyncSession = Depends(get_session),
    token_data: dict = Depends(verify_token)
):
    try:
        print(f"Getting notifications for user: {user_email}")
        notifications = await get_user_notifications(session, user_email)
        print(f"Found {len(notifications)} notifications")
        return [
            {
                "id": notification.id,
                "message": notification.message,
                "is_read": notification.is_read,
                "created_date": notification.created_date,
                "type": notification.type,
                "request_id": notification.request_id
            }
            for notification in notifications
        ]
    except Exception as e:
        print(f"Error in get_notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    session: AsyncSession = Depends(get_session),
    token_data: dict = Depends(verify_token)
):
    """Mark a specific notification as read."""
    try:
        success = await mark_notification_as_read(session, notification_id)
        if not success:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"message": "Notification marked as read"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/notifications/read-all")
async def mark_all_notifications_read(
    session: AsyncSession = Depends(get_session),
    token_data: dict = Depends(verify_token)
):
    """Mark all notifications for the current user as read."""
    try:
        count = await mark_all_notifications_as_read(session, token_data["user_email"])
        return {"message": f"{count} notifications marked as read"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


import os
from fastapi.encoders import jsonable_encoder
import urllib.parse
from fastapi import FastAPI, UploadFile, File, Form, Response, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from httpx import request
from sqlalchemy import select, literal, literal_column, ColumnElement, delete
from sqlalchemy.orm import selectinload
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
    print(token_data)
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
        if user_email == "all":
            result = await session.execute(select(Requests))
        else:
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
        "professor_email": course.professor_email
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

    elif title == "Schedule Change Request" and schedule_change:
        if (
            "course_id" not in schedule_change or 
            "professors" not in schedule_change or 
            not isinstance(schedule_change["professors"], list) or 
            not schedule_change["professors"]
        ):
            raise HTTPException(status_code=400, detail="Invalid schedule change data")

    new_request = await add_request(
        session=session,
        title=title,
        student_email=student_email,
        details=details,
        # course_id = grade_appeal['course_id'],
        # course_component = grade_appeal['grade_component'],
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
        existing_request.files = data["files"]
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

import os
import urllib.parse
from fastapi import FastAPI, UploadFile, File, Form, Response, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, literal, literal_column, ColumnElement
from sqlalchemy.orm import selectinload
from starlette.requests import Request
from starlette.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from db_connection import *
import bcrypt
import cryptography
import jwt
from jwt import PyJWTError
from typing import Optional
from datetime import datetime, timedelta

# Session Management and Authentication #
SECRET_KEY = "0534224700"  # In production, use a secure secret key
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

###
from datetime import datetime
from contextlib import asynccontextmanager
'''
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database on startup
    await init_db()
    yield
    # Clean up on shutdown (if needed)
    pass
'''

#app = FastAPI(lifespan=lifespan)

app = FastAPI()

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
            # return {"message": "Login successful"}
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

@app.get("/users")
def list_users():
    return {"users": None}

@app.post("/uploadfile/{userId}")
async def upload_file(userId: str, file: UploadFile = File(...), fileType: str = Form(...)):
    save_path = os.path.join("Documents", userId, fileType)

    os.makedirs(save_path, exist_ok=True)
    file_path = os.path.join(save_path, file.filename)

    with open(file_path, "wb") as f:
        f.write(await file.read())

    return {"message": "File uploaded successfully"}

@app.get("/reloadFiles/{userId}")
async def reload_files(userId: str):
    global file_path
    root_path = os.path.join("Documents", userId)
    files = []
    file_paths = []
    for root, dirs, filenames in os.walk(root_path):
        for filename in filenames:
            if len(dirs)>0:
                continue
            file_path = os.path.relpath(os.path.join("Documents",userId, root, filename), root_path)
            print(file_path)
            files.append(filename)
            file_paths.append(file_path)
    print(file_paths)
    return {"files": files, "file_path" : file_paths}


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


@app.get("/requests/{UserId}")
async def get_requests(UserId: str, session: AsyncSession = Depends(get_session)):
    if UserId == "all":
        return session.query(Requests).all()
    else:
        return session.query(Requests).filter(Requests.student_email == UserId).all()

@app.post("/create_user")
async def create_user(request :Request, session: AsyncSession = Depends(get_session)):
    data = await request.json()
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    email = data.get("email")
    password = data.get("password")
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    role = data.get("role")
    new_user = await add_user(session, email, first_name, last_name, hashed_password, role)
    if role == "student":
        new_student = await add_student(session, email)
    elif role == "professor":
        new_professor = await add_professor(session, email, data.get("department", ""))
    return {"message": "User created successfully", "user_email": new_user.email}

@app.post("/Users/getUsers")
async def get_users(session: AsyncSession = Depends(get_session)):
    users = await session.execute(select(Users))
    return users.scalars().all()


@app.post("/Users/setRole")
async def set_role(request: Request, session: AsyncSession = Depends(get_session)):
    print("in the set role function")
    data = await request.json()
    user_email = data.get("UserEmail")
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
    res_user = await session.execute(select(Users).filter(Users.id == UserEmail))
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
async def get_courses(professor_email: str, session: AsyncSession = Depends(get_session),
                      token_data: dict = Depends(verify_token_professor)):
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
async def submit_grades(course_id: int, grades: list[dict], session: AsyncSession = Depends(get_session),
                        token_data: dict = Depends(verify_token_professor)):
    for entry in grades:
        student_email = entry["student_email"]
        grade_component = entry["grade_component"]
        grade = entry["grade"]
        result = await session.execute(select(Students).filter(Students.email == student_email))
        student = result.scalars().first()
        if not student:
            raise HTTPException(status_code=404, detail=f"Student {student_email} not found in course {course_id}")

        existing_grade = await session.execute(
            select(StudentCourses).filter(
                StudentCourses.student_email == student_email,
                StudentCourses.course_id == course_id,
                StudentCourses.grade_component == grade_component
            )
        )
        grade_record = existing_grade.scalars().first()

        if grade_record:
            grade_record.grade = grade
        else:
            new_grade = StudentCourses(
                student_email=student_email,
                course_id=course_id,
                professor_email=entry["professor_email"],
                grade_component=grade_component,
                grade=grade
            )
            session.add(new_grade)

    await session.commit()
    return {"message": "Grades submitted successfully"}

@app.get("/course/{course_id}/students")
async def get_students(course_id: str, session: AsyncSession = Depends(get_session),
                       token_data: dict = Depends(verify_token_professor)):
    print("in the func")
    # Fetch the course with the given ID and eagerly load students
    result = await session.execute(
        select(Courses)
        .filter(Courses.id == course_id)
        .options(selectinload(Courses.students))  # Eagerly load the students
    )
    course = result.scalars().first()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Return a list of student details
    return [{"email": student.email, "name": f"{student.first_name} {student.last_name}"} for student in course.students]

# Create a general request
@app.post("/general_request/create")
async def create_general_request(
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    data = await request.json()
    title = data.get("title")
    student_email = data.get("student_email")
    details = data.get("details")
    files = data.get("files", {})

    if not title or not student_email or not details:
        raise HTTPException(status_code=400, detail="Missing required fields")

    timeline = {
        "created": datetime.now().isoformat(),
        "status_changes": [{
            "status": "not read",
            "date": datetime.now().isoformat()
        }]
    }

    new_request = await add_request(
        session=session,
        title=title,
        student_email=student_email,
        details=details,
        files=files,
        status="not read",
        created_date=datetime.now().date(),
        timeline=timeline
    )

    return {"message": "Request created successfully", "request_id": new_request.id}

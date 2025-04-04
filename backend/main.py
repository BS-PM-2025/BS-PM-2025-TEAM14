import os
import urllib.parse
from fastapi import FastAPI, UploadFile, File, Form, Response, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from starlette.requests import Request
from starlette.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from db_connection import *

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
        return session.query(Requests).filter(Requests.student_id == UserId).all()

@app.post("/create_user")
async def create_user(request :Request, session: AsyncSession = Depends(get_session)):
    data = await request.json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    role = data.get("role")
    new_user = await add_user(session, username, email, password, role)
    new_student = await add_student(session,new_user.id, username, email, dict())

@app.post("/Users/getUsers")
async def get_users(session: AsyncSession = Depends(get_session)):
    users = await session.execute(select(Users))
    return users.scalars().all()


@app.post("/Users/setRole")
async def set_role(request: Request, session: AsyncSession = Depends(get_session)):
    print("in the set role function")
    data = await request.json()
    user_id = data.get("UserId")
    role = data.get("role")

    res = await session.execute(select(Users).filter(Users.id == user_id))
    user = res.scalars().first()

    if user:
        user.role = role  # Update the role
        await session.commit()  # Commit changes
        return {"message": "Role updated successfully", "user": {"id": user.id, "role": user.role}}
    else:
        return {"error": "User not found"}




@app.post("/Users/getUser/{UserId}")
async def get_user(UserId : int, session: AsyncSession = Depends(get_session)):
    print("in the func", UserId)
    res_user = await session.execute(select(Users).filter(Users.id == UserId))
    user = res_user.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch role-specific data
    if user.role == "student":
        student_data = await session.execute(select(Students).filter(Students.user_id == UserId))
        student = student_data.scalars().first()
        return {**user.__dict__, "student_data": student}

    if user.role == "professor":
        professor_data = await session.execute(select(Professors).filter(Professors.user_id == UserId))
        professor = professor_data.scalars().first()
        return {**user.__dict__, "professor_data": professor}

    return user

@app.get("/professor/courses/{professor_id}")
async def get_courses(professor_id: int, session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Professors).filter(Professors.id == professor_id))
    professor = result.scalars().first()
    if not professor:
        raise HTTPException(status_code=404, detail="Professor not found")

    result = await session.execute(select(Courses).filter(Courses.professor_id == professor_id))
    courses = result.scalars().all()

    courses_data = [{
        "id": course.id,
        "name": course.name,
        "description": course.description,
        "code": course.code,
        "credits": course.credits,
        "professor_id": course.professor_id
    } for course in courses]
    courses_names = [course.name for course in courses]

    return {"courses": courses_data}

@app.post("/courses/{course_id}/submit_grades")
async def submit_grades(course_id: int, grades: list[dict], session: AsyncSession = Depends(get_session)):
    for entry in grades:
        student_id = entry["student_id"]
        grade = entry["grade"]
        result = await session.execute(select(Students).filter(Students.id == student_id))
        student = result.scalars().first()
        if not student:
            raise HTTPException(status_code=404, detail=f"Student {student_id} not found in course {course_id}")

        existing_grade = await session.execute(
            select(Grades).filter(Grades.student_id == student_id, Grades.course_id == course_id)
        )
        grade_record = existing_grade.scalars().first()

        if grade_record:
            grade_record.grade = grade
        else:
            new_grade = Grades(student_id=student_id, course_id=course_id, grade=grade)
            session.add(new_grade)

    await session.commit()
    return {"message": "Grades submitted successfully"}

@app.get("/course/{course_id}/students")
async def get_students(course_id: str, session: AsyncSession = Depends(get_session)):
    print("in the func")
    # Fetch the course with the given ID and eagerly load students
    result = await session.execute(
        select(Courses)
        .filter(Courses.code == course_id)
        .options(selectinload(Courses.students))  # Eagerly load the students
    )
    course = result.scalars().first()

    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Return a list of student details
    return [{"id": student.id, "name": student.name, "email": student.email} for student in course.students]

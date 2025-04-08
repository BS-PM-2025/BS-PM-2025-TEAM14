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
from datetime import datetime
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database on startup
    await init_db()
    yield
    # Clean up on shutdown (if needed)
    pass

app = FastAPI(lifespan=lifespan)

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

@app.post("/uploadfile/{userEmail}")
async def upload_file(
    userEmail: str, 
    file: UploadFile = File(...), 
    fileType: str = Form(...)
):
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
    role = data.get("role")
    new_user = await add_user(session, email, first_name, last_name, password, role)
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
async def submit_grades(course_id: int, grades: list[dict], session: AsyncSession = Depends(get_session)):
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
async def get_students(course_id: str, session: AsyncSession = Depends(get_session)):
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
@app.post("/submit_request/create")
async def create_general_request(
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    data = await request.json()
    title = data.get("title")
    student_email = data.get("student_email")
    details = data.get("details")
    files = data.get("files", {})
    grade_appeal = data.get("grade_appeal")
    schedule_change = data.get("schedule_change")

    if not title or not student_email or not details:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Initialize timeline with basic information
    timeline = {
        "created": datetime.now().isoformat(),
        "status_changes": [{
            "status": "pending",
            "date": datetime.now().isoformat()
        }]
    }

    # Add specific details based on request type
    if title == "Grade Appeal Request" and grade_appeal:
        timeline.update({
            "course_id": grade_appeal["course_id"],
            "grade_component": grade_appeal["grade_component"],
            "grade": grade_appeal["current_grade"]
        })
    elif title == "Schedule Change Request" and schedule_change:
        timeline.update({
            "course_id": schedule_change["course_id"],
            "professor": schedule_change["professors"][0] if schedule_change["professors"] else None
        })

    new_request = await add_request(
        session=session,
        title=title,
        student_email=student_email,
        details=details,
        files=files,
        status="pending",
        created_date=datetime.now().date(),
        timeline=timeline
    )

    return {"message": "Request created successfully", "request_id": new_request.id}

@app.get("/student/{student_email}/courses")
async def get_student_courses(student_email: str, session: AsyncSession = Depends(get_session)):
    # Get all courses the student is enrolled in with their grades
    result = await session.execute(
        select(StudentCourses)
        .join(Courses, StudentCourses.course_id == Courses.id)
        .filter(StudentCourses.student_email == student_email)
    )
    student_courses = result.scalars().all()
    
    # Organize data by course name
    courses_data = {}
    for sc in student_courses:
        # Get the course name
        course_result = await session.execute(
            select(Courses).filter(Courses.id == sc.course_id)
        )
        course = course_result.scalars().first()
        
        if course:
            if course.name not in courses_data:
                courses_data[course.name] = []
            
            if sc.grade_component and sc.grade is not None:
                courses_data[course.name].append({
                    "course_id": course.id,
                    "grade_component": sc.grade_component,
                    "professor_email": sc.professor_email,
                    "grade": sc.grade
                })
    
    return {"courses": courses_data}

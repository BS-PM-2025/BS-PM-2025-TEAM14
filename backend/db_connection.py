import asyncio
import os
from sqlalchemy import Column, Integer, String, JSON, Date, ForeignKey, create_engine, Table, Float, Text
from sqlalchemy.orm import relationship, declarative_base, sessionmaker, Session
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from config import DATABASE_URL
from datetime import datetime
from sqlalchemy.sql import text
from sqlalchemy.future import select

# Define the base class
Base = declarative_base()

# User table
class Users(Base):
    __tablename__ = 'users'
    email = Column(String(100), unique=True, nullable=False, primary_key=True, index=True)
    id = Column(Integer, index=True, autoincrement=True)
    first_name = Column(String(100), unique=False, nullable=False)
    last_name = Column(String(100), unique=False, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)


# Student table
class Students(Base):
    __tablename__ = 'students'
    email = Column(String(100), ForeignKey('users.email'), unique=True, nullable=False, primary_key=True)

    courses = relationship("Courses", secondary="student_courses", back_populates="students")
    student_courses = relationship("StudentCourses", back_populates="student")
    requests = relationship("Requests", back_populates="student")
    grades = relationship("Grades", back_populates="student")


# Professor table
class Professors(Base):
    __tablename__ = 'professors'
    email = Column(String(100), ForeignKey('users.email'), unique=True, nullable=False, primary_key=True)
    department = Column(String(100), nullable=False)

    courses = relationship("Courses", back_populates="professor")
    student_courses = relationship("StudentCourses", back_populates="professor")
    grades = relationship("Grades", back_populates="professor")  # הוסף את המאפיין הזה

# Requests table
class Requests(Base):
    __tablename__ = 'requests'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(100), nullable=False)
    student_email = Column(String(100), ForeignKey('students.email'), nullable=False)
    details = Column(String(500))
    files = Column(JSON, nullable=True)
    status = Column(String(100))
    created_date = Column(Date, nullable=False)
    timeline = Column(JSON, nullable=True)

    # Relationships
    student = relationship("Students", back_populates="requests")
    responses = relationship("Responses", back_populates="request")

#grades

# Student-Courses table
class StudentCourses(Base):
    __tablename__ = 'student_courses'
    student_email = Column(String(100), ForeignKey('students.email'), primary_key=True)
    course_id = Column(String(20), ForeignKey('courses.id'), primary_key=True)
    professor_email = Column(String(100), ForeignKey('professors.email'), primary_key=True)

    # Relationships
    student = relationship("Students", back_populates="student_courses")
    course = relationship("Courses", back_populates="student_courses")
    professor = relationship("Professors", back_populates="student_courses")

class Grades(Base):
    __tablename__ = 'grades'
    student_email = Column(String(100), ForeignKey('students.email'), primary_key=True)
    course_id = Column(String(20), ForeignKey('courses.id'), primary_key=True)
    professor_email = Column(String(100), ForeignKey('professors.email'), primary_key=True)
    grade_component = Column(String(100), nullable=False, primary_key=True)
    grade = Column(Integer, nullable=False)

    # Relationships
    student = relationship("Students", back_populates="grades")
    course = relationship("Courses", back_populates="grades")
    professor = relationship("Professors", back_populates="grades")



# Courses table
class Courses(Base):
    __tablename__ = 'courses'
    id = Column(String(20), unique=True, nullable=False, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    credits = Column(Float, nullable=False)
    professor_email = Column(String(100), ForeignKey('professors.email'))

    # Relationships
    professor = relationship("Professors", back_populates="courses")
    students = relationship("Students", secondary="student_courses", back_populates="courses")
    student_courses = relationship("StudentCourses", back_populates="course")
    grades = relationship("Grades", back_populates="course")  # הוסף את המאפיין הזה



class Responses(Base):
    __tablename__ = 'responses'

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(Integer, ForeignKey('requests.id'), nullable=False)  # קשר לטבלת requests
    professor_email = Column(String(255), nullable=False)
    response_text = Column(Text, nullable=False)
    files = Column(JSON, nullable=True)  # לשמירת קבצים במבנה JSON
    created_date = Column(Date, default=datetime.now().date)

    request = relationship('Requests', back_populates='responses')


async def add_user(session: AsyncSession, email: str, first_name: str, last_name: str, hashed_password: str, role: str):
    existing_user = await session.execute(select(Users).filter(Users.email == email))
    if existing_user.scalar():
        raise ValueError(f"User with email {email} already exists.")

    new_user = Users(
        email=email,
        first_name=first_name,
        last_name=last_name,
        hashed_password=hashed_password,
        role=role
    )
    session.add(new_user)
    await session.flush()

    if role == "student":
        await add_student(session, email)
    elif role == "professor":
        await add_professor(session, email, None)  # Assuming department is nullable

    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return new_user


async def add_student(session: AsyncSession, email: str):
    new_student = Students(email=email)
    session.add(new_student)
    await session.commit()
    await session.refresh(new_student)
    return new_student

async def add_professor(session: AsyncSession, email: str, department: str):
    new_professor = Professors(email=email, department=department)
    session.add(new_professor)
    await session.commit()
    await session.refresh(new_professor)
    return new_professor

async def update_professor_department(session: AsyncSession, email: str, department: str):
    professor = await session.get(Professors, email)
    if professor:
        professor.department = department
        await session.commit()
        await session.refresh(professor)
        return professor
    return None

async def add_request(session: AsyncSession, title: str, student_email: str, details: str, files: dict = None, status: str = None, created_date: Date = None, timeline: dict = None):
    if created_date is None:
        created_date = datetime.now().date()

    if timeline is None:
        timeline = {
            "created": datetime.now().isoformat(),
            "status_changes": [
                {
                    "date": datetime.now().isoformat(),
                    "status": "not read"
                }
            ]
        }

    new_request = Requests(
        title=title,
        student_email=student_email,
        details=details,
        files=files,
        status=status,
        created_date=created_date,
        timeline=timeline
    )

    session.add(new_request)
    await session.commit()
    await session.refresh(new_request)
    return new_request


async def add_course(session: AsyncSession, id: str, name: str, description: str, credits: float, professor_email: str):
    new_course = Courses(
        id=id,
        name=name,
        description=description,
        credits=credits,
        professor_email=professor_email
    )
    session.add(new_course)
    await session.commit()
    await session.refresh(new_course)
    return new_course

async def add_student_course(session: AsyncSession, student_email: str, course_id: str, professor_email: str, grade_component: str, grade: int):
    new_student_course = StudentCourses(
        student_email=student_email,
        course_id=course_id,
        professor_email=professor_email,
        grade_component=grade_component,
        grade=grade
    )
    session.add(new_student_course)
    await session.commit()
    await session.refresh(new_student_course)
    return new_student_course



async def add_professor_response(session: AsyncSession, request_id: int, professor_email: str, response_text: str, files: dict = None):
    request = await session.get(Requests, request_id)

    if not request:
        raise ValueError(f"Request with ID {request_id} not found.")

    # יצירת התגובה
    new_response = Responses(
        request_id=request_id,
        professor_email=professor_email,
        response_text=response_text,
        files=files,
        created_date=datetime.now().date()
    )
    session.add(new_response)
    await session.commit()
    await session.refresh(new_response)

    new_timeline_entry = {
        "date": datetime.now().isoformat(),
        "status": "response added",
        "professor_response": response_text
    }

    if request.timeline:
        request.timeline.append(new_timeline_entry)
    else:
        request.timeline = [new_timeline_entry]

    await session.commit()
    await session.refresh(request)

    return new_response



async def assign_student_to_course(session: AsyncSession, student_email: str, course_id: str):
    result = await session.execute(
        select(Users).filter(Users.email == student_email, Users.role == "student")
    )
    student = result.scalar_one_or_none()

    result = await session.execute(
        select(Courses).filter(Courses.id == course_id)
    )
    course = result.scalar_one_or_none()

    result = await session.execute(
        select(StudentCourses).filter_by(
            student_email=student.email,
            course_id=course.id,
            professor_email=course.professor_email
        )
    )
    existing_relation = result.scalar_one_or_none()

    if existing_relation:
        return existing_relation

    student_course = StudentCourses(
        student_email=student.email,
        course_id=course.id,
        professor_email=course.professor_email
    )
    session.add(student_course)
    await session.commit()

    return student_course

async def assign_professor_to_course(session: AsyncSession, professor_email: str, course_id: str):
    result = await session.execute(select(Users).filter(Users.email == professor_email, Users.role == "professor"))
    professor = result.scalar_one_or_none()
    print(f"Professor: {professor}")  

    result = await session.execute(select(Courses).filter(Courses.id == course_id))
    course = result.scalar_one_or_none()
    print(f"Course: {course}")  

    if not professor or not course:
        raise Exception("Professor or course not found")

    course.professor_email = professor.email
    await session.commit()
    return course


# Create the asynchronous engine
engine = create_async_engine(DATABASE_URL, echo=True, future=True)

# Create the asynchronous session maker
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def init_db():
    # First create the database if it doesn't exist
    temp_engine = create_async_engine(DATABASE_URL.rsplit('/', 1)[0], echo=True, future=True)
    async with temp_engine.begin() as conn:
        await conn.execute(text("CREATE DATABASE IF NOT EXISTS students"))
    await temp_engine.dispose()

    # Now create the tables in the database
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# This will handle closing the session properly
async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session
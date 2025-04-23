import asyncio
import os
from sqlalchemy import Column, Integer, String, JSON, Date, ForeignKey, create_engine, Table, Float
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

# Professor table
class Professors(Base):
    __tablename__ = 'professors'
    email = Column(String(100), ForeignKey('users.email'), unique=True, nullable=False, primary_key=True)
    department = Column(String(100), nullable=False)
    
    courses = relationship("Courses", back_populates="professor")
    student_courses = relationship("StudentCourses", back_populates="professor")

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

# Student-Courses table
class StudentCourses(Base):
    __tablename__ = 'student_courses'
    student_email = Column(String(100), ForeignKey('students.email'), primary_key=True)
    course_id = Column(String(20), ForeignKey('courses.id'), primary_key=True)
    professor_email = Column(String(100), ForeignKey('professors.email'), primary_key=True)
    grade_component = Column(String(100), nullable=False, primary_key=True)
    grade = Column(Integer, nullable=False)
    
    # Relationships
    student = relationship("Students", back_populates="student_courses")
    course = relationship("Courses", back_populates="student_courses")
    professor = relationship("Professors", back_populates="student_courses")

# Courses table
class Courses(Base):
    __tablename__ = 'courses'
    id = Column(String(20), unique=True, nullable=False, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(String(500), nullable=True)
    credits = Column(Float, nullable=False)
    professor_email = Column(String(100), ForeignKey('professors.email'), nullable=False)
    
    # Relationships
    professor = relationship("Professors", back_populates="courses")
    students = relationship("Students", secondary="student_courses", back_populates="courses")
    student_courses = relationship("StudentCourses", back_populates="course")

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
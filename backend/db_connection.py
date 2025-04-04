import asyncio
import os
from sqlalchemy import Column, Integer, String, JSON, Date, ForeignKey, create_engine, Table
from sqlalchemy.orm import relationship, declarative_base, sessionmaker, Session
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from config import DATABASE_URL
from datetime import datetime

# Define the base class
Base = declarative_base()

# User table
class Users(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)

# Student table
class Students(Base):
    __tablename__ = 'students'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    grades = Column(JSON, nullable=True)
    user = relationship("Users", back_populates="student_profile")
    courses = relationship("Courses", secondary="student_courses", back_populates="students")

# Professor table
class Professors(Base):
    __tablename__ = 'professors'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, nullable=False)
    department = Column(String(100), nullable=False)

    user = relationship("Users", back_populates="professor_profile")
    courses = relationship("Courses", back_populates="professor")

# Requests table
class Requests(Base):
    __tablename__ = 'requests'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(100), nullable=False)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    details = Column(String(500))
    files = Column(JSON, nullable=True)
    status = Column(String(100), default='not read')
    created_date = Column(Date, nullable=False)
    timeline = Column(JSON, nullable=True)

    student = relationship("Students", back_populates="requests")

class Grades(Base):
    __tablename__ = "grades"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey("students.id"))
    course_id = Column(Integer, ForeignKey("courses.id"))
    grade = Column(Integer, nullable=False)

# Many-to-Many relationship table between Students and Courses
student_courses = Table(
    'student_courses', Base.metadata,
    Column('student_id', Integer, ForeignKey('students.id'), primary_key=True),
    Column('course_id', Integer, ForeignKey('courses.id'), primary_key=True)
)

# Courses table
class Courses(Base):
    __tablename__ = 'courses'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    description = Column(String(500), nullable=True)
    credits = Column(Integer, nullable=False)
    professor_id = Column(Integer, ForeignKey('professors.id'), nullable=False)
    professor = relationship("Professors", back_populates="courses")
    students = relationship("Students", secondary=student_courses, back_populates="courses")

# Back-populating relationships for Users
Users.student_profile = relationship("Students", back_populates="user", uselist=False)
Users.professor_profile = relationship("Professors", back_populates="user", uselist=False)

# Back-populating relationships for Requests
Students.requests = relationship("Requests", back_populates="student")


async def add_user(session: AsyncSession, username: str, email: str, password_hash: str, role: str):
    new_user = Users(username=username, email=email, password_hash=password_hash, role=role)
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return new_user

async def add_student(session: AsyncSession, user_id: int, name: str, email: str, grades: dict ):
    new_student = Students(user_id=user_id, name=name, email=email, grades=grades)
    session.add(new_student)
    await session.commit()
    await session.refresh(new_student)
    return new_student

async def add_professor(session: AsyncSession, user_id: int, department: str):
    new_professor = Professors(user_id=user_id, department=department)
    session.add(new_professor)
    await session.commit()
    await session.refresh(new_professor)
    return new_professor

async def add_request(session: AsyncSession, title: str, student_id: int, details: str, files: dict, status: str, created_date: Date, timeline: dict):
    new_request = Requests(title=title, student_id=student_id, details=details, files=files, status=status, created_date=created_date, timeline=timeline)
    session.add(new_request)
    await session.commit()
    await session.refresh(new_request)
    return new_request

async def add_course(session: AsyncSession, name: str, code: str, description: str, credits: int, professor_id: int):
    new_course = Courses(name=name, code=code, description=description, credits=credits, professor_id=professor_id)
    session.add(new_course)
    await session.commit()
    await session.refresh(new_course)
    return new_course







# Create the asynchronous engine
engine = create_async_engine(DATABASE_URL, echo=True, future=True)

# Create the asynchronous session maker
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def init_db():
    # Create the tables in the database (if they don't exist already)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# This will handle closing the session properly
async def get_session() -> AsyncSession:
    async with async_session() as session:
        yield session
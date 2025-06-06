import asyncio
import os
from sqlalchemy import Column, Integer, String, JSON, Date, ForeignKey, create_engine, Table, Float, Text, DateTime, Boolean
from sqlalchemy.orm import relationship, declarative_base, sessionmaker, Session, selectinload
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from backend.config import DATABASE_URL
from datetime import datetime
from sqlalchemy.sql import text
from sqlalchemy.future import select
from sqlalchemy.sql import and_, or_

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
    notifications = relationship("Notifications", back_populates="user")


# Student table
class Students(Base):
    __tablename__ = 'students'
    email = Column(String(100), ForeignKey('users.email'), unique=True, nullable=False, primary_key=True)
    department_id = Column(String(10), ForeignKey('departments.department_id'), nullable=True)
    courses = relationship("Courses", secondary="student_courses", back_populates="students")
    student_courses = relationship("StudentCourses", back_populates="student")
    requests = relationship("Requests", back_populates="student")
    grades = relationship("Grades", back_populates="student")
    department = relationship("Departments", back_populates="students")


# Professor table
class Professors(Base):
    __tablename__ = 'professors'
    email = Column(String(100), ForeignKey('users.email'), unique=True, nullable=False, primary_key=True)
    department_id = Column(String(10), ForeignKey('departments.department_id'), nullable=True)
    
    courses = relationship("Courses", back_populates="professor")
    student_courses = relationship("StudentCourses", back_populates="professor")
    grades = relationship("Grades", back_populates="professor")
    unavailability_periods = relationship("ProfessorUnavailability", back_populates="professor")
    department = relationship("Departments", back_populates="professors")

class ProfessorUnavailability(Base):
    __tablename__ = 'professor_unavailability'
    id = Column(Integer, primary_key=True, autoincrement=True)
    professor_email = Column(String(100), ForeignKey('professors.email'), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    reason = Column(String(255))
    created_at = Column(DateTime, default=datetime.now)

    professor = relationship("Professors", back_populates="unavailability_periods")

# Requests table
class Requests(Base):
    __tablename__ = 'requests'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(100), nullable=False)
    student_email = Column(String(100), ForeignKey('students.email'), nullable=False)
    details = Column(String(500))
    course_id = Column(String(20), nullable=True)
    course_component = Column(String(50), nullable=True)
    files = Column(JSON, nullable=True)
    status = Column(String(100))
    created_date = Column(Date, nullable=False)
    timeline = Column(JSON, nullable=True)

    # Relationships
    student = relationship("Students", back_populates="requests")
    responses = relationship("Responses", back_populates="request")
    notifications = relationship("Notifications", back_populates="request")

# Notifications table
class Notifications(Base):
    __tablename__ = 'notifications'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_email = Column(String(100), ForeignKey('users.email'), nullable=False)
    request_id = Column(Integer, ForeignKey('requests.id'), nullable=False)
    message = Column(String(500), nullable=False)
    is_read = Column(Boolean, default=False)
    created_date = Column(DateTime, default=datetime.now)
    type = Column(String(50), nullable=False)  # e.g., 'transfer', 'response', 'status_change'

    # Relationships
    user = relationship("Users", back_populates="notifications")
    request = relationship("Requests", back_populates="notifications")

# System Announcements table for admin messages and AI-generated news
class SystemAnnouncements(Base):
    __tablename__ = 'system_announcements'
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    admin_email = Column(String(100), ForeignKey('users.email'), nullable=True)  # null for AI-generated
    is_active = Column(Boolean, default=True)
    announcement_type = Column(String(50), nullable=False, default='admin')  # 'admin' or 'ai_news'
    created_date = Column(DateTime, default=datetime.now)
    expires_date = Column(DateTime, nullable=True)  # optional expiration date
    
    # Relationship
    admin = relationship("Users", foreign_keys=[admin_email])

# Request Routing Rules table
class RequestRoutingRules(Base):
    __tablename__ = "request_routing_rules"
    type = Column(String(100), primary_key=True, index=True)
    destination = Column(String(100), nullable=False) 

# Request Templates table - for admin-defined request types
class RequestTemplates(Base):
    __tablename__ = "request_templates"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)  # e.g., "Military Service Request"
    description = Column(Text, nullable=True)  # Description for admins
    is_active = Column(Boolean, default=True)
    created_by = Column(String(100), ForeignKey('users.email'), nullable=False)
    created_date = Column(DateTime, default=datetime.now)
    updated_date = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    creator = relationship("Users", foreign_keys=[created_by])
    fields = relationship("RequestTemplateFields", back_populates="template", cascade="all, delete-orphan")
    routing_rule = relationship("RequestRoutingRules", foreign_keys="RequestTemplates.name", primaryjoin="RequestTemplates.name == RequestRoutingRules.type", uselist=False)

# Request Template Fields table - defines the form fields for each template
class RequestTemplateFields(Base):
    __tablename__ = "request_template_fields"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey('request_templates.id'), nullable=False)
    field_name = Column(String(100), nullable=False)  # e.g., "military_service_type"
    field_label = Column(String(200), nullable=False)  # e.g., "Type of Military Service"
    field_type = Column(String(50), nullable=False)  # text, textarea, select, file, date, number
    field_options = Column(JSON, nullable=True)  # For select fields: {"options": ["option1", "option2"]}
    is_required = Column(Boolean, default=False)
    field_order = Column(Integer, default=0)  # For ordering fields in the form
    validation_rules = Column(JSON, nullable=True)  # {"min_length": 10, "max_length": 500}
    placeholder = Column(String(200), nullable=True)  # Placeholder text
    help_text = Column(Text, nullable=True)  # Help text for the field
    
    # Relationships
    template = relationship("RequestTemplates", back_populates="fields")

    # Unique constraint to prevent duplicate field names within the same template
    __table_args__ = (
        {"extend_existing": True}
    )

# Request Deadline Configuration table - for admin-defined deadlines per request type
class RequestDeadlineConfig(Base):
    __tablename__ = "request_deadline_config"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    request_type = Column(String(100), unique=True, nullable=False)  # e.g., "General Request"
    deadline_days = Column(Integer, nullable=False)  # Number of days from creation date
    is_active = Column(Boolean, default=True)
    created_by = Column(String(100), ForeignKey('users.email'), nullable=False)
    created_date = Column(DateTime, default=datetime.now)
    updated_date = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationships
    creator = relationship("Users", foreign_keys=[created_by])

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
    department_id = Column(String(10), ForeignKey('departments.department_id'))

    # Relationships
    professor = relationship("Professors", back_populates="courses")
    students = relationship("Students", secondary="student_courses", back_populates="courses")
    student_courses = relationship("StudentCourses", back_populates="course")
    grades = relationship("Grades", back_populates="course")  # הוסף את המאפיין הזה

class CommentTemplate(Base):
    __tablename__ = "comment_templates"

    id = Column(Integer, primary_key=True, index=True)
    professor_email = Column(String(100), ForeignKey("professors.email"))
    title = Column(String(255))
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    professor = relationship("Professors")

class Responses(Base):
    __tablename__ = 'responses'

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(Integer, ForeignKey('requests.id'), nullable=False)  # קשר לטבלת requests
    professor_email = Column(String(255), nullable=False)
    response_text = Column(Text, nullable=False)
    files = Column(JSON, nullable=True)  # לשמירת קבצים במבנה JSON
    created_date = Column(Date, default=datetime.now().date)

    request = relationship('Requests', back_populates='responses')

# Secretary table
class Secretaries(Base):
    __tablename__ = 'secretaries'
    email = Column(String(100), ForeignKey('users.email'), unique=True, nullable=False, primary_key=True)
    department_id = Column(String(10), ForeignKey('departments.department_id'), nullable=False)
    department = relationship("Departments", back_populates="secretaries")

# Update Departments table to include relationships
class Departments(Base):
    __tablename__ = 'departments'
    department_id = Column(String(10), primary_key=True)  
    department_name = Column(String(100), unique=True, nullable=False)
    students = relationship("Students", back_populates="department")
    professors = relationship("Professors", back_populates="department")
    secretaries = relationship("Secretaries", back_populates="department")

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


async def add_student(session: AsyncSession, email: str, department_id: str = None):
    new_student = Students(email=email, department_id=department_id)
    session.add(new_student)
    await session.commit()
    await session.refresh(new_student)
    return new_student

async def add_professor(session: AsyncSession, email: str, department_id: str = None):
    new_professor = Professors(email=email, department_id=department_id)
    session.add(new_professor)
    await session.commit()
    await session.refresh(new_professor)
    return new_professor

async def add_secretary(session: AsyncSession, email: str, department_id: str):
    new_secretary = Secretaries(email=email, department_id=department_id)
    session.add(new_secretary)
    await session.commit()
    await session.refresh(new_secretary)
    return new_secretary

async def update_professor_department(session: AsyncSession, email: str, department_id: str):
    professor = await session.get(Professors, email)
    if professor:
        professor.department_id = department_id
        await session.commit()
        await session.refresh(professor)
        return professor
    return None

async def update_student_department(session: AsyncSession, email: str, department_id: str):
    student = await session.get(Students, email)
    if student:
        student.department_id = department_id
        await session.commit()
        await session.refresh(student)
        return student
    return None

async def update_secretary_department(session: AsyncSession, email: str, department_id: str):
    secretary = await session.get(Secretaries, email)
    if secretary:
        secretary.department_id = department_id
        await session.commit()
        await session.refresh(secretary)
        return secretary
    return None

async def add_request(session: AsyncSession, title: str, student_email: str, details: str, course_id:str = None, course_component: str = None, files: dict = None, status: str = None, created_date: Date = None, timeline: dict = None):
    if created_date is None:
        created_date = datetime.now().date()
    
    new_request = Requests(
        title=title,
        student_email=student_email,
        details=details,
        files=files,
        status=status,
        created_date=created_date,
        timeline=timeline,
        course_id = course_id,
        course_component = course_component
    )
    session.add(new_request)
    await session.commit()
    await session.refresh(new_request)
    return new_request

async def create_notification(session: AsyncSession, user_email: str, request_id: int, message: str, type: str):
    """Create a new notification for a user."""
    notification = Notifications(
        user_email=user_email,
        request_id=request_id,
        message=message,
        type=type
    )
    session.add(notification)
    await session.commit()
    await session.refresh(notification)
    return notification

async def get_user_notifications(session: AsyncSession, user_email: str, limit: int = 50):
    """Get notifications for a specific user."""
    try:
        print(f"Executing query for user: {user_email}")
        print(f"Session type: {type(session)}")
        print(f"Session state: {session.is_active}")
        
        # First verify the user exists
        user_result = await session.execute(select(Users).where(Users.email == user_email))
        user = user_result.scalar_one_or_none()
        if not user:
            print(f"User {user_email} not found")
            return []
            
        result = await session.execute(
            select(Notifications)
            .where(Notifications.user_email == user_email)
            .order_by(Notifications.created_date.desc())
            .limit(limit)
        )
        notifications = result.scalars().all()
        print(f"Query executed successfully, found {len(notifications)} notifications")
        return notifications
    except Exception as e:
        print(f"Error in get_user_notifications: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        raise

async def mark_notification_as_read(session: AsyncSession, notification_id: int):
    """Mark a notification as read."""
    result = await session.execute(
        select(Notifications).where(Notifications.id == notification_id)
    )
    notification = result.scalar_one_or_none()
    if notification:
        notification.is_read = True
        await session.commit()
        return True
    return False

async def mark_all_notifications_as_read(session: AsyncSession, user_email: str):
    """Mark all notifications for a user as read."""
    result = await session.execute(
        select(Notifications).where(
            and_(
                Notifications.user_email == user_email,
                Notifications.is_read == False
            )
        )
    )
    notifications = result.scalars().all()
    for notification in notifications:
        notification.is_read = True
    await session.commit()
    return len(notifications)

async def create_system_announcement(session: AsyncSession, title: str, message: str, admin_email: str = None, announcement_type: str = 'admin', expires_date: datetime = None):
    """Create a new system announcement."""
    announcement = SystemAnnouncements(
        title=title,
        message=message,
        admin_email=admin_email,
        announcement_type=announcement_type,
        expires_date=expires_date
    )
    session.add(announcement)
    await session.commit()
    await session.refresh(announcement)
    return announcement

async def get_active_system_announcements(session: AsyncSession):
    """Get all active system announcements that haven't expired."""
    result = await session.execute(
        select(SystemAnnouncements)
        .where(
            and_(
                SystemAnnouncements.is_active == True,
                or_(
                    SystemAnnouncements.expires_date.is_(None),
                    SystemAnnouncements.expires_date > datetime.now()
                )
            )
        )
        .order_by(SystemAnnouncements.created_date.desc())
    )
    return result.scalars().all()

async def deactivate_system_announcement(session: AsyncSession, announcement_id: int):
    """Deactivate a system announcement."""
    result = await session.execute(
        select(SystemAnnouncements).where(SystemAnnouncements.id == announcement_id)
    )
    announcement = result.scalar_one_or_none()
    if announcement:
        announcement.is_active = False
        await session.commit()
        return True
    return False

async def get_system_announcements_for_admin(session: AsyncSession, admin_email: str = None):
    """Get all system announcements for admin management."""
    query = select(SystemAnnouncements).order_by(SystemAnnouncements.created_date.desc())
    if admin_email:
        query = query.where(SystemAnnouncements.admin_email == admin_email)
    
    result = await session.execute(query)
    return result.scalars().all()

async def add_course(session: AsyncSession, id: str, name: str, description: str, credits: float, professor_email: str, department_id: str = None):
    new_course = Courses(
        id=id,
        name=name,
        description=description,
        credits=credits,
        professor_email=professor_email,
        department_id=department_id
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

# Request Template Management Functions

async def create_request_template(session: AsyncSession, name: str, description: str, created_by: str, fields: list):
    """Create a new request template with its fields."""
    template = RequestTemplates(
        name=name,
        description=description,
        created_by=created_by
    )
    session.add(template)
    await session.flush()  # Get the template ID
    
    # Add fields
    for field_data in fields:
        field = RequestTemplateFields(
            template_id=template.id,
            field_name=field_data['field_name'],
            field_label=field_data['field_label'],
            field_type=field_data['field_type'],
            field_options=field_data.get('field_options'),
            is_required=field_data.get('is_required', False),
            field_order=field_data.get('field_order', 0),
            validation_rules=field_data.get('validation_rules'),
            placeholder=field_data.get('placeholder'),
            help_text=field_data.get('help_text')
        )
        session.add(field)
    
    await session.commit()
    await session.refresh(template)
    return template

async def get_request_templates(session: AsyncSession, active_only: bool = True):
    """Get all request templates with their fields."""
    query = select(RequestTemplates).options(
        selectinload(RequestTemplates.fields)
    )
    if active_only:
        query = query.where(RequestTemplates.is_active == True)
    
    result = await session.execute(query.order_by(RequestTemplates.created_date.desc()))
    return result.scalars().all()

async def get_request_template_by_id(session: AsyncSession, template_id: int):
    """Get a specific request template with its fields."""
    query = select(RequestTemplates).options(
        selectinload(RequestTemplates.fields)
    ).where(RequestTemplates.id == template_id)
    
    result = await session.execute(query)
    return result.scalar_one_or_none()

async def get_request_template_by_name(session: AsyncSession, name: str):
    """Get a specific request template by name with its fields."""
    query = select(RequestTemplates).options(
        selectinload(RequestTemplates.fields)
    ).where(RequestTemplates.name == name)
    
    result = await session.execute(query)
    return result.scalar_one_or_none()

async def update_request_template(session: AsyncSession, template_id: int, name: str = None, description: str = None, fields: list = None):
    """Update a request template and optionally its fields."""
    template = await get_request_template_by_id(session, template_id)
    if not template:
        return None
    
    if name:
        template.name = name
    if description is not None:
        template.description = description
    
    template.updated_date = datetime.now()
    
    # Update fields if provided
    if fields is not None:
        # Delete existing fields
        await session.execute(
            select(RequestTemplateFields).where(RequestTemplateFields.template_id == template_id)
        )
        existing_fields = await session.execute(
            select(RequestTemplateFields).where(RequestTemplateFields.template_id == template_id)
        )
        for field in existing_fields.scalars():
            await session.delete(field)
        
        # Add new fields
        for field_data in fields:
            field = RequestTemplateFields(
                template_id=template.id,
                field_name=field_data['field_name'],
                field_label=field_data['field_label'],
                field_type=field_data['field_type'],
                field_options=field_data.get('field_options'),
                is_required=field_data.get('is_required', False),
                field_order=field_data.get('field_order', 0),
                validation_rules=field_data.get('validation_rules'),
                placeholder=field_data.get('placeholder'),
                help_text=field_data.get('help_text')
            )
            session.add(field)
    
    await session.commit()
    await session.refresh(template)
    return template

async def delete_request_template(session: AsyncSession, template_id: int):
    """Soft delete a request template by setting is_active to False."""
    template = await get_request_template_by_id(session, template_id)
    if not template:
        return False
    
    template.is_active = False
    await session.commit()
    return True

async def get_active_request_template_names(session: AsyncSession):
    """Get list of active request template names for use in forms."""
    result = await session.execute(
        select(RequestTemplates.name)
        .where(RequestTemplates.is_active == True)
        .order_by(RequestTemplates.name)
    )
    return [name for name in result.scalars()]

# Request Deadline Management Functions

async def create_or_update_deadline_config(session: AsyncSession, request_type: str, deadline_days: int, created_by: str):
    """Create or update deadline configuration for a request type."""
    # Check if config already exists
    result = await session.execute(
        select(RequestDeadlineConfig).where(RequestDeadlineConfig.request_type == request_type)
    )
    existing_config = result.scalar_one_or_none()
    
    if existing_config:
        # Update existing
        existing_config.deadline_days = deadline_days
        existing_config.updated_date = datetime.now()
        await session.commit()
        await session.refresh(existing_config)
        return existing_config
    else:
        # Create new
        new_config = RequestDeadlineConfig(
            request_type=request_type,
            deadline_days=deadline_days,
            created_by=created_by
        )
        session.add(new_config)
        await session.commit()
        await session.refresh(new_config)
        return new_config

async def get_deadline_config(session: AsyncSession, request_type: str):
    """Get deadline configuration for a specific request type."""
    result = await session.execute(
        select(RequestDeadlineConfig)
        .where(RequestDeadlineConfig.request_type == request_type)
        .where(RequestDeadlineConfig.is_active == True)
    )
    return result.scalar_one_or_none()

async def get_all_deadline_configs(session: AsyncSession, active_only: bool = True):
    """Get all deadline configurations."""
    query = select(RequestDeadlineConfig)
    if active_only:
        query = query.where(RequestDeadlineConfig.is_active == True)
    
    result = await session.execute(query.order_by(RequestDeadlineConfig.request_type))
    return result.scalars().all()

async def delete_deadline_config(session: AsyncSession, request_type: str):
    """Soft delete a deadline configuration."""
    result = await session.execute(
        select(RequestDeadlineConfig).where(RequestDeadlineConfig.request_type == request_type)
    )
    config = result.scalar_one_or_none()
    
    if config:
        config.is_active = False
        await session.commit()
        return True
    return False

def is_request_expired(request, deadline_config):
    """Helper function to check if a request is expired based on deadline config."""
    if not deadline_config:
        return False
    
    from datetime import date, timedelta
    expiration_date = request.created_date + timedelta(days=deadline_config.deadline_days)
    return date.today() > expiration_date

def get_request_deadline_date(request, deadline_config):
    """Helper function to get the deadline date for a request."""
    if not deadline_config:
        return None
    
    from datetime import timedelta
    return request.created_date + timedelta(days=deadline_config.deadline_days)

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
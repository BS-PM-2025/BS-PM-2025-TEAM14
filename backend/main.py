import os
import shutil
import time
import asyncio
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
import urllib.parse
from fastapi import FastAPI, UploadFile, File, Form, Response, Depends, HTTPException, status, Body, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from sqlalchemy import select, literal, literal_column, ColumnElement, delete, and_, update
import json
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.attributes import flag_modified
from starlette.requests import Request
from starlette.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db_connection import *
import bcrypt
import cryptography
import jwt
from typing import Optional
from datetime import datetime, timedelta
from fastapi import HTTPException
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from pydantic import BaseModel, constr
from typing import List, Dict, Any
import backend.email_service as email_service
try:
    # Works on PyJWT < 2.10
    from jwt.exceptions import InvalidTokenError as PyJWTError
except ImportError:
    # Works on PyJWT >= 2.10
    from jwt.exceptions import JWTError as PyJWTError

# Import OpenAI directly for news generation
try:
    from openai import AsyncOpenAI
    OPENAI_AVAILABLE = True
    print("DEBUG: OpenAI module imported successfully for news generation")
    
    # Initialize OpenAI client for news generation
    openai_api_key = os.environ.get('OPENAI_API_KEY')
    if openai_api_key:
        try:
            news_openai_client = AsyncOpenAI(api_key=openai_api_key)
            print("DEBUG: News OpenAI client initialized")
        except Exception as e:
            print(f"ERROR: Failed to initialize news OpenAI client: {e}")
            OPENAI_AVAILABLE = False
    else:
        print("DEBUG: OpenAI API key not found for news generation")
        OPENAI_AVAILABLE = False
except ImportError:
    OPENAI_AVAILABLE = False
    print("DEBUG: OpenAI module not available for news generation")

# Import the AI Service - using the Python wrapper (for chatbot only)
from backend.AIService import processMessage

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
DOCUMENTS_ROOT = Path("Documents")


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

def verify_token_admin(token_data: dict = Depends(verify_token)):
    if token_data.get("role") not in ["admin", "secretary"]:  # Allow both admin and secretary to manage announcements
        print("Bad role in token")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized: Admin or Secretary role required")
    print("Authorized as admin/secretary")
    return token_data

###

from contextlib import asynccontextmanager

# Global variable to control the background task
background_task_running = False

async def auto_generate_news_task():
    """Background task that automatically generates news when expired ones are found"""
    global background_task_running
    print("🤖 Auto news generation task started!")
    
    while background_task_running:
        try:
            # Check every hour for expired news
            await asyncio.sleep(3600)  # Wait 1 hour
            
            # Get database session
            async with async_session() as session:
                # Check if there are any active AI news
                result = await session.execute(
                    select(SystemAnnouncements)
                    .where(
                        and_(
                            SystemAnnouncements.announcement_type == 'ai_news',
                            SystemAnnouncements.is_active == True,
                            SystemAnnouncements.expires_date > datetime.now()
                        )
                    )
                )
                active_ai_news = result.scalars().all()
                
                print(f"🔍 Found {len(active_ai_news)} active AI news items")
                
                # If less than 3 active AI news, generate new ones
                if len(active_ai_news) < 3:
                    print("⚡ Generating new AI news automatically...")
                    await generate_ai_news_batch(session)
                    
        except Exception as e:
            print(f"❌ Error in auto news generation: {str(e)}")
            
    print("🛑 Auto news generation task stopped!")

async def generate_ai_news_batch(session: AsyncSession):
    """Generate 10 AI news items"""
    try:
        # News categories for variety
        news_categories = [
            "breaking international news or current events",
            "economic developments or market updates", 
            "sports achievements or major sporting events",
            "political developments or government policy changes",
            "scientific discoveries or technological breakthroughs",
            "environmental news or climate updates",
            "health and medical news or breakthrough research",
            "cultural events or entertainment industry news",
            "business mergers, acquisitions, or corporate developments",
            "social issues or humanitarian developments"
        ]
        
        created_count = 0
        
        # Generate 10 different news items
        for i, category in enumerate(news_categories, 1):
            try:
                # Generate news content directly using OpenAI (not through chatbot service)
                news_response = await generate_news_content(category)
                
                if news_response.get('success') and news_response.get('content'):
                    # Create the announcement with AI type
                    result = await create_system_announcement(
                        session=session,
                        title=f"World News #{i}",
                        message=news_response['content'],
                        admin_email=None,  # No admin email for AI-generated content
                        announcement_type='ai_news',
                        expires_date=datetime.now() + timedelta(hours=24)  # Expire after 24 hours
                    )
                    
                    created_count += 1
                    print(f"✅ Auto-generated news {i}/10: {category} (source: {news_response.get('source', 'unknown')})")
                    
                else:
                    print(f"❌ Failed to auto-generate news for category: {category}")
                    
            except Exception as e:
                print(f"❌ Error auto-generating news for category {category}: {str(e)}")
                continue
        
        print(f"🎉 Auto-generated {created_count} news items successfully!")
        return created_count
        
    except Exception as e:
        print(f"❌ Error in generate_ai_news_batch: {str(e)}")
        return 0

@asynccontextmanager
async def lifespan(app: FastAPI):
    global background_task_running
    # Initialize database on startup
    await init_db()
    
    # Start background task for auto news generation
    background_task_running = True
    asyncio.create_task(auto_generate_news_task())
    print("🚀 Background news generation task started!")
    
    yield
    
    # Clean up on shutdown
    background_task_running = False
    print("🛑 Background news generation task stopped!")

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
    start_time = time.time()
    end_time = time.time()
    print(f"home run-time is {end_time - start_time:.3f} sec")
    return {"message": "Welcome to FastAPI Backend!"}


@app.post("/login")
async def login(request: Request, session: AsyncSession = Depends(get_session)):
    start_time = time.time()
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
            end_time = time.time()
            print(f"login run-time is {end_time - start_time:.3f} sec")
            return {"access_token": access_token, "token_type": "bearer", "message": "Login successful"}
        else:
            end_time = time.time()
            print(f"login run-time is {end_time - start_time:.3f} sec")
            raise HTTPException(status_code=401, detail="Invalid password")
    else:
        end_time = time.time()
        print(f"login run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(status_code=404, detail="User not found")


# AI Service endpoint
@app.post("/api/ai/chat")
async def ai_chat(chat_request: ChatRequest):
    start_time = time.time()
    try:
        print(f"\nAPI DEBUG: Received chat request - message: '{chat_request.message}', language: {chat_request.language}")
        
        # Process the message through the AI service
        response = await processMessage(chat_request.message, chat_request.language)
        
        print(f"API DEBUG: AI response - source: {response.get('source')}, success: {response.get('success')}")
        end_time = time.time()
        print(f"ai_chat run-time is {end_time - start_time:.3f} sec")
        return response
    except Exception as e:
        end_time = time.time()
        print(f"ai_chat run-time is {end_time - start_time:.3f} sec")
        print(f"API ERROR: Error processing message: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing message: {str(e)}"
        )


# System Announcements endpoints
class AnnouncementRequest(BaseModel):
    title: str
    message: str
    expires_date: Optional[str] = None

@app.post("/api/admin/announcements")
async def create_announcement(
    announcement: AnnouncementRequest,
    token_data: dict = Depends(verify_token_admin),
    session: AsyncSession = Depends(get_session)
):
    """Create a new system announcement (Admin only)"""
    start_time = time.time()
    try:
        expires_date = None
        if announcement.expires_date:
            expires_date = datetime.fromisoformat(announcement.expires_date.replace('Z', '+00:00'))
        
        result = await create_system_announcement(
            session=session,
            title=announcement.title,
            message=announcement.message,
            admin_email=token_data.get("user_email"),
            announcement_type='admin',
            expires_date=expires_date
        )
        
        end_time = time.time()
        print(f"create_announcement run-time is {end_time - start_time:.3f} sec")
        return {
            "message": "Announcement created successfully",
            "announcement_id": result.id
        }
    except Exception as e:
        end_time = time.time()
        print(f"create_announcement run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(
            status_code=500,
            detail=f"Error creating announcement: {str(e)}"
        )

@app.get("/api/announcements")
async def get_active_announcements(session: AsyncSession = Depends(get_session)):
    """Get all active system announcements for all users"""
    start_time = time.time()
    try:
        announcements = await get_active_system_announcements(session)
        end_time = time.time()
        print(f"get_active_announcements run-time is {end_time - start_time:.3f} sec")
        return [
            {
                "id": ann.id,
                "title": ann.title,
                "message": ann.message,
                "admin_email": ann.admin_email,
                "announcement_type": ann.announcement_type,
                "created_date": ann.created_date.isoformat(),
                "expires_date": ann.expires_date.isoformat() if ann.expires_date else None
            }
            for ann in announcements
        ]
    except Exception as e:
        end_time = time.time()
        print(f"get_active_announcements run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching announcements: {str(e)}"
        )

@app.get("/api/admin/announcements")
async def get_all_announcements(
    token_data: dict = Depends(verify_token_admin),
    session: AsyncSession = Depends(get_session)
):
    """Get all system announcements for admin management"""
    start_time = time.time()
    try:
        announcements = await get_system_announcements_for_admin(session)
        end_time = time.time()
        print(f"get_all_announcements run-time is {end_time - start_time:.3f} sec")
        return [
            {
                "id": ann.id,
                "title": ann.title,
                "message": ann.message,
                "admin_email": ann.admin_email,
                "announcement_type": ann.announcement_type,
                "is_active": ann.is_active,
                "created_date": ann.created_date.isoformat(),
                "expires_date": ann.expires_date.isoformat() if ann.expires_date else None
            }
            for ann in announcements
        ]
    except Exception as e:
        end_time = time.time()
        print(f"get_all_announcements run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching announcements: {str(e)}"
        )

@app.delete("/api/admin/announcements/{announcement_id}")
async def deactivate_announcement(
    announcement_id: int,
    token_data: dict = Depends(verify_token_admin),
    session: AsyncSession = Depends(get_session)
):
    """Deactivate a system announcement (Admin only)"""
    start_time = time.time()
    try:
        success = await deactivate_system_announcement(session, announcement_id)
        end_time = time.time()
        print(f"deactivate_announcement run-time is {end_time - start_time:.3f} sec")
        if success:
            return {"message": "Announcement deactivated successfully"}
        else:
            raise HTTPException(status_code=404, detail="Announcement not found")
    except Exception as e:
        end_time = time.time()
        print(f"deactivate_announcement run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(
            status_code=500,
            detail=f"Error deactivating announcement: {str(e)}"
        )

@app.post("/api/admin/generate-ai-news")
async def generate_ai_news(
    token_data: dict = Depends(verify_token_admin),
    session: AsyncSession = Depends(get_session)
):
    """Generate 10 real-world AI news announcements (Admin only)"""
    start_time = time.time()
    try:
        # News categories for variety
        news_categories = [
            "breaking international news or current events",
            "economic developments or market updates", 
            "sports achievements or major sporting events",
            "political developments or government policy changes",
            "scientific discoveries or technological breakthroughs",
            "environmental news or climate updates",
            "health and medical news or breakthrough research",
            "cultural events or entertainment industry news",
            "business mergers, acquisitions, or corporate developments",
            "social issues or humanitarian developments"
        ]
        
        created_announcements = []
        
        # Generate 10 different news items
        for i, category in enumerate(news_categories, 1):
            try:
                # Generate news content directly using OpenAI (not through chatbot service)
                news_response = await generate_news_content(category)
                
                if news_response.get('success') and news_response.get('content'):
                    # Create the announcement with AI type
                    result = await create_system_announcement(
                        session=session,
                        title=f"World News #{i}",
                        message=news_response['content'],
                        admin_email=None,  # No admin email for AI-generated content
                        announcement_type='ai_news',
                        expires_date=datetime.now() + timedelta(hours=24)  # Expire after 24 hours
                    )
                    
                    created_announcements.append({
                        "id": result.id,
                        "category": category,
                        "content": news_response['content'],
                        "source": news_response.get('source', 'unknown')
                    })
                    
                    print(f"Generated news {i}/10: {category} (source: {news_response.get('source', 'unknown')})")
                    
                else:
                    print(f"Failed to generate news for category: {category}")
                    
            except Exception as e:
                print(f"Error generating news for category {category}: {str(e)}")
                continue
        
        end_time = time.time()
        print(f"generate_ai_news run-time is {end_time - start_time:.3f} sec")
        
        if created_announcements:
            return {
                "message": f"Successfully generated {len(created_announcements)} AI news items",
                "count": len(created_announcements),
                "announcements": created_announcements
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to generate any AI news content")
            
    except Exception as e:
        end_time = time.time()
        print(f"generate_ai_news run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating AI news: {str(e)}"
        )

@app.get("/databases")
def list_databases():
    start_time = time.time()
    end_time = time.time()
    print(f"list_databases run-time is {end_time - start_time:.3f} sec")
    return {"databases": None}


@app.get("/tables/{database_name}")
def list_tables(database_name: str):
    start_time = time.time()
    end_time = time.time()
    print(f"list_tables run-time is {end_time - start_time:.3f} sec")
    return {"tables": None}





@app.post("/uploadfile/{userEmail}")
async def upload_file(userEmail: str, file: UploadFile = File(...), fileType: str = Form(...)):
    start_time = time.time()
    try:
        # Validate file size (example: 10MB limit)
        MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB in bytes
        file_content = await file.read()
        file_size = len(file_content)
        
        if file_size > MAX_FILE_SIZE:
            end_time = time.time()
            print(f"upload_file run-time is {end_time - start_time:.3f} sec")
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

        end_time = time.time()
        print(f"upload_file run-time is {end_time - start_time:.3f} sec")
        return {
            "message": "File uploaded successfully",
            "path": f"{userEmail}/{fileType}/{file.filename}"
        }
    except Exception as e:
        end_time = time.time()
        print(f"upload_file run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading file: {str(e)}"
        )


@app.get("/reloadFiles/{userEmail}")
async def reload_files(userEmail: str):
    start_time = time.time()
    root_path = DOCUMENTS_ROOT / userEmail
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
    end_time = time.time()
    print(f"reload_files run-time is {end_time - start_time:.3f} sec")
    return {"files": files, "file_paths": file_paths}


@app.get("/downloadFile/{userId}/{file_path:path}")
async def download_file(userId: str, file_path: str):
    start_time = time.time()
    print(f"Download request - userId: {userId}, file_path: {file_path}")
    
    # Decode both the user ID and filename from URL encoding
    decoded_user_id = urllib.parse.unquote(userId)
    decoded_filename = urllib.parse.unquote(file_path)
    print(f"Decoded user ID: {decoded_user_id}")
    print(f"Decoded filename: {decoded_filename}")
    
    # List of possible file types where files might be stored
    possible_file_types = [
        "gradeAppeal",
        "militaryService", 
        "scheduleChange",
        "examAccommodation",
        "general",
        "requests"
    ]
    
    # Try to find the file in different possible locations
    file_found = False
    absolute_path = None
    
    for file_type in possible_file_types:
        # Construct the full file path: Documents/{userEmail}/{fileType}/{filename}
        full_path = os.path.join("Documents", decoded_user_id, file_type, decoded_filename)
        absolute_path = os.path.abspath(full_path)
        print(f"Trying path: {absolute_path}")
        
        if os.path.isfile(absolute_path):
            file_found = True
            print(f"File found at: {absolute_path}")
            break
    
    # If not found in fileType subdirectories, try direct path
    if not file_found:
        direct_path = os.path.join("Documents", decoded_user_id, decoded_filename)
        direct_absolute = os.path.abspath(direct_path)
        print(f"Trying direct path: {direct_absolute}")
        
        if os.path.isfile(direct_absolute):
            absolute_path = direct_absolute
            file_found = True
            print(f"File found at direct path: {absolute_path}")
    
    # If still not found, return 404
    if not file_found:
        end_time = time.time()
        print(f"download_file run-time is {end_time - start_time:.3f} sec")
        print(f"File not found in any location!")
        raise HTTPException(status_code=404, detail="File not found")

    end_time = time.time()
    print(f"download_file run-time is {end_time - start_time:.3f} sec")
    return FileResponse(absolute_path, filename=os.path.basename(absolute_path))


@app.get("/requests/{user_email}")
async def get_requests(
    user_email: str, 
    student_email: Optional[str] = None,  # New parameter for filtering by student
    session: AsyncSession = Depends(get_session)
):
    start_time = time.time()
    try:
        # Fetch the user role from the database based on the email
        result = await session.execute(select(Users).filter(Users.email == user_email))
        user = result.scalar_one_or_none()

        if not user:
            end_time = time.time()
            print(f"get_requests run-time is {end_time - start_time:.3f} sec")
            raise HTTPException(status_code=404, detail="User not found")

        # If the user is a secretary, return all relevant requests
        if user.role == "secretary":
            secretary_result = await session.execute(select(Secretaries).where(Secretaries.email == user_email))
            secretary = secretary_result.scalar_one_or_none()
            if not secretary:
                end_time = time.time()
                print(f"get_requests run-time is {end_time - start_time:.3f} sec")
                raise HTTPException(status_code=404, detail="Secretary not found")
            department = secretary.department_id
            
            # Base query for department requests
            query = (
                select(Requests)
                .join(Students, Requests.student_email == Students.email)
                .where(Students.department_id == department)
            )
            
            # Add student email filter if provided
            if student_email:
                query = query.where(Requests.student_email == student_email)
            
            relevant_requests_result = await session.execute(query)
            relevant_requests = relevant_requests_result.scalars().all()
            end_time = time.time()
            print(f"get_requests run-time is {end_time - start_time:.3f} sec")
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
                for req in relevant_requests
            ]

        else:
            # If not a secretary, only return requests for the current user
            result = await session.execute(
                select(Requests).filter(Requests.student_email == user_email)
            )

        requests = result.scalars().all()
        end_time = time.time()
        print(f"get_requests run-time is {end_time - start_time:.3f} sec")
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
        end_time = time.time()
        print(f"get_requests run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(status_code=500, detail=f"Error fetching requests: {str(e)}")

@app.post("/update_status")
async def update_status(request: Request, session: AsyncSession = Depends(get_session)):
    start_time = time.time()
    data = await request.json()
    request_id = data.get("request_id")
    new_status = data.get("status")
    
    if not request_id or not new_status:
        end_time = time.time()
        print(f"update_status run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(status_code=400, detail="Missing request_id or status")
    
    # Get the request
    result = await session.execute(select(Requests).where(Requests.id == request_id))
    request = result.scalar_one_or_none()
    
    if not request:
        end_time = time.time()
        print(f"update_status run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Update status
    old_status = request.status
    request.status = new_status
    
    # Update timeline
    if not request.timeline:
        request.timeline = {}
    if "status_changes" not in request.timeline:
        request.timeline["status_changes"] = []
    
    request.timeline["status_changes"].append({
        "from": old_status,
        "to": new_status,
        "timestamp": datetime.utcnow().isoformat()
    })
    
    # Create notification for the student
    await create_notification(
        session=session,
        user_email=request.student_email,
        request_id=request_id,
        message=f"Your request '{request.title}' status has been changed from '{old_status}' to '{new_status}'",
        type="status_change"
    )

    await email_service.send_email(
        to=request.student_email,
        subject=f"Request {request_id} Status Update",
        content=f"Your request '{request.title}' status has been changed from '{old_status}' to '{new_status}'"
    )

    flag_modified(request, "timeline")
    flag_modified(request, "status")
    await session.commit()
    
    end_time = time.time()
    print(f"update_status run-time is {end_time - start_time:.3f} sec")
    return {"message": "Status updated successfully"}

@app.get("/requests/professor/{professor_email}")
async def get_professor_requests(professor_email: str, session: AsyncSession = Depends(get_session)):
    start_time = time.time()
    try:
        result = await session.execute(
            select(Courses.id).where(Courses.professor_email == professor_email))
        course_ids = [row[0] for row in result.all()]

        if not course_ids:
            end_time = time.time()
            print(f"get_professor_requests run-time is {end_time - start_time:.3f} sec")
            return []

        result = await session.execute(
            select(Requests).where(
                Requests.course_id.in_(course_ids)
            )
        )
        requests = result.scalars().all()

        end_time = time.time()
        print(f"get_professor_requests run-time is {end_time - start_time:.3f} sec")
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
        end_time = time.time()
        print(f"get_professor_requests run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(status_code=500, detail=f"Error fetching requests: {str(e)}")


@app.post("/create_user")
async def create_user(request: Request, session: AsyncSession = Depends(get_session)):
    start_time = time.time()
    data = await request.json()
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    email = data.get("email")
    password = data.get("password")
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    role = data.get("role")

    # This already handles adding the student/professor internally:
    new_user = await add_user(session, email, first_name, last_name, hashed_password, role)

    end_time = time.time()
    print(f"create_user run-time is {end_time - start_time:.3f} sec")
    return {"message": "User created successfully", "user_email": new_user.email}


@app.get("/users")
async def get_users(role: str = None, session: AsyncSession = Depends(get_session)):
    start_time = time.time()
    query = select(Users)
    if role:
        query = query.where(Users.role == role)
    result = await session.execute(query)
    end_time = time.time()
    print(f"get_users run-time is {end_time - start_time:.3f} sec")
    return result.scalars().all()


@app.get("/courses")
async def get_courses(professor_email: bool = None, session: AsyncSession = Depends(get_session)):
    start_time = time.time()
    query = select(Courses)
    if professor_email:
        query = query.where(Courses.professor_email is not None)
    print(query)
    result = await session.execute(select(Courses))
    end_time = time.time()
    print(f"get_courses run-time is {end_time - start_time:.3f} sec")
    return result.scalars().all()

@app.post("/Users/setRole")
async def set_role(request: Request, session: AsyncSession = Depends(get_session)):
    start_time = time.time()
    print("in the set role function")
    data = await request.json()
    user_email = data.get("user_email")
    role = data.get("role")

    res = await session.execute(select(Users).filter(Users.email == user_email))
    user = res.scalars().first()

    if user:
        user.role = role  # Update the role
        await session.commit()  # Commit changes
        end_time = time.time()
        print(f"set_role run-time is {end_time - start_time:.3f} sec")
        return {"message": "Role updated successfully", "user": {"email": user.email, "role": user.role}}
    else:
        end_time = time.time()
        print(f"set_role run-time is {end_time - start_time:.3f} sec")
        return {"error": "User not found"}

@app.post("/Users/getUsers")
async def get_users(request: Request, session: AsyncSession = Depends(get_session)):
    start_time = time.time()
    print("in the get users function")
    res = await session.execute(select(Users))
    users = res.scalars().all()
    end_time = time.time()
    print(f"get_users run-time is {end_time - start_time:.3f} sec")
    return users


@app.post("/Users/getUser/{UserEmail}")
async def get_user(UserEmail : str, session: AsyncSession = Depends(get_session)):
    start_time = time.time()
    print("in the func", UserEmail)
    res_user = await session.execute(select(Users).where(Users.email == UserEmail))
    user = res_user.scalars().first()
    if not user:
        end_time = time.time()
        print(f"get_user run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch role-specific data
    if user.role == "student":
        student_data = await session.execute(select(Students).filter(Students.email == user.email))
        student = student_data.scalars().first()
        end_time = time.time()
        print(f"get_user run-time is {end_time - start_time:.3f} sec")
        return {**user.__dict__, "student_data": student}

    if user.role == "professor":
        professor_data = await session.execute(select(Professors).filter(Professors.email == user.email))
        professor = professor_data.scalars().first()
        end_time = time.time()
        print(f"get_user run-time is {end_time - start_time:.3f} sec")
        return {**user.__dict__, "professor_data": professor}

    end_time = time.time()
    print(f"get_user run-time is {end_time - start_time:.3f} sec")
    return user


@app.get("/professor/courses/{professor_email}")
async def get_courses(professor_email: str, session: AsyncSession = Depends(get_session)):
    start_time = time.time()
    result = await session.execute(select(Professors).filter(Professors.email == professor_email))
    professor = result.scalar_one_or_none()
    if not professor:
        end_time = time.time()
        print(f"get_courses run-time is {end_time - start_time:.3f} sec")
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

    end_time = time.time()
    print(f"get_courses run-time is {end_time - start_time:.3f} sec")
    return {"courses": courses_data}



@app.post("/courses/{course_id}/submit_grades")
async def submit_grades(
        course_id: str,
        data: dict = Body(...),  # data will include: gradeComponent, grades (dict: email -> grade)
        session: AsyncSession = Depends(get_session),
        token_data: dict = Depends(verify_token_professor)
):
    start_time = time.time()
    print(course_id, data)
    grade_component = data.get("gradeComponent")
    grades = data.get("grades")  # dict: { "student@email.com": 95 }

    if not grade_component or not grades:
        end_time = time.time()
        print(f"submit_grades run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(status_code=400, detail="Missing grade component or grades")

    professor_email = token_data.get("user_email")

    for student_email, grade in grades.items():
        result = await session.execute(
            select(Students).filter(Students.email == student_email)
        )
        student = result.scalar_one_or_none()
        if not student:
            end_time = time.time()
            print(f"submit_grades run-time is {end_time - start_time:.3f} sec")
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
    end_time = time.time()
    print(f"submit_grades run-time is {end_time - start_time:.3f} sec")
    return {"message": "Grades submitted successfully"}


@app.get("/course/{course_id}/students")
async def get_students(course_id: str, session: AsyncSession = Depends(get_session),
                       token_data: dict = Depends(verify_token_professor)):
    start_time = time.time()
    result = await session.execute(
        select(Courses)
        .filter(Courses.id == course_id)
        .options(selectinload(Courses.students))
    )
    course = result.scalars().first()

    if not course:
        end_time = time.time()
        print(f"get_students run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(status_code=404, detail="Course not found")

    end_time = time.time()
    print(f"get_students run-time is {end_time - start_time:.3f} sec")
    return jsonable_encoder(course.students)


# Create a request
@app.post("/submit_request/create")
async def create_general_request(
        request: Request,
        session: AsyncSession = Depends(get_session)
):
    start_time = time.time()
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
        end_time = time.time()
        print(f"create_general_request run-time is {end_time - start_time:.3f} sec")
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
            end_time = time.time()
            print(f"create_general_request run-time is {end_time - start_time:.3f} sec")
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
            end_time = time.time()
            print(f"create_general_request run-time is {end_time - start_time:.3f} sec")
            raise HTTPException(status_code=400, detail="Invalid schedule change data")
        course_id = schedule_change.get('course_id')
        course_component = None
    else:
        course_id = None
        course_component = None

    student = await session.execute(select(Students).where(Students.email == student_email))
    student = student.scalar_one_or_none()
    secretary_email = None
    professor_email = None

    # Check routing rules for the request type
    result = await session.execute(
        select(RequestRoutingRules).where(RequestRoutingRules.type == title)
    )
    routing_rule = result.scalar_one_or_none()

    # If there's a routing rule and it specifies secretary, set course_id to None
    if routing_rule and routing_rule.destination == "secretary":
        course_id = None
        secretary = await session.execute(select(Secretaries).where(Secretaries.department_id == student.department_id))
        secretary_email = (secretary.scalar_one_or_none()).email

    if routing_rule and routing_rule.destination == "professor":
        professor = await session.execute(select(StudentCourses).where(and_(
            StudentCourses.student_email == student_email, StudentCourses.course_id == course_id)))
        professor_email =(professor.scalar_one_or_none()).professor_email


    # send email notification for the faculty member who will handle the request
    if professor_email:
        email_content = f"Hello {professor_email}, \nA new {title} request has been submitted by {student_email} at {datetime.now().date()}."
        await email_service.send_email(
            to=professor_email,
            subject = f"A new {title} request has been submitted",
            content = email_content
        )

    if secretary_email:
        email_content = f"Hello {secretary_email}, \nA new {title} request has been submitted by {student_email} at {datetime.now().date()}."
        await email_service.send_email(
            to=secretary_email,
            subject = f"A new {title} request has been submitted",
            content = email_content
        )

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

    # send confirmation email to student
    await email_service.send_email(
        to=student_email,
        subject=f"A new {title} request has been submitted successfully",
        content=f"Hello {student_email}, \nYour {title} request has been submitted successfully. \nRequest ID: {new_request.id}"
    )

    end_time = time.time()
    print(f"create_general_request run-time is {end_time - start_time:.3f} sec")
    return {"message": "Request created successfully", "request_id": new_request.id}

@app.delete("/Requests/{request_id}")
async def delete_request(request_id: int, session: AsyncSession = Depends(get_session)):
    start_time = time.time()
    try:
        # Fetch the request to ensure it exists
        request = await session.get(Requests, request_id)
        if not request:
            end_time = time.time()
            print(f"delete_request run-time is {end_time - start_time:.3f} sec")
            raise HTTPException(status_code=404, detail="Request not found")
        if request.status != "pending":
            end_time = time.time()
            print(f"delete_request run-time is {end_time - start_time:.3f} sec")
            raise HTTPException(status_code=400, detail="Cannot delete a request that is not pending")
        # Delete the request
        await session.delete(request)
        await session.commit()

        end_time = time.time()
        print(f"delete_request run-time is {end_time - start_time:.3f} sec")
        return {"message": "Request deleted successfully"}
    except Exception as e:
        end_time = time.time()
        print(f"delete_request run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(status_code=500, detail=f"Error deleting request: {str(e)}")

@app.put("/Requests/EditRequest/{request_id}")
async def edit_request(request_id: int, request: Request, session: AsyncSession = Depends(get_session),
                       student: dict = Depends(verify_token_student)):
    start_time = time.time()
    try:
        existing_request = await session.get(Requests, request_id)
        
        if not existing_request:
            end_time = time.time()
            print(f"edit_request run-time is {end_time - start_time:.3f} sec")
            raise HTTPException(status_code=404, detail="Request not found")
        
        # Verify the student owns this request
        if existing_request.student_email != student.get('user_email'):
            end_time = time.time()
            print(f"edit_request run-time is {end_time - start_time:.3f} sec")
            raise HTTPException(status_code=403, detail="You can only edit your own requests")
        
        # Check request status
        if existing_request.status not in ["pending", "require editing"]:
            end_time = time.time()
            print(f"edit_request run-time is {end_time - start_time:.3f} sec")
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot edit a request that is not pending or require editing. Current status: {existing_request.status}"
            )
        
        try:
            data = await request.json()
        except Exception as e:
            end_time = time.time()
            print(f"edit_request run-time is {end_time - start_time:.3f} sec")
            raise HTTPException(status_code=400, detail="Invalid request data format")
        
        if "details" not in data:
            end_time = time.time()
            print(f"edit_request run-time is {end_time - start_time:.3f} sec")
            raise HTTPException(status_code=400, detail="Missing 'details' in request data")
        
        # Edit the request
        existing_request.details = data["details"]
        
        # Initialize timeline if it doesn't exist
        if not existing_request.timeline:
            existing_request.timeline = {
                "created": existing_request.created_date.isoformat() if existing_request.created_date else datetime.now().isoformat(),
                "status_changes": [],
                "edits": []
            }
        
        # Ensure timeline is a dictionary
        if isinstance(existing_request.timeline, str):
            try:
                existing_request.timeline = json.loads(existing_request.timeline)
            except json.JSONDecodeError:
                existing_request.timeline = {
                    "created": existing_request.created_date.isoformat() if existing_request.created_date else datetime.now().isoformat(),
                    "status_changes": [],
                    "edits": []
                }
        
        # Add edit to timeline
        if "edits" not in existing_request.timeline:
            existing_request.timeline["edits"] = []
        
        existing_request.timeline["edits"].append({
            "details": data["details"],
            "date": datetime.now().isoformat()
        })
        
        try:
            flag_modified(existing_request, "timeline")
            await session.commit()
        except Exception as e:
            await session.rollback()
            end_time = time.time()
            print(f"edit_request run-time is {end_time - start_time:.3f} sec")
            raise HTTPException(status_code=500, detail=f"Error saving changes: {str(e)}")

        end_time = time.time()
        print(f"edit_request run-time is {end_time - start_time:.3f} sec")
        return {"message": "Request updated successfully"}

    except HTTPException as he:
        end_time = time.time()
        print(f"edit_request run-time is {end_time - start_time:.3f} sec")
        raise he
    except Exception as e:
        await session.rollback()
        end_time = time.time()
        print(f"edit_request run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(status_code=500, detail=f"Error editing request: {str(e)}")

@app.get("/student/{student_email:path}/courses")
async def get_student_courses(student_email: str, session: AsyncSession = Depends(get_session)):
    start_time = time.time()
    if not student_email or "@" not in student_email:
        end_time = time.time()
        print(f"get_student_courses run-time is {end_time - start_time:.3f} sec")
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
    end_time = time.time()
    print(f"get_student_courses run-time is {end_time - start_time:.3f} sec")
    return {"courses": courses_list}

@app.get("/grades/{student_email}")
async def get_grades(student_email: str, db: AsyncSession = Depends(get_session)):
    start_time = time.time()
    stmt = (
        select(Grades, Courses.name)
        .join(Courses, Courses.id == Grades.course_id)  # Join on course_id
        .where(Grades.student_email == student_email)
    )
    result = await db.execute(stmt)
    grades = result.all()

    if not grades:
        end_time = time.time()
        print(f"get_grades run-time is {end_time - start_time:.3f} sec")
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

    end_time = time.time()
    print(f"get_grades run-time is {end_time - start_time:.3f} sec")
    return formatted_grades


@app.post("/assign_student")
async def assign_students(
        data: AssignStudentsRequest,
        db: AsyncSession = Depends(get_session)
):
    start_time = time.time()
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
    end_time = time.time()
    print(f"assign_students run-time is {end_time - start_time:.3f} sec")
    return {"message": "Students assigned successfully"}


@app.post("/assign_professor")
async def assign_professor(
        data: AssignProfessorRequest,
        db: AsyncSession = Depends(get_session)
):
    start_time = time.time()
    result = await db.execute(select(Courses).filter(Courses.professor_email == data.professor_email))
    existing_courses = result.scalars().all()

    existing_course_ids = [course.id for course in existing_courses]
    new_course_ids = data.course_ids

    # Unassign professor from courses that are no longer assigned
    for course_id in existing_course_ids:
        if course_id not in new_course_ids:
            stmt = (
                update(Courses)
                .where(Courses.id == course_id, Courses.professor_email == data.professor_email)
                .values(professor_email=None)
            )
            await db.execute(stmt)

    # Assign professor to new courses
    for course_id in new_course_ids:
        await assign_professor_to_course(db, data.professor_email, course_id)

    await db.commit()
    end_time = time.time()
    print(f"assign_professor run-time is {end_time - start_time:.3f} sec")
    return {"message": "Courses assigned successfully"}



@app.get("/assigned_students")
async def get_assigned_students(course_id: str, db: AsyncSession = Depends(get_session)):
    start_time = time.time()
    stmt = select(StudentCourses.student_email).filter(StudentCourses.course_id == course_id)
    result = await db.execute(stmt)
    assigned_students = result.scalars().all()
    end_time = time.time()
    print(f"get_assigned_students run-time is {end_time - start_time:.3f} sec")
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
    start_time = time.time()
    # Verify professor exists
    result = await session.execute(select(Professors).where(Professors.email == professor_email))
    professor = result.scalar_one_or_none()
    if not professor:
        end_time = time.time()
        print(f"add_unavailability_period run-time is {end_time - start_time:.3f} sec")
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
    
    end_time = time.time()
    print(f"add_unavailability_period run-time is {end_time - start_time:.3f} sec")
    return {"message": "Unavailability period added successfully", "period": new_period}

@app.get("/professor/unavailability/{professor_email}")
async def get_unavailability_periods(
    professor_email: str,
    session: AsyncSession = Depends(get_session)
):
    start_time = time.time()
    result = await session.execute(select(Professors).where(Professors.email == professor_email))
    professor = result.scalar_one_or_none()
    if not professor:
        end_time = time.time()
        print(f"get_unavailability_periods run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(status_code=404, detail="Professor not found")

    result = await session.execute(
        select(ProfessorUnavailability)
        .filter(ProfessorUnavailability.professor_email == professor_email)
        .order_by(ProfessorUnavailability.start_date)
    )
    periods = result.scalars().all()
    
    end_time = time.time()
    print(f"get_unavailability_periods run-time is {end_time - start_time:.3f} sec")
    return {"periods": periods}

@app.delete("/professor/unavailability/{period_id}")
async def delete_unavailability_period(
    period_id: int,
    session: AsyncSession = Depends(get_session)
):
    start_time = time.time()
    period = await session.get(ProfessorUnavailability, period_id)
    if not period:
        end_time = time.time()
        print(f"delete_unavailability_period run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(status_code=404, detail="Unavailability period not found")

    await session.delete(period)
    await session.commit()
    
    end_time = time.time()
    print(f"delete_unavailability_period run-time is {end_time - start_time:.3f} sec")
    return {"message": "Unavailability period deleted successfully"}

@app.get("/professor/availability/{professor_email}")
async def check_professor_availability(
    professor_email: str,
    date: datetime,
    session: AsyncSession = Depends(get_session)
):
    start_time = time.time()
    result = await session.execute(select(Professors).where(Professors.email == professor_email))
    professor = result.scalar_one_or_none()
    if not professor:
        end_time = time.time()
        print(f"check_professor_availability run-time is {end_time - start_time:.3f} sec")
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
    
    end_time = time.time()
    print(f"check_professor_availability run-time is {end_time - start_time:.3f} sec")
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
    start_time = time.time()
    result = await session.execute(
        select(StudentCourses.professor_email)
        .where(
            StudentCourses.student_email == student_email,
            StudentCourses.course_id == course_id
        )
    )
    student_course = result.scalars().first()
    if not student_course:
        end_time = time.time()
        print(f"get_student_professor run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(status_code=404, detail="No professor found for this student in the specified course")
    end_time = time.time()
    print(f"get_student_professor run-time is {end_time - start_time:.3f} sec")
    return {"professor_email": student_course}

@app.get("/student/{student_email}/professors")
async def get_student_professors(
    student_email: str,
    session: AsyncSession = Depends(get_session)
):
    start_time = time.time()
    try:
        # First, get all courses for the student
        student_courses_query = select(StudentCourses).where(StudentCourses.student_email == student_email)
        student_courses = (await session.execute(student_courses_query)).scalars().all()
        
        if not student_courses:
            end_time = time.time()
            print(f"get_student_professors run-time is {end_time - start_time:.3f} sec")
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
        
        end_time = time.time()
        print(f"get_student_professors run-time is {end_time - start_time:.3f} sec")
        return {"professors": professors_data}
    except Exception as e:
        end_time = time.time()
        print(f"get_student_professors run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/secretary/transfer-requests/{secretary_email}")
async def get_department_transfer_requests(
    secretary_email: str,
    session: AsyncSession = Depends(get_session),
    token_data: dict = Depends(verify_token)
):
    start_time = time.time()
    # Verify the user is a secretary
    if token_data["role"] not in ["admin", "secretary"]:
        end_time = time.time()
        print(f"get_department_transfer_requests run-time is {end_time - start_time:.3f} sec")
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
        end_time = time.time()
        print(f"get_department_transfer_requests run-time is {end_time - start_time:.3f} sec")
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
    
    end_time = time.time()
    print(f"get_department_transfer_requests run-time is {end_time - start_time:.3f} sec")
    return formatted_requests

class ResponseRequest(BaseModel):
    request_id: int
    professor_email: str
    response_text: str

@app.post("/submit_response")
async def submit_response(
    request_id: int = Form(...),
    professor_email: str = Form(...),
    response_text: str = Form(...),
    files: Optional[List[UploadFile]] = File(None),
    session: AsyncSession = Depends(get_session)
):
    # Get the request
    result = await session.execute(select(Requests).where(Requests.id == request_id))
    request_obj = result.scalar_one_or_none()
    
    if not request_obj:
        raise HTTPException(status_code=404, detail="Request not found")
    
    # Handle file uploads
    file_metadata = []
    if files:
        save_dir = Path("Documents") / "responses" / str(request_id)
        save_dir.mkdir(parents=True, exist_ok=True)
        for file in files:
            file_path = save_dir / file.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file_metadata.append({"filename": file.filename, "path": str(file_path)})

    # Create new response entry
    new_response = Responses(
        request_id=request_id,
        professor_email=professor_email,
        response_text=response_text,
        files=file_metadata if file_metadata else None,
        created_date=datetime.now().date()
    )
    session.add(new_response)

    # Update request timeline with the response
    if not request_obj.timeline:
        request_obj.timeline = {}
    
    if "responses" not in request_obj.timeline:
        request_obj.timeline["responses"] = []
    
    request_obj.timeline["responses"].append({
        "professor_email": professor_email,
        "response_text": response_text,
        "files": file_metadata,
        "timestamp": datetime.utcnow().isoformat()
    })

    # Also update request status
    old_status = request_obj.status
    request_obj.status = "responded"

    # And add a status change to timeline
    if "status_changes" not in request_obj.timeline:
        request_obj.timeline["status_changes"] = []

    request_obj.timeline["status_changes"].append({
        "from": old_status,
        "to": "responded",
        "timestamp": datetime.utcnow().isoformat()
    })
    
    flag_modified(request_obj, "timeline")
    
    # Create notification for the student
    await create_notification(
        session=session,
        user_email=request_obj.student_email,
        request_id=request_id,
        message=f"You have a new response for your request '{request_obj.title}' from {professor_email}",
        type="response"
    )

    await session.commit()
    
    return {"message": "Response submitted successfully"}

@app.get("/request/responses/{request_id}")
async def get_request_responses(request_id: int, db: AsyncSession = Depends(get_session)):
    start_time = time.time()
    result = await db.execute(
        select(Responses).where(Responses.request_id == request_id)
    )
    responses = result.scalars().all()

    end_time = time.time()
    print(f"get_request_responses run-time is {end_time - start_time:.3f} sec")
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
    start_time = time.time()
    try:
        # Get the request to find the student email
        result = await session.execute(select(Requests).where(Requests.id == request_id))
        request = result.scalar_one_or_none()
        
        if not request:
            end_time = time.time()
            print(f"get_student_courses_for_request run-time is {end_time - start_time:.3f} sec")
            raise HTTPException(status_code=404, detail="Request not found")
            
        # Get all courses for the student
        result = await session.execute(
            select(StudentCourses, Courses)
            .join(Courses, StudentCourses.course_id == Courses.id)
            .where(StudentCourses.student_email == request.student_email)
        )
        courses = result.all()
        
        end_time = time.time()
        print(f"get_student_courses_for_request run-time is {end_time - start_time:.3f} sec")
        return [{
            "course_id": course.id,
            "course_name": course.name,
            "professor_email": sc.professor_email
        } for sc, course in courses]
        
    except Exception as e:
        end_time = time.time()
        print(f"get_student_courses_for_request run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(status_code=500, detail=str(e))

class TransferRequest(BaseModel):
    new_course_id: Optional[str] = None
    reason: str

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
    start_time = time.time()
    # Verify the user is an admin
    if token_data["role"] != "admin":
        end_time = time.time()
        print(f"get_all_transfer_requests run-time is {end_time - start_time:.3f} sec")
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
    
    end_time = time.time()
    print(f"get_all_transfer_requests run-time is {end_time - start_time:.3f} sec")
    return formatted_requests

# Notification endpoints
@app.get("/notifications/{user_email}")
async def get_notifications(
    user_email: str,
    session: AsyncSession = Depends(get_session),
    token_data: dict = Depends(verify_token)
):
    start_time = time.time()
    try:
        print(f"Getting notifications for user: {user_email}")
        notifications = await get_user_notifications(session, user_email)
        print(f"Found {len(notifications)} notifications")
        end_time = time.time()
        print(f"get_notifications run-time is {end_time - start_time:.3f} sec")
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
        end_time = time.time()
        print(f"get_notifications run-time is {end_time - start_time:.3f} sec")
        print(f"Error in get_notifications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    session: AsyncSession = Depends(get_session),
    token_data: dict = Depends(verify_token)
):
    start_time = time.time()
    try:
        success = await mark_notification_as_read(session, notification_id)
        if not success:
            end_time = time.time()
            print(f"mark_notification_read run-time is {end_time - start_time:.3f} sec")
            raise HTTPException(status_code=404, detail="Notification not found")
        end_time = time.time()
        print(f"mark_notification_read run-time is {end_time - start_time:.3f} sec")
        return {"message": "Notification marked as read"}
    except Exception as e:
        end_time = time.time()
        print(f"mark_notification_read run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/notifications/read-all")
async def mark_all_notifications_read(session: AsyncSession = Depends(get_session), token_data: dict = Depends(verify_token)):
    start_time = time.time()
    try:
        count = await mark_all_notifications_as_read(session, token_data["user_email"])
        end_time = time.time()
        print(f"mark_all_notifications_read run-time is {end_time - start_time:.3f} sec")
        return {"message": f"{count} notifications marked as read"}
    except Exception as e:
        end_time = time.time()
        print(f"mark_all_notifications_read run-time is {end_time - start_time:.3f} sec")
        raise HTTPException(status_code=500, detail=str(e))

'''
@app.get("/requests/dashboard/{user_email}")
async def get_requests_dashboard(user_email: str, session: AsyncSession = Depends(get_session)):
    res_user = await session.execute(select(Users).where(Users.email == user_email))
    user = res_user.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role = user.role

    print("before fetching data" , role)

    if role == "student" or role == "secretary":
        return await get_requests(user_email)

    if role == "professor":
        return await get_professor_requests(user_email, session)
'''

@app.get("/api/request_routing_rules")
async def get_request_routing_rules(session: AsyncSession = Depends(get_session)):
    try:
        result = await session.execute(select(RequestRoutingRules))
        rules = result.scalars().all()
        return rules
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/request_routing_rules/{rule_type}")
async def update_request_routing_rule(
    rule_type: str,
    rule_data: dict = Body(...),
    session: AsyncSession = Depends(get_session)
):
    try:
        # Validate destination
        destination = rule_data.get("destination")
        if destination not in ["secretary", "lecturer"]:
            raise HTTPException(status_code=400, detail="Invalid destination. Must be 'secretary' or 'lecturer'")

        # Get the existing rule
        result = await session.execute(
            select(RequestRoutingRules).where(RequestRoutingRules.type == rule_type)
        )
        rule = result.scalar_one_or_none()

        if rule:
            # Update existing rule
            rule.destination = destination
        else:
            # Create new rule
            rule = RequestRoutingRules(type=rule_type, destination=destination)
            session.add(rule)

        await session.commit()
        return {"message": "Routing rule updated successfully"}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Direct News Generation Function
async def generate_news_content(category: str) -> Dict[str, Any]:
    """
    Generate news content directly using OpenAI API without going through chatbot service
    
    Args:
        category: The news category to generate content for
        
    Returns:
        Dictionary with news content and metadata
    """
    try:
        if not OPENAI_AVAILABLE or 'news_openai_client' not in globals():
            # Fallback to simulated news if OpenAI is not available
            fallback_news = {
                "breaking international news or current events": "BREAKING: International diplomatic summit concludes with historic agreements on climate cooperation and trade partnerships.",
                "economic developments or market updates": "MARKETS: Global stock markets show positive trends as technology sector leads growth with 3.2% gains this quarter.",
                "sports achievements or major sporting events": "SPORTS: Championship finals set new viewership records as teams compete in thrilling overtime matches.",
                "political developments or government policy changes": "POLITICS: New legislative package focuses on infrastructure investment and renewable energy initiatives.",
                "scientific discoveries or technological breakthroughs": "SCIENCE: Researchers announce breakthrough in renewable energy storage technology, increasing efficiency by 40%.",
                "environmental news or climate updates": "ENVIRONMENT: Global conservation efforts show promising results with forest restoration projects exceeding targets.",
                "health and medical news or breakthrough research": "HEALTH: Medical breakthrough in early disease detection shows 95% accuracy rate in clinical trials.",
                "cultural events or entertainment industry news": "CULTURE: International arts festival showcases diverse talents from 50 countries in week-long celebration.",
                "business mergers, acquisitions, or corporate developments": "BUSINESS: Major tech companies announce strategic partnerships to advance sustainable innovation goals.",
                "social issues or humanitarian developments": "HUMANITARIAN: Relief organizations report successful aid distribution to affected regions, reaching 100,000 people."
            }
            
            return {
                "content": fallback_news.get(category, "NEWS: Important developments continue to shape global events."),
                "source": "fallback",
                "success": True
            }
        
        # Create news-specific prompt
        prompt = f"""Generate a realistic, current news headline and brief summary about {category}. 

Requirements:
- Make it sound like real breaking news from today
- Keep it under 80 words total
- Use professional news language
- Format as: "HEADLINE: [headline] - [brief summary]"
- Make it believable and informative
- Avoid controversial or sensitive topics
- Focus on positive or neutral developments"""

        # Call OpenAI API directly for news generation
        response = await news_openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system", 
                    "content": "You are a professional news generator. Create realistic, current news content that sounds authentic and professional. Keep content appropriate and factual-sounding."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            max_tokens=100,
            temperature=0.8  # Add some creativity for varied news content
        )
        
        news_content = response.choices[0].message.content.strip()
        
        return {
            "content": news_content,
            "source": "openai_direct",
            "model": response.model,
            "success": True
        }
        
    except Exception as e:
        print(f"ERROR generating news content: {e}")
        # Return a fallback news item if generation fails
        return {
            "content": f"NEWS UPDATE: Latest developments in {category} continue to evolve. Stay tuned for more information.",
            "source": "error_fallback",
            "success": False
        }

# Request Template Management Endpoints

class TemplateFieldRequest(BaseModel):
    field_name: str
    field_label: str
    field_type: str  # text, textarea, select, file, date, number
    field_options: Optional[dict] = None
    is_required: bool = False
    field_order: int = 0
    validation_rules: Optional[dict] = None
    placeholder: Optional[str] = None
    help_text: Optional[str] = None

class RequestTemplateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    fields: List[TemplateFieldRequest]

@app.get("/api/request_templates")
async def get_request_templates(
    active_only: bool = True,
    session: AsyncSession = Depends(get_session)
):
    """Get all request templates with their fields."""
    try:
        from backend.db_connection import get_request_templates
        templates = await get_request_templates(session, active_only)
        
        result = []
        for template in templates:
            template_data = {
                "id": template.id,
                "name": template.name,
                "description": template.description,
                "is_active": template.is_active,
                "created_by": template.created_by,
                "created_date": template.created_date.isoformat(),
                "updated_date": template.updated_date.isoformat(),
                "fields": []
            }
            
            # Sort fields by field_order
            sorted_fields = sorted(template.fields, key=lambda f: f.field_order)
            for field in sorted_fields:
                field_data = {
                    "id": field.id,
                    "field_name": field.field_name,
                    "field_label": field.field_label,
                    "field_type": field.field_type,
                    "field_options": field.field_options,
                    "is_required": field.is_required,
                    "field_order": field.field_order,
                    "validation_rules": field.validation_rules,
                    "placeholder": field.placeholder,
                    "help_text": field.help_text
                }
                template_data["fields"].append(field_data)
            
            result.append(template_data)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/request_templates/{template_id}")
async def get_request_template(
    template_id: int,
    session: AsyncSession = Depends(get_session)
):
    """Get a specific request template by ID."""
    try:
        from backend.db_connection import get_request_template_by_id
        template = await get_request_template_by_id(session, template_id)
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Sort fields by field_order
        sorted_fields = sorted(template.fields, key=lambda f: f.field_order)
        
        return {
            "id": template.id,
            "name": template.name,
            "description": template.description,
            "is_active": template.is_active,
            "created_by": template.created_by,
            "created_date": template.created_date.isoformat(),
            "updated_date": template.updated_date.isoformat(),
            "fields": [
                {
                    "id": field.id,
                    "field_name": field.field_name,
                    "field_label": field.field_label,
                    "field_type": field.field_type,
                    "field_options": field.field_options,
                    "is_required": field.is_required,
                    "field_order": field.field_order,
                    "validation_rules": field.validation_rules,
                    "placeholder": field.placeholder,
                    "help_text": field.help_text
                }
                for field in sorted_fields
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/request_templates")
async def create_request_template(
    template_data: RequestTemplateRequest,
    session: AsyncSession = Depends(get_session),
    token_data: dict = Depends(verify_token_admin)
):
    """Create a new request template."""
    try:
        from backend.db_connection import create_request_template, get_request_template_by_name
        
        # Check if template name already exists
        existing = await get_request_template_by_name(session, template_data.name)
        if existing:
            raise HTTPException(status_code=400, detail="Template with this name already exists")
        
        # Convert TemplateFieldRequest objects to dict
        fields_data = []
        for field in template_data.fields:
            fields_data.append({
                "field_name": field.field_name,
                "field_label": field.field_label,
                "field_type": field.field_type,
                "field_options": field.field_options,
                "is_required": field.is_required,
                "field_order": field.field_order,
                "validation_rules": field.validation_rules,
                "placeholder": field.placeholder,
                "help_text": field.help_text
            })
        
        template = await create_request_template(
            session=session,
            name=template_data.name,
            description=template_data.description,
            created_by=token_data["user_email"],
            fields=fields_data
        )
        
        # Also create a routing rule for the new template
        routing_rule = RequestRoutingRules(type=template_data.name, destination="secretary")
        session.add(routing_rule)
        await session.commit()
        
        return {"message": "Template created successfully", "template_id": template.id}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/request_templates/{template_id}")
async def update_request_template(
    template_id: int,
    template_data: RequestTemplateRequest,
    session: AsyncSession = Depends(get_session),
    token_data: dict = Depends(verify_token_admin)
):
    """Update an existing request template."""
    try:
        from backend.db_connection import update_request_template, get_request_template_by_name
        
        # Check if new name conflicts with existing template (excluding current one)
        if template_data.name:
            existing = await get_request_template_by_name(session, template_data.name)
            if existing and existing.id != template_id:
                raise HTTPException(status_code=400, detail="Template with this name already exists")
        
        # Convert TemplateFieldRequest objects to dict
        fields_data = []
        for field in template_data.fields:
            fields_data.append({
                "field_name": field.field_name,
                "field_label": field.field_label,
                "field_type": field.field_type,
                "field_options": field.field_options,
                "is_required": field.is_required,
                "field_order": field.field_order,
                "validation_rules": field.validation_rules,
                "placeholder": field.placeholder,
                "help_text": field.help_text
            })
        
        template = await update_request_template(
            session=session,
            template_id=template_id,
            name=template_data.name,
            description=template_data.description,
            fields=fields_data
        )
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return {"message": "Template updated successfully"}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/request_templates/{template_id}")
async def delete_request_template(
    template_id: int,
    session: AsyncSession = Depends(get_session),
    token_data: dict = Depends(verify_token_admin)
):
    """Soft delete a request template."""
    try:
        from backend.db_connection import delete_request_template
        
        success = await delete_request_template(session, template_id)
        if not success:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return {"message": "Template deleted successfully"}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/request_template_names")
async def get_request_template_names(session: AsyncSession = Depends(get_session)):
    """Get list of active request template names for use in forms."""
    try:
        from backend.db_connection import get_active_request_template_names
        names = await get_active_request_template_names(session)
        
        # Also include hardcoded legacy types that still exist
        legacy_types = [
            "General Request",
            "Grade Appeal Request", 
            "Military Service Request",
            "Schedule Change Request",
            "Exam Accommodations Request"
        ]
        
        # Combine and remove duplicates while preserving order
        all_names = legacy_types + [name for name in names if name not in legacy_types]
        
        return all_names
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/request_templates/by_name/{template_name}")
async def get_request_template_by_name_endpoint(
    template_name: str,
    session: AsyncSession = Depends(get_session)
):
    """Get a specific request template by name (for form generation)."""
    try:
        from backend.db_connection import get_request_template_by_name
        template = await get_request_template_by_name(session, template_name)
        
        if not template:
            # Return null for legacy templates that don't have custom fields
            return None
        
        # Sort fields by field_order
        sorted_fields = sorted(template.fields, key=lambda f: f.field_order)
        
        return {
            "id": template.id,
            "name": template.name,
            "description": template.description,
            "fields": [
                {
                    "id": field.id,
                    "field_name": field.field_name,
                    "field_label": field.field_label,
                    "field_type": field.field_type,
                    "field_options": field.field_options,
                    "is_required": field.is_required,
                    "field_order": field.field_order,
                    "validation_rules": field.validation_rules,
                    "placeholder": field.placeholder,
                    "help_text": field.help_text
                }
                for field in sorted_fields
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CommentTemplateCreate(BaseModel):
    title: str
    content: str

class CommentTemplateResponse(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True

@app.get("/comment_templates", response_model=List[CommentTemplateResponse])
async def get_comment_templates(
    token_data: dict = Depends(verify_token_professor),
    session: AsyncSession = Depends(get_session)
):
    professor_email = token_data.get("user_email")
    result = await session.execute(
        select(CommentTemplate)
        .where(CommentTemplate.professor_email == professor_email)
        .order_by(CommentTemplate.created_at.desc())
    )
    templates = result.scalars().all()
    return templates

@app.post("/comment_templates", response_model=CommentTemplateResponse)
async def create_comment_template(
    template: CommentTemplateCreate,
    token_data: dict = Depends(verify_token_professor),
    session: AsyncSession = Depends(get_session)
):
    professor_email = token_data.get("user_email")
    new_template = CommentTemplate(
        professor_email=professor_email,
        title=template.title,
        content=template.content
    )
    session.add(new_template)
    await session.commit()
    await session.refresh(new_template)
    return new_template

@app.delete("/comment_templates/{template_id}")
async def delete_comment_template(
    template_id: int,
    token_data: dict = Depends(verify_token_professor),
    session: AsyncSession = Depends(get_session)
):
    professor_email = token_data.get("user_email")
    result = await session.execute(
        select(CommentTemplate)
        .where(
            and_(
                CommentTemplate.id == template_id,
                CommentTemplate.professor_email == professor_email
            )
        )
    )
    template = result.scalar_one_or_none()
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    await session.delete(template)
    await session.commit()
    return {"message": "Template deleted successfully"}

@app.get("/secretary/department-students/{secretary_email}")
async def get_department_students(
    secretary_email: str, 
    session: AsyncSession = Depends(get_session)
):
    """Get all students in the secretary's department for filtering purposes"""
    try:
        # Get secretary's department
        secretary_result = await session.execute(
            select(Secretaries).where(Secretaries.email == secretary_email)
        )
        secretary = secretary_result.scalar_one_or_none()
        if not secretary:
            raise HTTPException(status_code=404, detail="Secretary not found")
        
        # Get all students in the same department
        students_result = await session.execute(
            select(Students.email, Users.first_name, Users.last_name)
            .join(Users, Students.email == Users.email)
            .where(Students.department_id == secretary.department_id)
            .order_by(Users.first_name, Users.last_name)
        )
        students = students_result.all()
        
        return [
            {
                "email": student.email,
                "name": f"{student.first_name} {student.last_name}"
            }
            for student in students
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching department students: {str(e)}")


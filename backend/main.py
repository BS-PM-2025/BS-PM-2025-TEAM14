from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db_connection import create_connection

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # אפשר כל מקור (לפי הצורך, תוכל למנוע שמירה על מקור ספציפי)
    allow_credentials=True,
    allow_methods=["*"],  # אפשר כל שיטה (GET, POST, PUT וכו')
    allow_headers=["*"],  # אפשר כל כותרת
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

DB_CONFIG = {
    "host": "student-db.cho8cqo8ezzg.eu-north-1.rds.amazonaws.com",
    "user": "admin",
    "password": "Aa1122335!",
    "database": "students"
}

DATABASE_URL = (
    f"mysql+aiomysql://{DB_CONFIG['user']}:{DB_CONFIG['password']}"
    f"@{DB_CONFIG['host']}:3306/{DB_CONFIG['database']}"
)

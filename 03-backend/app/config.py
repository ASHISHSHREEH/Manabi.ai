import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
WORKSPACE_ROOT = BASE_DIR.parent
DEFAULT_QUESTIONS_JSON = WORKSPACE_ROOT / "02-web-app" / "data" / "questions.json"

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{(BASE_DIR / 'manabi_prep.db').as_posix()}")

RAW_CORS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)
CORS_ORIGINS = [origin.strip() for origin in RAW_CORS.split(",") if origin.strip()]

DEFAULT_USER_ID = "student-default"
DEFAULT_USER_EMAIL = "ashish@manabi.local"
DEFAULT_USER_NAME = "Ashish"

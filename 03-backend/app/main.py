from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.database import Base, SessionLocal, engine
from app.routers import attempts, exams, mistakes
from app.services.seeder import bootstrap_database


@asynccontextmanager
async def lifespan(_app: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        bootstrap_database(db)
    yield


app = FastAPI(
    title="Manabi Prep Mock Exam API",
    version="0.1.0",
    description="Configurable JFT-Basic & JLPT Mock Examination and Mistake Tracking Engine",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(exams.router)
app.include_router(attempts.router)
app.include_router(mistakes.router)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}

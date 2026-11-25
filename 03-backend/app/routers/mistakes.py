from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.config import DEFAULT_USER_ID
from app.database import get_db
from app.models import LearningProgress, MistakeBank, Question
from app.schemas import MistakeItemResponse

router = APIRouter(prefix="/api/v1/mistakes", tags=["mistakes"])


@router.get("", response_model=list[MistakeItemResponse])
def list_mistakes(
    status: str | None = "active",
    exam_code: str | None = None,
    db: Session = Depends(get_db),
) -> list[MistakeItemResponse]:
    stmt = (
        select(MistakeBank, Question)
        .join(Question, MistakeBank.question_id == Question.id)
        .where(MistakeBank.user_id == DEFAULT_USER_ID)
        .order_by(desc(MistakeBank.wrong_count), desc(MistakeBank.updated_at))
    )
    if status and status != "all":
        stmt = stmt.where(MistakeBank.status == status)
    if exam_code and exam_code.upper() != "ALL":
        stmt = stmt.where(Question.exam_code == exam_code.upper())

    rows = db.execute(stmt).all()
    return [
        MistakeItemResponse(
            question_id=q.id,
            exam_code=q.exam_code,
            section=q.section,
            topic_tag=q.topic_tag,
            prompt=q.prompt,
            wrong_count=mb.wrong_count,
            consecutive_correct=mb.consecutive_correct,
            status=mb.status,
            explanation=q.explanation,
            updated_at=mb.updated_at,
        )
        for mb, q in rows
    ]


@router.get("/progress")
def list_learning_progress(db: Session = Depends(get_db)) -> list[dict]:
    rows = db.scalars(
        select(LearningProgress).where(LearningProgress.user_id == DEFAULT_USER_ID)
    ).all()
    return [
        {
            "exam_code": r.exam_code,
            "section": r.section,
            "attempts_count": r.attempts_count,
            "correct_count": r.correct_count,
            "accuracy_pct": r.accuracy_pct,
            "updated_at": r.updated_at.isoformat(),
        }
        for r in rows
    ]

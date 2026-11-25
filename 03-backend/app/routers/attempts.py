from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import desc, select
from sqlalchemy.orm import Session, selectinload

from app.config import DEFAULT_USER_ID
from app.database import get_db
from app.models import ExamAttempt
from app.schemas import (
    AttemptHistoryItem,
    AttemptResultResponse,
    AttemptStateResponse,
    SaveAnswerRequest,
    SaveAnswerResponse,
    StartAttemptRequest,
    SubmitAttemptRequest,
)
from app.services.blueprints import get_blueprint
from app.services.exam_engine import (
    build_result_response,
    save_student_answer,
    serialize_attempt_state,
    start_attempt,
    submit_attempt,
)
from app.services.seeder import ensure_default_user

router = APIRouter(prefix="/api/v1/attempts", tags=["attempts"])


def _get_attempt_or_404(db: Session, attempt_id: str) -> ExamAttempt:
    attempt = db.scalar(
        select(ExamAttempt)
        .options(selectinload(ExamAttempt.result))
        .where(ExamAttempt.id == attempt_id)
    )
    if attempt is None:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return attempt


@router.get("", response_model=list[AttemptHistoryItem])
def list_attempts(db: Session = Depends(get_db)) -> list[AttemptHistoryItem]:
    attempts = db.scalars(
        select(ExamAttempt)
        .options(selectinload(ExamAttempt.result))
        .where(ExamAttempt.user_id == DEFAULT_USER_ID)
        .order_by(desc(ExamAttempt.started_at))
        .limit(30)
    ).all()

    history: list[AttemptHistoryItem] = []
    for a in attempts:
        bp = get_blueprint(a.exam_code)
        res = a.result
        history.append(
            AttemptHistoryItem(
                attempt_id=a.id,
                exam_code=a.exam_code,
                exam_name=bp.name,
                mode=a.mode,
                section_filter=a.section_filter,
                status=a.status,
                raw_correct=res.raw_correct if res else None,
                raw_total=res.raw_total if res else len(a.question_snapshot_json),
                scaled_score=res.scaled_score if res else None,
                max_score=res.max_score if res else None,
                passed=res.passed if res else None,
                started_at=a.started_at,
                submitted_at=a.submitted_at,
            )
        )
    return history


@router.post("", response_model=AttemptStateResponse, status_code=201)
def create_attempt(
    payload: StartAttemptRequest,
    db: Session = Depends(get_db),
) -> AttemptStateResponse:
    ensure_default_user(db)
    try:
        attempt = start_attempt(
            db,
            user_id=DEFAULT_USER_ID,
            exam_code=payload.exam_code,
            mode=payload.mode,
            section=payload.section,
            question_limit=payload.question_limit,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return serialize_attempt_state(db, attempt)


@router.get("/{attempt_id}", response_model=AttemptStateResponse)
def get_attempt(attempt_id: str, db: Session = Depends(get_db)) -> AttemptStateResponse:
    attempt = _get_attempt_or_404(db, attempt_id)
    return serialize_attempt_state(db, attempt)


@router.put("/{attempt_id}/answers/{question_id}", response_model=SaveAnswerResponse)
def upsert_answer(
    attempt_id: str,
    question_id: str,
    payload: SaveAnswerRequest,
    db: Session = Depends(get_db),
) -> SaveAnswerResponse:
    attempt = _get_attempt_or_404(db, attempt_id)
    try:
        saved = save_student_answer(
            db,
            attempt=attempt,
            question_id=question_id,
            selected_option_id=payload.selected_option_id,
            marked_for_review=payload.marked_for_review,
            time_spent_sec=payload.time_spent_sec,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return SaveAnswerResponse(
        attempt_id=attempt.id,
        question_id=saved.question_id,
        selected_option_id=saved.selected_option_id,
        marked_for_review=saved.marked_for_review,
        time_spent_sec=saved.time_spent_sec,
        saved_at=saved.answered_at,
    )


@router.post("/{attempt_id}/submit", response_model=AttemptResultResponse)
def submit_mock_attempt(
    attempt_id: str,
    payload: SubmitAttemptRequest | None = None,
    db: Session = Depends(get_db),
) -> AttemptResultResponse:
    attempt = _get_attempt_or_404(db, attempt_id)
    return submit_attempt(
        db,
        attempt=attempt,
        total_time_sec=payload.total_time_sec if payload else None,
    )


@router.get("/{attempt_id}/results", response_model=AttemptResultResponse)
def get_attempt_results(attempt_id: str, db: Session = Depends(get_db)) -> AttemptResultResponse:
    attempt = _get_attempt_or_404(db, attempt_id)
    if attempt.result is None:
        raise HTTPException(status_code=400, detail="Attempt has not been submitted yet")
    return build_result_response(db, attempt)

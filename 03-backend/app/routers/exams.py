from __future__ import annotations

from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Question
from app.schemas import ExamCatalogItem, SectionQuotaSchema
from app.services.blueprints import EXAM_BLUEPRINTS

router = APIRouter(prefix="/api/v1/exams", tags=["exams"])


@router.get("", response_model=list[ExamCatalogItem])
def list_exams(db: Session = Depends(get_db)) -> list[ExamCatalogItem]:
    rows = db.execute(
        select(Question.exam_code, Question.section).where(Question.is_active.is_(True))
    ).all()
    counts = Counter((exam, sec) for exam, sec in rows)

    catalog: list[ExamCatalogItem] = []
    for code in ("JFT", "N5", "N4", "N3", "N2", "N1"):
        bp = EXAM_BLUEPRINTS[code]
        sec_items: list[SectionQuotaSchema] = []
        total_avail = 0
        for s in bp.sections:
            avail = counts.get((bp.code, s.section), 0)
            total_avail += avail
            sec_items.append(
                SectionQuotaSchema(
                    section=s.section,
                    label=s.label,
                    target_count=s.target_count,
                    available_count=avail,
                    duration_sec=s.duration_sec,
                    min_scaled_score=s.min_scaled_score,
                    max_scaled_score=s.max_scaled_score,
                )
            )
        catalog.append(
            ExamCatalogItem(
                code=bp.code,
                name=bp.name,
                scoring_model=bp.scoring_model,
                pass_total=bp.pass_total,
                max_score=bp.max_score,
                duration_sec=bp.duration_sec,
                total_available=total_avail,
                pass_rule_summary=bp.pass_rule_summary,
                sections=sec_items,
            )
        )
    return catalog


@router.get("/{exam_code}", response_model=ExamCatalogItem)
def get_exam(exam_code: str, db: Session = Depends(get_db)) -> ExamCatalogItem:
    items = list_exams(db)
    code = exam_code.strip().upper()
    for item in items:
        if item.code == code:
            return item
    raise HTTPException(status_code=404, detail=f"Exam {exam_code} not found")

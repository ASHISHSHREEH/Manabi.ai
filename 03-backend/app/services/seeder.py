from __future__ import annotations

import json
import re
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import DEFAULT_QUESTIONS_JSON, DEFAULT_USER_EMAIL, DEFAULT_USER_ID, DEFAULT_USER_NAME
from app.database import Base, SessionLocal, engine
from app.models import Exam, Question, QuestionOption, User
from app.services.blueprints import EXAM_BLUEPRINTS, infer_topic_tag

PREFIX_RE = re.compile(r"^(?:\d+|[A-Za-z])[.)]\s+")


def strip_choice_label(choice: str) -> str:
    trimmed = choice.strip()
    stripped = PREFIX_RE.sub("", trimmed)
    return stripped or trimmed


def is_choice_correct(choices: list[str], answer: str, choice: str, idx: int) -> bool:
    expected = (answer or "").strip()
    chosen = (choice or "").strip()
    if not expected:
        return False

    if chosen.lower() == expected.lower():
        return True

    has_exact = any(c.strip().lower() == expected.lower() for c in choices)
    if not has_exact and re.match(rf"^{re.escape(expected)}(?:[.)\]:\s]|$)", chosen, re.IGNORECASE):
        return True
    if not has_exact and re.match(r"^[1-9]$", expected):
        return idx + 1 == int(expected)
    if not has_exact and re.match(r"^[a-z]$", expected, re.IGNORECASE):
        return idx == (ord(expected.upper()) - 65)
    return False


def ensure_default_user(db: Session) -> User:
    user = db.get(User, DEFAULT_USER_ID)
    if user is None:
        user = User(
            id=DEFAULT_USER_ID,
            email=DEFAULT_USER_EMAIL,
            display_name=DEFAULT_USER_NAME,
            preferred_lang="en",
            daily_target=20,
        )
        db.add(user)
        db.flush()
    return user


def seed_exams(db: Session) -> int:
    count = 0
    for bp in EXAM_BLUEPRINTS.values():
        existing = db.get(Exam, bp.code)
        cfg = {
            "pass_rule_summary": bp.pass_rule_summary,
            "sections": [
                {
                    "section": s.section,
                    "label": s.label,
                    "target_count": s.target_count,
                    "duration_sec": s.duration_sec,
                    "max_scaled_score": s.max_scaled_score,
                    "min_scaled_score": s.min_scaled_score,
                }
                for s in bp.sections
            ],
        }
        if existing is None:
            db.add(
                Exam(
                    id=bp.code,
                    code=bp.code,
                    name=bp.name,
                    scoring_model=bp.scoring_model,
                    pass_total=bp.pass_total,
                    max_score=bp.max_score,
                    duration_sec=bp.duration_sec,
                    config_json=cfg,
                )
            )
            count += 1
        else:
            existing.name = bp.name
            existing.scoring_model = bp.scoring_model
            existing.pass_total = bp.pass_total
            existing.max_score = bp.max_score
            existing.duration_sec = bp.duration_sec
            existing.config_json = cfg
    db.flush()
    return count


def seed_questions_from_json(db: Session, json_path: Path = DEFAULT_QUESTIONS_JSON) -> int:
    if not json_path.exists():
        return 0

    rows = json.loads(json_path.read_text(encoding="utf-8"))
    existing_ids = set(db.scalars(select(Question.id)).all())

    inserted = 0
    for row in rows:
        qid = str(row["id"]).strip()
        if qid in existing_ids:
            continue

        exam_code = str(row["exam"]).strip().upper()
        section = str(row["section"]).strip().lower()
        prompt = str(row["question"]).strip()
        choices = [str(c) for c in row.get("choices", [])]
        answer = str(row.get("answer", ""))
        choice_exps = row.get("choice_explanations") or []

        q = Question(
            id=qid,
            exam_code=exam_code,
            section=section,
            topic_tag=infer_topic_tag(section, prompt),
            prompt=prompt,
            explanation=str(row.get("explanation", "")),
            source=row.get("source"),
            is_active=True,
        )
        db.add(q)

        for idx, raw_choice in enumerate(choices):
            exp = str(choice_exps[idx]) if idx < len(choice_exps) and choice_exps[idx] else None
            db.add(
                QuestionOption(
                    id=f"{qid}::opt-{idx}",
                    question_id=qid,
                    display_order=idx,
                    text=strip_choice_label(raw_choice),
                    is_correct=is_choice_correct(choices, answer, raw_choice, idx),
                    explanation=exp,
                )
            )

        existing_ids.add(qid)
        inserted += 1

    db.flush()
    return inserted


def bootstrap_database(db: Session, json_path: Path = DEFAULT_QUESTIONS_JSON) -> dict[str, int]:
    ensure_default_user(db)
    exams_added = seed_exams(db)
    questions_added = seed_questions_from_json(db, json_path)
    db.commit()
    return {"exams_added": exams_added, "questions_added": questions_added}


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        summary = bootstrap_database(session)
        print(f"Seed complete: {summary}")

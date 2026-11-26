from __future__ import annotations

import random
from collections import Counter
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    Exam,
    ExamAttempt,
    ExamResult,
    LearningProgress,
    MistakeBank,
    Question,
    StudentAnswer,
)
from app.schemas import (
    AttemptQuestionSchema,
    AttemptResultResponse,
    AttemptStateResponse,
    GradedOptionReview,
    GradedQuestionReview,
    PublicOptionSchema,
    SectionScoreResult,
)
from app.services.blueprints import SECTION_DISPLAY_NAMES, get_blueprint


def _ensure_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _remaining_seconds(attempt: ExamAttempt, now: datetime | None = None) -> int:
    if attempt.status != "in_progress":
        return 0
    current = now or datetime.now(timezone.utc)
    delta = int((_ensure_utc(attempt.expires_at) - current).total_seconds())
    return max(0, delta)


def _distribute_limit(
    limit: int,
    section_targets: list[tuple[str, int]],
    available: dict[str, int],
) -> dict[str, int]:
    """Spread ``limit`` questions across sections in proportion to each section's
    blueprint target_count, capped by how many questions are actually available.

    Uses largest-remainder rounding, then fills any leftover slots into sections
    that still have capacity. This keeps a shortened full mock (e.g. a 20-question
    sprint) representative of every section instead of taking the first N from the
    earliest sections only.
    """
    total_target = sum(t for _, t in section_targets)
    if total_target <= 0:
        return {}

    ideal = {sec: limit * target / total_target for sec, target in section_targets}
    alloc = {sec: min(int(ideal[sec]), available.get(sec, 0)) for sec, _ in section_targets}

    total_available = sum(available.get(sec, 0) for sec, _ in section_targets)
    remaining = min(limit, total_available) - sum(alloc.values())

    # Prefer sections with the largest fractional remainder, breaking ties by quota.
    order = sorted(
        section_targets,
        key=lambda st: (ideal[st[0]] - int(ideal[st[0]]), st[1]),
        reverse=True,
    )
    while remaining > 0:
        progressed = False
        for sec, _ in order:
            if remaining <= 0:
                break
            if alloc[sec] < available.get(sec, 0):
                alloc[sec] += 1
                remaining -= 1
                progressed = True
        if not progressed:
            break
    return alloc


def start_attempt(
    db: Session,
    *,
    user_id: str,
    exam_code: str,
    mode: str,
    section: str | None = None,
    question_limit: int | None = None,
    rng: random.Random | None = None,
) -> ExamAttempt:
    rand = rng or random.Random()
    bp = get_blueprint(exam_code)
    exam_row = db.get(Exam, bp.code)
    if exam_row is None:
        raise ValueError(f"Exam {bp.code} is not seeded")

    stmt = (
        select(Question)
        .options(selectinload(Question.options))
        .where(Question.exam_code == bp.code, Question.is_active.is_(True))
    )
    if mode == "section":
        if not section:
            raise ValueError("Section name is required for section-based mock exams")
        sec_norm = section.strip().lower()
        stmt = stmt.where(Question.section == sec_norm)
    pool = list(db.scalars(stmt).all())
    if not pool:
        raise ValueError(f"No questions available for {bp.code}" + (f" ({section})" if section else ""))

    selected: list[Question] = []
    duration_sec = bp.duration_sec

    if mode == "section":
        sec_norm = (section or "").strip().lower()
        sec_bp = next((s for s in bp.sections if s.section == sec_norm), None)
        target = question_limit or (sec_bp.target_count if sec_bp else 20)
        rand.shuffle(pool)
        selected = pool[: min(target, len(pool))]
        base_dur = sec_bp.duration_sec if sec_bp else 20 * 60
        if sec_bp and sec_bp.target_count > 0 and len(selected) < sec_bp.target_count:
            duration_sec = max(180, round(base_dur * (len(selected) / sec_bp.target_count)))
        else:
            duration_sec = base_dur
    else:
        by_section: dict[str, list[Question]] = {}
        for q in pool:
            by_section.setdefault(q.section, []).append(q)
        for sec_pool in by_section.values():
            rand.shuffle(sec_pool)

        if question_limit is None:
            # Full blueprint: take each section's quota, capped by availability.
            for sec_bp in bp.sections:
                sec_pool = by_section.get(sec_bp.section, [])
                selected.extend(sec_pool[: min(sec_bp.target_count, len(sec_pool))])
        else:
            # Shortened full mock: distribute the limit across sections in
            # proportion to the blueprint so every section stays represented.
            quotas = _distribute_limit(
                question_limit,
                [(sec_bp.section, sec_bp.target_count) for sec_bp in bp.sections],
                {sec: len(sec_pool) for sec, sec_pool in by_section.items()},
            )
            for sec_bp in bp.sections:
                sec_pool = by_section.get(sec_bp.section, [])
                selected.extend(sec_pool[: quotas.get(sec_bp.section, 0)])

        target_total = sum(s.target_count for s in bp.sections)
        if target_total > 0 and len(selected) < target_total:
            duration_sec = max(300, round(bp.duration_sec * (len(selected) / target_total)))

    if not selected:
        raise ValueError(f"Unable to sample mock questions for {bp.code}")

    snapshot: list[dict] = []
    for q in selected:
        opt_ids = [o.id for o in q.options]
        rand.shuffle(opt_ids)
        snapshot.append({"question_id": q.id, "option_order": opt_ids})

    now = datetime.now(timezone.utc)
    attempt = ExamAttempt(
        user_id=user_id,
        exam_code=bp.code,
        mode=mode,
        section_filter=section.strip().lower() if mode == "section" and section else None,
        status="in_progress",
        question_snapshot_json=snapshot,
        duration_sec=duration_sec,
        started_at=now,
        expires_at=now + timedelta(seconds=duration_sec),
    )
    db.add(attempt)
    db.commit()
    db.refresh(attempt)
    return attempt


def serialize_attempt_state(db: Session, attempt: ExamAttempt) -> AttemptStateResponse:
    bp = get_blueprint(attempt.exam_code)
    q_ids = [item["question_id"] for item in attempt.question_snapshot_json]
    q_map = {
        q.id: q
        for q in db.scalars(
            select(Question).options(selectinload(Question.options)).where(Question.id.in_(q_ids))
        ).all()
    }
    ans_map = {
        a.question_id: a
        for a in db.scalars(
            select(StudentAnswer).where(StudentAnswer.attempt_id == attempt.id)
        ).all()
    }

    items: list[AttemptQuestionSchema] = []
    for idx, entry in enumerate(attempt.question_snapshot_json):
        q = q_map[entry["question_id"]]
        opt_by_id = {o.id: o for o in q.options}
        ordered_opts = [
            PublicOptionSchema(id=opt_by_id[oid].id, text=opt_by_id[oid].text)
            for oid in entry["option_order"]
            if oid in opt_by_id
        ]
        saved = ans_map.get(q.id)
        items.append(
            AttemptQuestionSchema(
                index=idx,
                question_id=q.id,
                exam_code=q.exam_code,
                section=q.section,
                topic_tag=q.topic_tag,
                prompt=q.prompt,
                options=ordered_opts,
                selected_option_id=saved.selected_option_id if saved else None,
                marked_for_review=saved.marked_for_review if saved else False,
                time_spent_sec=saved.time_spent_sec if saved else 0,
            )
        )

    return AttemptStateResponse(
        id=attempt.id,
        exam_code=attempt.exam_code,
        exam_name=bp.name,
        mode=attempt.mode,
        section_filter=attempt.section_filter,
        status=attempt.status,
        duration_sec=attempt.duration_sec,
        remaining_sec=_remaining_seconds(attempt),
        started_at=_ensure_utc(attempt.started_at),
        expires_at=_ensure_utc(attempt.expires_at),
        submitted_at=_ensure_utc(attempt.submitted_at) if attempt.submitted_at else None,
        questions=items,
    )


def save_student_answer(
    db: Session,
    *,
    attempt: ExamAttempt,
    question_id: str,
    selected_option_id: str | None,
    marked_for_review: bool,
    time_spent_sec: int,
) -> StudentAnswer:
    if attempt.status != "in_progress":
        raise ValueError("Cannot modify answers after exam submission")

    snapshot_entry = next(
        (e for e in attempt.question_snapshot_json if e["question_id"] == question_id),
        None,
    )
    if snapshot_entry is None:
        raise KeyError(f"Question {question_id} is not part of attempt {attempt.id}")

    if selected_option_id is not None and selected_option_id not in snapshot_entry["option_order"]:
        raise ValueError("Selected option does not belong to this question")

    existing = db.scalar(
        select(StudentAnswer).where(
            StudentAnswer.attempt_id == attempt.id,
            StudentAnswer.question_id == question_id,
        )
    )
    now = datetime.now(timezone.utc)
    if existing is None:
        existing = StudentAnswer(
            attempt_id=attempt.id,
            question_id=question_id,
            selected_option_id=selected_option_id,
            marked_for_review=marked_for_review,
            time_spent_sec=time_spent_sec,
            answered_at=now,
        )
        db.add(existing)
    else:
        existing.selected_option_id = selected_option_id
        existing.marked_for_review = marked_for_review
        existing.time_spent_sec = max(existing.time_spent_sec, time_spent_sec)
        existing.answered_at = now

    db.commit()
    db.refresh(existing)
    return existing


def submit_attempt(
    db: Session,
    *,
    attempt: ExamAttempt,
    total_time_sec: int | None = None,
) -> AttemptResultResponse:
    # Idempotent return if already graded
    if attempt.status != "in_progress" and attempt.result is not None:
        return build_result_response(db, attempt)

    bp = get_blueprint(attempt.exam_code)
    q_ids = [item["question_id"] for item in attempt.question_snapshot_json]
    q_map = {
        q.id: q
        for q in db.scalars(
            select(Question).options(selectinload(Question.options)).where(Question.id.in_(q_ids))
        ).all()
    }
    ans_map = {
        a.question_id: a
        for a in db.scalars(
            select(StudentAnswer).where(StudentAnswer.attempt_id == attempt.id)
        ).all()
    }

    now = datetime.now(timezone.utc)
    raw_correct = 0
    raw_total = len(attempt.question_snapshot_json)
    section_stats: dict[str, dict] = {}
    topic_misses: Counter[str] = Counter()

    for item in attempt.question_snapshot_json:
        q = q_map[item["question_id"]]
        correct_opt = next((o for o in q.options if o.is_correct), None)
        saved = ans_map.get(q.id)
        chosen_id = saved.selected_option_id if saved else None
        is_right = bool(chosen_id and correct_opt and chosen_id == correct_opt.id)

        if saved is not None:
            saved.is_correct = is_right
        else:
            saved = StudentAnswer(
                attempt_id=attempt.id,
                question_id=q.id,
                selected_option_id=None,
                marked_for_review=False,
                time_spent_sec=0,
                is_correct=False,
                answered_at=now,
            )
            db.add(saved)
            ans_map[q.id] = saved

        if is_right:
            raw_correct += 1
        else:
            topic_misses[f"{q.section}:{q.topic_tag}"] += 1

        sec_bucket = section_stats.setdefault(
            q.section,
            {"correct": 0, "total": 0, "time_spent_sec": 0},
        )
        sec_bucket["total"] += 1
        sec_bucket["time_spent_sec"] += saved.time_spent_sec
        if is_right:
            sec_bucket["correct"] += 1

        # Upsert MistakeBank for Student Analytics & System 2 AI Tutor
        mistake = db.scalar(
            select(MistakeBank).where(
                MistakeBank.user_id == attempt.user_id,
                MistakeBank.question_id == q.id,
            )
        )
        if not is_right:
            if mistake is None:
                db.add(
                    MistakeBank(
                        user_id=attempt.user_id,
                        question_id=q.id,
                        wrong_count=1,
                        consecutive_correct=0,
                        status="active",
                        last_wrong_option_id=chosen_id,
                        last_attempt_id=attempt.id,
                        updated_at=now,
                    )
                )
            else:
                mistake.wrong_count += 1
                mistake.consecutive_correct = 0
                mistake.status = "active"
                mistake.last_wrong_option_id = chosen_id
                mistake.last_attempt_id = attempt.id
                mistake.updated_at = now
        elif mistake is not None:
            mistake.consecutive_correct += 1
            if mistake.consecutive_correct >= 2:
                mistake.status = "resolved"
            mistake.updated_at = now

    # Compute exam-specific section scores and pass evaluation
    section_results: list[dict] = []
    all_sections_passed = True

    for sec_key, bucket in section_stats.items():
        sec_bp = next((s for s in bp.sections if s.section == sec_key), None)
        acc = round((bucket["correct"] / bucket["total"]) * 100, 1) if bucket["total"] > 0 else 0.0
        max_scaled = (sec_bp.max_scaled_score if sec_bp and sec_bp.max_scaled_score else 60)
        scaled = round((bucket["correct"] / bucket["total"]) * max_scaled) if bucket["total"] > 0 else 0
        min_req = sec_bp.min_scaled_score if (sec_bp and bp.scoring_model == "jlpt_180") else None
        sec_passed = True if min_req is None else (scaled >= min_req)
        if bp.scoring_model == "jlpt_180" and attempt.mode == "full" and not sec_passed:
            all_sections_passed = False

        section_results.append(
            {
                "section": sec_key,
                "label": sec_bp.label if sec_bp else SECTION_DISPLAY_NAMES.get(sec_key, sec_key),
                "correct": bucket["correct"],
                "total": bucket["total"],
                "accuracy_pct": acc,
                "scaled_score": scaled,
                "max_scaled_score": max_scaled,
                "min_scaled_score": min_req,
                "section_passed": sec_passed,
                "time_spent_sec": bucket["time_spent_sec"],
            }
        )

        # Upsert LearningProgress
        lp = db.scalar(
            select(LearningProgress).where(
                LearningProgress.user_id == attempt.user_id,
                LearningProgress.exam_code == attempt.exam_code,
                LearningProgress.section == sec_key,
            )
        )
        if lp is None:
            db.add(
                LearningProgress(
                    user_id=attempt.user_id,
                    exam_code=attempt.exam_code,
                    section=sec_key,
                    attempts_count=bucket["total"],
                    correct_count=bucket["correct"],
                    accuracy_pct=acc,
                    updated_at=now,
                )
            )
        else:
            lp.attempts_count += bucket["total"]
            lp.correct_count += bucket["correct"]
            lp.accuracy_pct = round((lp.correct_count / lp.attempts_count) * 100, 1)
            lp.updated_at = now

    overall_acc = round((raw_correct / raw_total) * 100, 1) if raw_total > 0 else 0.0
    if attempt.mode == "section":
        sec_max = section_results[0]["max_scaled_score"] if section_results else 100
        scaled_total = round((raw_correct / raw_total) * sec_max) if raw_total > 0 else 0
        pass_mark = round(sec_max * (bp.pass_total / bp.max_score))
        passed = scaled_total >= pass_mark
        max_total = sec_max
    else:
        scaled_total = round((raw_correct / raw_total) * bp.max_score) if raw_total > 0 else 0
        passed = (scaled_total >= bp.pass_total) and all_sections_passed
        max_total = bp.max_score

    weak_sections = [
        s["section"]
        for s in sorted(section_results, key=lambda x: x["accuracy_pct"])
        if s["accuracy_pct"] < 70.0
    ]
    if not weak_sections and section_results:
        lowest = min(section_results, key=lambda x: x["accuracy_pct"])
        if lowest["accuracy_pct"] < 100.0:
            weak_sections = [lowest["section"]]

    weak_topics = [topic for topic, _cnt in topic_misses.most_common(5)]

    elapsed_wall = max(0, int((now - _ensure_utc(attempt.started_at)).total_seconds()))
    final_time = min(attempt.duration_sec, total_time_sec) if total_time_sec is not None else min(attempt.duration_sec, elapsed_wall)

    attempt.status = "submitted"
    attempt.submitted_at = now

    result_row = ExamResult(
        attempt_id=attempt.id,
        raw_correct=raw_correct,
        raw_total=raw_total,
        accuracy_pct=overall_acc,
        scaled_score=scaled_total,
        max_score=max_total,
        passed=passed,
        total_time_sec=final_time,
        section_scores_json=section_results,
        weak_sections_json=weak_sections,
        weak_topics_json=weak_topics,
        created_at=now,
    )
    db.add(result_row)
    db.commit()
    db.refresh(attempt)
    return build_result_response(db, attempt)


def build_result_response(db: Session, attempt: ExamAttempt) -> AttemptResultResponse:
    if attempt.result is None:
        raise ValueError("Attempt has not been submitted yet")

    bp = get_blueprint(attempt.exam_code)
    q_ids = [item["question_id"] for item in attempt.question_snapshot_json]
    q_map = {
        q.id: q
        for q in db.scalars(
            select(Question).options(selectinload(Question.options)).where(Question.id.in_(q_ids))
        ).all()
    }
    ans_map = {
        a.question_id: a
        for a in db.scalars(
            select(StudentAnswer).where(StudentAnswer.attempt_id == attempt.id)
        ).all()
    }

    review_items: list[GradedQuestionReview] = []
    for idx, item in enumerate(attempt.question_snapshot_json):
        q = q_map[item["question_id"]]
        opt_by_id = {o.id: o for o in q.options}
        correct_opt = next((o for o in q.options if o.is_correct), q.options[0])
        saved = ans_map.get(q.id)

        ordered_review_opts = [
            GradedOptionReview(
                id=opt_by_id[oid].id,
                text=opt_by_id[oid].text,
                is_correct=opt_by_id[oid].is_correct,
                explanation=opt_by_id[oid].explanation,
            )
            for oid in item["option_order"]
            if oid in opt_by_id
        ]

        review_items.append(
            GradedQuestionReview(
                index=idx,
                question_id=q.id,
                exam_code=q.exam_code,
                section=q.section,
                topic_tag=q.topic_tag,
                prompt=q.prompt,
                explanation=q.explanation,
                selected_option_id=saved.selected_option_id if saved else None,
                correct_option_id=correct_opt.id,
                is_correct=bool(saved and saved.is_correct),
                marked_for_review=bool(saved and saved.marked_for_review),
                time_spent_sec=saved.time_spent_sec if saved else 0,
                options=ordered_review_opts,
            )
        )

    res = attempt.result
    return AttemptResultResponse(
        attempt_id=attempt.id,
        exam_code=attempt.exam_code,
        exam_name=bp.name,
        mode=attempt.mode,
        scoring_model=bp.scoring_model,
        raw_correct=res.raw_correct,
        raw_total=res.raw_total,
        accuracy_pct=res.accuracy_pct,
        scaled_score=res.scaled_score,
        max_score=res.max_score,
        pass_total=bp.pass_total if attempt.mode == "full" else round(res.max_score * (bp.pass_total / bp.max_score)),
        passed=res.passed,
        pass_rule_summary=bp.pass_rule_summary,
        total_time_sec=res.total_time_sec,
        weak_sections=res.weak_sections_json,
        weak_topics=res.weak_topics_json,
        section_scores=[SectionScoreResult(**s) for s in res.section_scores_json],
        questions=review_items,
        submitted_at=_ensure_utc(attempt.submitted_at or res.created_at),
    )

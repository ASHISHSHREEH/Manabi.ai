from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from app.database import Base, get_db
from app.main import app
from app.services.seeder import bootstrap_database


@pytest.fixture()
def client(tmp_path):
    db_file = tmp_path / "test_manabi.db"
    engine = create_engine(
        f"sqlite:///{db_file.as_posix()}",
        connect_args={"check_same_thread": False},
        future=True,
    )
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
    Base.metadata.create_all(bind=engine)

    with TestingSession() as db:
        bootstrap_database(db)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as tc:
        yield tc
    app.dependency_overrides.clear()
    engine.dispose()


def test_exams_catalog_reflects_real_question_counts(client: TestClient):
    resp = client.get("/api/v1/exams")
    assert resp.status_code == 200
    data = {e["code"]: e for e in resp.json()}

    assert data["JFT"]["total_available"] == 150
    assert data["N2"]["total_available"] == 204
    assert data["N5"]["total_available"] == 0
    assert data["JFT"]["scoring_model"] == "jft_250"
    assert data["N2"]["scoring_model"] == "jlpt_180"


def test_full_mock_lifecycle_hides_answers_saves_progress_and_tracks_mistakes(client: TestClient):
    start = client.post(
        "/api/v1/attempts",
        json={"exam_code": "JFT", "mode": "section", "section": "grammar", "question_limit": 4},
    )
    assert start.status_code == 201
    attempt = start.json()
    assert len(attempt["questions"]) == 4

    # Security rule: mid-exam payload must never leak is_correct or explanations
    for q in attempt["questions"]:
        for opt in q["options"]:
            assert "is_correct" not in opt
            assert "explanation" not in opt

    # Save answers + flag on Q0, skip Q3
    q0 = attempt["questions"][0]
    save0 = client.put(
        f"/api/v1/attempts/{attempt['id']}/answers/{q0['question_id']}",
        json={
            "selected_option_id": q0["options"][0]["id"],
            "marked_for_review": True,
            "time_spent_sec": 18,
        },
    )
    assert save0.status_code == 200
    assert save0.json()["marked_for_review"] is True

    # Resuming returns saved choice + flag
    resumed = client.get(f"/api/v1/attempts/{attempt['id']}").json()
    assert resumed["questions"][0]["selected_option_id"] == q0["options"][0]["id"]
    assert resumed["questions"][0]["marked_for_review"] is True

    # Submit attempt & verify grading + mistake bank capture
    submit = client.post(
        f"/api/v1/attempts/{attempt['id']}/submit",
        json={"total_time_sec": 95},
    )
    assert submit.status_code == 200
    res = submit.json()
    assert res["raw_total"] == 4
    assert res["total_time_sec"] == 95
    assert len(res["questions"]) == 4
    assert res["questions"][0]["marked_for_review"] is True

    # Attempting to edit an answer after submission is rejected
    edit_after = client.put(
        f"/api/v1/attempts/{attempt['id']}/answers/{q0['question_id']}",
        json={"selected_option_id": q0["options"][1]["id"], "marked_for_review": False, "time_spent_sec": 5},
    )
    assert edit_after.status_code == 400

    # Any wrong / unanswered items appear in active Mistake Bank
    mistakes = client.get("/api/v1/mistakes?status=active").json()
    assert len(mistakes) >= (4 - res["raw_correct"])
    if res["raw_correct"] < 4:
        assert mistakes[0]["wrong_count"] >= 1


def test_full_mock_with_question_limit_spans_sections(client: TestClient):
    # A shortened full mock (Sprint preset) must distribute questions across
    # sections proportionally — not take the first N from the earliest section.
    start = client.post(
        "/api/v1/attempts",
        json={"exam_code": "N2", "mode": "full", "question_limit": 20},
    )
    assert start.status_code == 201
    attempt = start.json()
    assert len(attempt["questions"]) == 20

    sections = {q["section"] for q in attempt["questions"]}
    # N2 has vocabulary, grammar, and reading seeded (listening is empty), so a
    # representative 20-question sample must cover all three — the old
    # slice-first-20 bug produced vocabulary only.
    assert sections == {"vocabulary", "grammar", "reading"}
    assert sum(1 for q in attempt["questions"] if q["section"] == "reading") > 0


def test_jlpt_full_mock_checks_sectional_cutoff(client: TestClient):
    start = client.post(
        "/api/v1/attempts",
        json={"exam_code": "N2", "mode": "full"},
    )
    assert start.status_code == 201
    attempt = start.json()
    assert attempt["exam_code"] == "N2"
    # N2 blueprint samples 20 vocab + 20 grammar + 15 reading = 55 available items (listening currently 0)
    assert len(attempt["questions"]) == 55

    submit = client.post(f"/api/v1/attempts/{attempt['id']}/submit", json={"total_time_sec": 600})
    assert submit.status_code == 200
    res = submit.json()
    assert res["scoring_model"] == "jlpt_180"
    assert res["passed"] is False
    assert all(sec["section_passed"] is False for sec in res["section_scores"])

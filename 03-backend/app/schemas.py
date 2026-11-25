from __future__ import annotations

from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class SectionQuotaSchema(BaseModel):
    section: str
    label: str
    target_count: int
    available_count: int
    duration_sec: int
    min_scaled_score: int | None = None
    max_scaled_score: int | None = None


class ExamCatalogItem(BaseModel):
    code: str
    name: str
    scoring_model: str
    pass_total: int
    max_score: int
    duration_sec: int
    total_available: int
    pass_rule_summary: str
    sections: list[SectionQuotaSchema]


class StartAttemptRequest(BaseModel):
    exam_code: str = Field(..., examples=["JFT", "N2"])
    mode: Literal["full", "section"] = "full"
    section: str | None = None
    question_limit: int | None = Field(default=None, ge=1, le=200)


class PublicOptionSchema(BaseModel):
    id: str
    text: str


class AttemptQuestionSchema(BaseModel):
    index: int
    question_id: str
    exam_code: str
    section: str
    topic_tag: str
    prompt: str
    options: list[PublicOptionSchema]
    selected_option_id: str | None = None
    marked_for_review: bool = False
    time_spent_sec: int = 0


class AttemptStateResponse(BaseModel):
    id: str
    exam_code: str
    exam_name: str
    mode: str
    section_filter: str | None = None
    status: str
    duration_sec: int
    remaining_sec: int
    started_at: datetime
    expires_at: datetime
    submitted_at: datetime | None = None
    questions: list[AttemptQuestionSchema]


class SaveAnswerRequest(BaseModel):
    selected_option_id: str | None = None
    marked_for_review: bool = False
    time_spent_sec: int = Field(default=0, ge=0)


class SaveAnswerResponse(BaseModel):
    attempt_id: str
    question_id: str
    selected_option_id: str | None
    marked_for_review: bool
    time_spent_sec: int
    saved_at: datetime


class SubmitAttemptRequest(BaseModel):
    total_time_sec: int | None = Field(default=None, ge=0)


class SectionScoreResult(BaseModel):
    section: str
    label: str
    correct: int
    total: int
    accuracy_pct: float
    scaled_score: int
    max_scaled_score: int
    min_scaled_score: int | None = None
    section_passed: bool
    time_spent_sec: int


class GradedOptionReview(BaseModel):
    id: str
    text: str
    is_correct: bool
    explanation: str | None = None


class GradedQuestionReview(BaseModel):
    index: int
    question_id: str
    exam_code: str
    section: str
    topic_tag: str
    prompt: str
    explanation: str
    selected_option_id: str | None
    correct_option_id: str
    is_correct: bool
    marked_for_review: bool
    time_spent_sec: int
    options: list[GradedOptionReview]


class AttemptResultResponse(BaseModel):
    attempt_id: str
    exam_code: str
    exam_name: str
    mode: str
    scoring_model: str
    raw_correct: int
    raw_total: int
    accuracy_pct: float
    scaled_score: int
    max_score: int
    pass_total: int
    passed: bool
    pass_rule_summary: str
    total_time_sec: int
    weak_sections: list[str]
    weak_topics: list[str]
    section_scores: list[SectionScoreResult]
    questions: list[GradedQuestionReview]
    submitted_at: datetime


class AttemptHistoryItem(BaseModel):
    attempt_id: str
    exam_code: str
    exam_name: str
    mode: str
    section_filter: str | None = None
    status: str
    raw_correct: int | None = None
    raw_total: int | None = None
    scaled_score: int | None = None
    max_score: int | None = None
    passed: bool | None = None
    started_at: datetime
    submitted_at: datetime | None = None


class MistakeItemResponse(BaseModel):
    question_id: str
    exam_code: str
    section: str
    topic_tag: str
    prompt: str
    wrong_count: int
    consecutive_correct: int
    status: str
    explanation: str
    updated_at: datetime

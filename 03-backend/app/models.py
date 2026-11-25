from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_uuid() -> str:
    return str(uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False, default="Student")
    preferred_lang: Mapped[str] = mapped_column(String(16), nullable=False, default="en")
    daily_target: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    attempts: Mapped[list[ExamAttempt]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    scoring_model: Mapped[str] = mapped_column(String(32), nullable=False)
    pass_total: Mapped[int] = mapped_column(Integer, nullable=False)
    max_score: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_sec: Mapped[int] = mapped_column(Integer, nullable=False)
    config_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    exam_code: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    section: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    topic_tag: Mapped[str] = mapped_column(String(64), nullable=False, default="general")
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False, default="")
    source: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    options: Mapped[list[QuestionOption]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="QuestionOption.display_order",
    )


class QuestionOption(Base):
    __tablename__ = "question_options"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_uuid)
    question_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("questions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    display_order: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)

    question: Mapped[Question] = relationship(back_populates="options")


class ExamAttempt(Base):
    __tablename__ = "exam_attempts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    exam_code: Mapped[str] = mapped_column(String(16), index=True, nullable=False)
    mode: Mapped[str] = mapped_column(String(16), nullable=False, default="full")
    section_filter: Mapped[str | None] = mapped_column(String(32), nullable=True)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="in_progress")
    # Stores ordered list of {"question_id": str, "option_order": [option_id, ...]}
    question_snapshot_json: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    duration_sec: Mapped[int] = mapped_column(Integer, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="attempts")
    answers: Mapped[list[StudentAnswer]] = relationship(
        back_populates="attempt", cascade="all, delete-orphan"
    )
    result: Mapped[ExamResult | None] = relationship(
        back_populates="attempt", cascade="all, delete-orphan", uselist=False
    )


class StudentAnswer(Base):
    __tablename__ = "student_answers"
    __table_args__ = (UniqueConstraint("attempt_id", "question_id", name="uq_attempt_question"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_uuid)
    attempt_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("exam_attempts.id", ondelete="CASCADE"), index=True, nullable=False
    )
    question_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("questions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    selected_option_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("question_options.id", ondelete="SET NULL"), nullable=True
    )
    marked_for_review: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    time_spent_sec: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    answered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    attempt: Mapped[ExamAttempt] = relationship(back_populates="answers")


class ExamResult(Base):
    __tablename__ = "exam_results"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_uuid)
    attempt_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("exam_attempts.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    raw_correct: Mapped[int] = mapped_column(Integer, nullable=False)
    raw_total: Mapped[int] = mapped_column(Integer, nullable=False)
    accuracy_pct: Mapped[float] = mapped_column(Float, nullable=False)
    scaled_score: Mapped[int] = mapped_column(Integer, nullable=False)
    max_score: Mapped[int] = mapped_column(Integer, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    total_time_sec: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    section_scores_json: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    weak_sections_json: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    weak_topics_json: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    attempt: Mapped[ExamAttempt] = relationship(back_populates="result")


class MistakeBank(Base):
    __tablename__ = "mistake_bank"
    __table_args__ = (UniqueConstraint("user_id", "question_id", name="uq_mistake_user_question"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    question_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("questions.id", ondelete="CASCADE"), index=True, nullable=False
    )
    wrong_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    consecutive_correct: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="active")
    last_wrong_option_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_attempt_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class LearningProgress(Base):
    __tablename__ = "learning_progress"
    __table_args__ = (UniqueConstraint("user_id", "exam_code", "section", name="uq_progress_scope"),)

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    exam_code: Mapped[str] = mapped_column(String(16), nullable=False)
    section: Mapped[str] = mapped_column(String(32), nullable=False)
    attempts_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    correct_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    accuracy_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_uuid)
    user_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    mode: Mapped[str] = mapped_column(String(24), nullable=False, default="exam_help")
    exam_attempt_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("exam_attempts.id", ondelete="SET NULL"), nullable=True
    )
    question_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("questions.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False, default="Manabi AI Session")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    messages: Mapped[list[AIMessage]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )


class AIMessage(Base):
    __tablename__ = "ai_messages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=new_uuid)
    conversation_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("ai_conversations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    role: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    conversation: Mapped[AIConversation] = relationship(back_populates="messages")

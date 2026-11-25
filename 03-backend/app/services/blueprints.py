from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SectionBlueprint:
    section: str
    label: str
    target_count: int
    duration_sec: int
    max_scaled_score: int | None = None
    min_scaled_score: int | None = None


@dataclass(frozen=True)
class ExamBlueprint:
    code: str
    name: str
    scoring_model: str  # "jft_250" | "jlpt_180"
    pass_total: int
    max_score: int
    duration_sec: int
    pass_rule_summary: str
    sections: tuple[SectionBlueprint, ...]


EXAM_BLUEPRINTS: dict[str, ExamBlueprint] = {
    "JFT": ExamBlueprint(
        code="JFT",
        name="JFT-Basic",
        scoring_model="jft_250",
        pass_total=200,
        max_score=250,
        duration_sec=60 * 60,
        pass_rule_summary="200 / 250 overall pass threshold across all 4 sections (no individual section cutoff)",
        sections=(
            SectionBlueprint("vocabulary", "Script & Vocabulary", 15, 15 * 60),
            SectionBlueprint("grammar", "Conversation & Grammar", 15, 15 * 60),
            SectionBlueprint("reading", "Reading Comprehension", 10, 15 * 60),
            SectionBlueprint("listening", "Listening Comprehension", 10, 15 * 60),
        ),
    ),
    "N5": ExamBlueprint(
        code="N5",
        name="JLPT N5",
        scoring_model="jlpt_180",
        pass_total=80,
        max_score=180,
        duration_sec=90 * 60,
        pass_rule_summary="80 / 180 overall pass AND sectional minimums (Language Knowledge+Reading >= 38/120, Listening >= 19/60)",
        sections=(
            SectionBlueprint("vocabulary", "Vocabulary & Kanji", 15, 25 * 60, max_scaled_score=60, min_scaled_score=19),
            SectionBlueprint("grammar", "Grammar", 15, 30 * 60, max_scaled_score=60, min_scaled_score=19),
            SectionBlueprint("reading", "Reading", 10, 20 * 60, max_scaled_score=30, min_scaled_score=10),
            SectionBlueprint("listening", "Listening", 10, 30 * 60, max_scaled_score=60, min_scaled_score=19),
        ),
    ),
    "N4": ExamBlueprint(
        code="N4",
        name="JLPT N4",
        scoring_model="jlpt_180",
        pass_total=90,
        max_score=180,
        duration_sec=115 * 60,
        pass_rule_summary="90 / 180 overall pass AND sectional minimums (Knowledge+Reading >= 38/120, Listening >= 19/60)",
        sections=(
            SectionBlueprint("vocabulary", "Vocabulary & Kanji", 20, 30 * 60, max_scaled_score=60, min_scaled_score=19),
            SectionBlueprint("grammar", "Grammar", 15, 35 * 60, max_scaled_score=60, min_scaled_score=19),
            SectionBlueprint("reading", "Reading", 10, 25 * 60, max_scaled_score=60, min_scaled_score=19),
            SectionBlueprint("listening", "Listening", 10, 35 * 60, max_scaled_score=60, min_scaled_score=19),
        ),
    ),
    "N3": ExamBlueprint(
        code="N3",
        name="JLPT N3",
        scoring_model="jlpt_180",
        pass_total=95,
        max_score=180,
        duration_sec=140 * 60,
        pass_rule_summary="95 / 180 overall pass AND >= 19/60 minimum in each JLPT section",
        sections=(
            SectionBlueprint("vocabulary", "Vocabulary & Kanji", 20, 30 * 60, max_scaled_score=60, min_scaled_score=19),
            SectionBlueprint("grammar", "Grammar", 15, 35 * 60, max_scaled_score=60, min_scaled_score=19),
            SectionBlueprint("reading", "Reading", 10, 35 * 60, max_scaled_score=60, min_scaled_score=19),
            SectionBlueprint("listening", "Listening", 10, 40 * 60, max_scaled_score=60, min_scaled_score=19),
        ),
    ),
    "N2": ExamBlueprint(
        code="N2",
        name="JLPT N2",
        scoring_model="jlpt_180",
        pass_total=90,
        max_score=180,
        duration_sec=155 * 60,
        pass_rule_summary="90 / 180 overall pass AND >= 19/60 minimum in Language Knowledge, Reading, and Listening",
        sections=(
            SectionBlueprint("vocabulary", "Vocabulary & Kanji", 20, 35 * 60, max_scaled_score=60, min_scaled_score=19),
            SectionBlueprint("grammar", "Grammar", 20, 35 * 60, max_scaled_score=60, min_scaled_score=19),
            SectionBlueprint("reading", "Reading", 15, 35 * 60, max_scaled_score=60, min_scaled_score=19),
            SectionBlueprint("listening", "Listening", 10, 50 * 60, max_scaled_score=60, min_scaled_score=19),
        ),
    ),
    "N1": ExamBlueprint(
        code="N1",
        name="JLPT N1",
        scoring_model="jlpt_180",
        pass_total=100,
        max_score=180,
        duration_sec=170 * 60,
        pass_rule_summary="100 / 180 overall pass AND >= 19/60 minimum in Language Knowledge, Reading, and Listening",
        sections=(
            SectionBlueprint("vocabulary", "Vocabulary & Kanji", 20, 35 * 60, max_scaled_score=60, min_scaled_score=19),
            SectionBlueprint("grammar", "Grammar", 20, 40 * 60, max_scaled_score=60, min_scaled_score=19),
            SectionBlueprint("reading", "Reading", 15, 35 * 60, max_scaled_score=60, min_scaled_score=19),
            SectionBlueprint("listening", "Listening", 10, 60 * 60, max_scaled_score=60, min_scaled_score=19),
        ),
    ),
}

SECTION_DISPLAY_NAMES: dict[str, str] = {
    "vocabulary": "Vocabulary & Kanji",
    "grammar": "Grammar",
    "reading": "Reading",
    "listening": "Listening",
}


def get_blueprint(exam_code: str) -> ExamBlueprint:
    code = exam_code.strip().upper()
    if code not in EXAM_BLUEPRINTS:
        raise KeyError(f"Unsupported exam code: {exam_code}")
    return EXAM_BLUEPRINTS[code]


def infer_topic_tag(section: str, prompt: str) -> str:
    """Assign lightweight topic metadata from Japanese prompt features for weak-topic diagnosis."""
    text = prompt or ""
    if section == "grammar":
        for marker, tag in [
            ("から", "cause-reason"),
            ("ので", "cause-reason"),
            ("のに", "contrast"),
            ("けれど", "contrast"),
            ("ば", "conditionals"),
            ("たら", "conditionals"),
            ("なら", "conditionals"),
            ("て", "verb-conjugation"),
            ("ない", "negation"),
            ("よう", "volitional-appearance"),
            ("れる", "passive-potential"),
            ("させ", "causative"),
            (" honor", "keigo"),
            ("お", "polite-expressions"),
        ]:
            if marker in text:
                return tag
        return "grammar-usage"
    if section == "vocabulary":
        if "読み" in text or "かんじ" in text or "漢字" in text:
            return "kanji-reading"
        return "word-meaning"
    if section == "reading":
        return "passage-comprehension"
    if section == "listening":
        return "listening-comprehension"
    return "general"

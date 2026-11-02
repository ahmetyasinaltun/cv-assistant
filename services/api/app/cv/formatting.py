# Language-aware text rules for printed CVs: section titles, Turkish uppercasing, date ranges and link text.

from app.cv.content import SectionKey
from app.schemas.common import Language

SECTION_TITLES: dict[Language, dict[SectionKey, str]] = {
    "en": {
        "summary": "Summary",
        "experience": "Experience",
        "education": "Education",
        "projects": "Projects",
        "skills": "Skills",
        "languages": "Languages",
        "certificates": "Certifications",
    },
    "tr": {
        "summary": "Özet",
        "experience": "Deneyim",
        "education": "Eğitim",
        "projects": "Projeler",
        "skills": "Yetenekler",
        "languages": "Diller",
        "certificates": "Sertifikalar",
    },
}

MONTHS: dict[Language, tuple[str, ...]] = {
    "en": ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"),
    "tr": ("Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"),
}

PRESENT: dict[Language, str] = {"en": "Present", "tr": "Günümüz"}

# An en dash with thin spaces reads as a range to people and to CV parsers alike.
RANGE_SEPARATOR = " – "


def upper_for(text: str, language: Language) -> str:
    """Uppercases with the language's rules: Turkish "i" becomes "İ" and "ı" becomes "I"."""
    if language == "tr":
        text = text.replace("i", "İ").replace("ı", "I")
    return text.upper()


def format_month(value: str, language: Language) -> str:
    """Formats "2025-06" as "Jun 2025" (en) or "Haz 2025" (tr); a year alone stays as it is."""
    year, _, month = value.partition("-")
    if not month:
        return year
    return f"{MONTHS[language][int(month) - 1]} {year}"


def format_period(start: str | None, end: str | None, language: Language) -> str | None:
    """A date range as printed on the CV, or None when there is no date at all."""
    end_text = PRESENT[language] if end == "present" else (end and format_month(end, language))
    start_text = start and format_month(start, language)
    if start_text and end_text:
        return f"{start_text}{RANGE_SEPARATOR}{end_text}"
    return start_text or end_text or None


def display_url(url: str) -> str:
    """The address a reader can type: no scheme, no "www.", no trailing slash."""
    text = url.split("://", 1)[-1]
    if text.lower().startswith("www."):
        text = text[4:]
    return text.rstrip("/")

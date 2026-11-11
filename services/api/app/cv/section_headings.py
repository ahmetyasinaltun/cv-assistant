# Checks the model's list of CV sections it did not carry over: a heading that names a section the CV document holds
# after all ("EGITIM" when the education section is filled) was carried over, so the person is not told otherwise.

import re
import unicodedata

from app.cv.content import CvContent, SectionKey
from app.cv.formatting import SECTION_TITLES

# Common headings beyond the printed section titles, in English and Turkish. They are compared folded, so case,
# Turkish letters and punctuation do not matter. An unknown heading is left to the model's judgement.
_MORE_HEADINGS: dict[SectionKey, tuple[str, ...]] = {
    "summary": (
        "Profile",
        "About",
        "About me",
        "Professional summary",
        "Objective",
        "Career objective",
        "Hakkımda",
        "Profil",
        "Kariyer hedefi",
        "Özgeçmiş özeti",
    ),
    "experience": (
        "Work experience",
        "Professional experience",
        "Employment",
        "Internships",
        "Internship",
        "İş deneyimi",
        "Deneyimler",
        "İş tecrübesi",
        "Tecrübe",
        "Staj",
        "Stajlar",
        "Staj deneyimi",
    ),
    "education": ("Academic background", "Eğitim bilgileri", "Öğrenim", "Öğrenim bilgileri"),
    "projects": (
        "Personal projects",
        "Academic projects",
        "Kişisel projeler",
        "Projelerim",
        "Akademik projeler",
    ),
    "skills": (
        "Technical skills",
        "Skills and tools",
        "Beceriler",
        "Teknik beceriler",
        "Yetkinlikler",
        "Teknik yetenekler",
        "Yetenekler ve araçlar",
    ),
    "languages": ("Foreign languages", "Yabancı diller", "Yabancı dil", "Dil bilgisi"),
    "certificates": (
        "Certificates",
        "Certification",
        "Licenses and certifications",
        "Sertifika",
        "Sertifikalar ve belgeler",
        "Belgeler",
    ),
}
_CONTACT_HEADINGS = ("Contact", "Contact information", "İletişim", "İletişim bilgileri")
_JOINING_WORDS = {"and", "ve"}


def fold_heading(text: str) -> str:
    """Gives a heading one spelling: "EĞİTİM:", "Egitim" and "eğitim" all become "egitim"."""
    without_marks = "".join(
        char for char in unicodedata.normalize("NFKD", text) if not unicodedata.combining(char)
    )
    words = re.sub(r"[\W_]+", " ", without_marks.lower().replace("ı", "i")).split()
    return " ".join(word for word in words if word not in _JOINING_WORDS)


_SECTION_BY_HEADING: dict[str, SectionKey] = {
    fold_heading(heading): key
    for key, headings in _MORE_HEADINGS.items()
    for heading in (*headings, *(titles[key] for titles in SECTION_TITLES.values()))
}
_CONTACT = {fold_heading(heading) for heading in _CONTACT_HEADINGS}


def _was_carried_over(heading: str, content: CvContent) -> bool:
    folded = fold_heading(heading)
    if folded in _CONTACT:
        contact = content.contact
        return bool(contact.email or contact.phone or contact.location or contact.links)
    key = _SECTION_BY_HEADING.get(folded)
    return key is not None and bool(getattr(content, key))


def not_carried_over(headings: list[str], content: CvContent) -> list[str]:
    """The model's omitted headings, without those whose section the CV document holds."""
    return [heading for heading in headings if not _was_carried_over(heading, content)]

# Deterministic cleanup of resume/job text before storage and AI processing (no model calls here).

import re
import unicodedata

_BULLET_CHARS = "•·▪◦●○■□➢➤►▶✓✔-–—*"
_MULTI_SPACE = re.compile(r"[ \t ]+")
_MULTI_NEWLINE = re.compile(r"\n{3,}")
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def normalize_document_text(text: str, *, max_chars: int) -> str:
    """Normalize whitespace and bullets so different sources (PDF, paste) look alike to the pipeline."""
    text = unicodedata.normalize("NFKC", text)
    text = _CONTROL_CHARS.sub("", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [_normalize_line(line) for line in text.split("\n")]
    text = "\n".join(lines)
    text = _MULTI_NEWLINE.sub("\n\n", text).strip()
    return text[:max_chars]


def _normalize_line(line: str) -> str:
    line = _MULTI_SPACE.sub(" ", line).strip()
    if len(line) > 1 and line[0] in _BULLET_CHARS and line[1] == " ":
        line = "- " + line[2:].lstrip()
    return line


def fold_for_matching(text: str) -> str:
    """Lowercase without accents, so "İletişim", "iletişim" and "ILETISIM" compare equal.

    Only for comparing words; stored and displayed text keeps its original form.
    """
    decomposed = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in decomposed if not unicodedata.combining(c)).replace("ı", "i")

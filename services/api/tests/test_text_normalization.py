# Unit tests for deterministic document text normalization.

from app.services.text_normalization import normalize_document_text


def test_collapses_whitespace_and_newlines():
    raw = "Line one   with\tspaces\r\n\r\n\r\n\r\nLine two"
    assert normalize_document_text(raw, max_chars=1000) == "Line one with spaces\n\nLine two"


def test_normalizes_bullet_characters():
    raw = "• Built APIs\n▪ Wrote tests\n* Led labs"
    assert normalize_document_text(raw, max_chars=1000) == "- Built APIs\n- Wrote tests\n- Led labs"


def test_strips_control_characters_and_truncates():
    raw = "abc\x00def" + "x" * 50
    result = normalize_document_text(raw, max_chars=10)
    assert result == "abcdefxxxx"

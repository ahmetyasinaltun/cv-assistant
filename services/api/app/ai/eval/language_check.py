# Rough, dependency-free guess of whether a generated text is English or Turkish, used only by the evaluation.
# It counts common function words and Turkish-only letters; short or evenly mixed texts stay undecided.

import re

_WORD = re.compile(r"[^\W\d_]+")
_ENGLISH_WORDS = frozenset(
    "an and are as be but by can for from has have in is it not of on or should that the their "
    "this to was were which will with you your".split()
)
_TURKISH_WORDS = frozenset(
    "ama ancak bir bu da daha de en gibi göre her ile ise için kadar ki mi ne olan olarak sen "
    "sonra var ve veya ya yok".split()
)
_TURKISH_LETTERS = frozenset("çğıöşü")


def guess_language(text: str) -> str | None:
    """Return "en", "tr" or None when the text gives no clear signal either way."""
    # Python lowercases "İ" to "i" plus a combining dot, which would split the word.
    # Single letters are skipped: the "a" in "A/B" or "C" is not the English article.
    words = [w for w in _WORD.findall(text.replace("İ", "i").lower()) if len(w) > 1]
    english = sum(word in _ENGLISH_WORDS for word in words)
    turkish = sum(
        word in _TURKISH_WORDS or any(letter in _TURKISH_LETTERS for letter in word)
        for word in words
    )
    if english == turkish:
        return None
    return "en" if english > turkish else "tr"

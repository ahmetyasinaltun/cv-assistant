# Keyword ranking with Okapi BM25 over the evidence lines of one resume.
# It complements embeddings: a line that repeats the requirement's own words always ranks high here.

import math
import re
from collections import Counter

from app.services.text_normalization import fold_for_matching

STEM_LENGTH = 5
BM25_K1 = 1.2  # How quickly repeating a word stops adding to the score.
BM25_B = 0.75  # How much longer lines are penalised for having more chances to match.

_WORD = re.compile(r"[^\W_]+")
# Function words of both supported languages, already folded (no accents).
_STOPWORDS = frozenset(
    "a an and are as at be by for from in is it of on or the to with "
    "ama ancak bir bu da de en gibi icin ile ise ki olan olarak ve veya ya".split()
)


def keyword_terms(text: str) -> list[str]:
    """Folded words without stopwords, cut to their first five letters.

    The fixed-length prefix is a crude, language-independent stemmer: it joins Turkish suffixed forms
    ("öğrencisi", "öğrenci") and English word families ("developer", "development").
    """
    words = _WORD.findall(fold_for_matching(text))
    return [w[:STEM_LENGTH] for w in words if len(w) > 1 and w not in _STOPWORDS]


class BM25Index:
    """Scores a query against a small fixed set of documents; words rare in the set weigh more."""

    def __init__(self, documents: list[str]):
        self._term_counts = [Counter(keyword_terms(document)) for document in documents]
        self._lengths = [sum(counts.values()) for counts in self._term_counts]
        # Falls back to 1 when there are no documents or no words, so scoring never divides by zero.
        self._average_length = sum(self._lengths) / len(self._lengths) if documents else 0.0
        self._average_length = self._average_length or 1.0
        document_frequency = Counter(term for counts in self._term_counts for term in counts)
        total = len(documents)
        self._idf = {
            term: math.log(1 + (total - frequency + 0.5) / (frequency + 0.5))
            for term, frequency in document_frequency.items()
        }

    def scores(self, query: str) -> list[float]:
        """One score per document, in document order; 0 when the document shares no word with the query."""
        terms = set(keyword_terms(query))
        return [
            self._score(terms, counts, length)
            for counts, length in zip(self._term_counts, self._lengths, strict=True)
        ]

    def _score(self, terms: set[str], counts: Counter, length: int) -> float:
        length_factor = 1 - BM25_B + BM25_B * length / self._average_length
        score = 0.0
        for term in terms:
            frequency = counts.get(term, 0)
            if frequency:
                score += (
                    self._idf[term]
                    * frequency
                    * (BM25_K1 + 1)
                    / (frequency + BM25_K1 * length_factor)
                )
        return score

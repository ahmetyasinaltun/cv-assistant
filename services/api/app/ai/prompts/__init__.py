# Loads prompt templates from the Markdown files in this package and fills their {{placeholders}}.

from functools import lru_cache
from pathlib import Path

_PROMPT_DIR = Path(__file__).parent


@lru_cache
def _load_template(name: str) -> str:
    path = _PROMPT_DIR / f"{name}.md"
    if not path.exists():
        raise FileNotFoundError(f"Prompt template not found: {path}")
    return path.read_text(encoding="utf-8")


def render_prompt(name: str, **values: str) -> str:
    """Substitute {{key}} tokens; simple replace is used so JSON braces in values stay untouched."""
    template = _load_template(name)
    for key, value in values.items():
        placeholder = "{{" + key + "}}"
        if placeholder not in template:
            raise KeyError(f"Prompt '{name}' has no placeholder {placeholder}")
        template = template.replace(placeholder, value)
    if "{{" in template:
        raise KeyError(f"Prompt '{name}' still has unfilled placeholders")
    return template

# The structured CV contract (CvContent) shared by the CV Maker, the tailored CV and the PDF renderer.

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, field_validator

# Where a line came from. Shown in the editor only, never in the PDF: the user sees which lines the AI wrote
# and should be ready to talk about.
LineOrigin = Literal["cv", "ai_reworded", "ai_embellished", "ai_added", "confirmed", "user"]

SectionKey = Literal[
    "summary", "experience", "education", "projects", "skills", "languages", "certificates"
]
DEFAULT_SECTION_ORDER: tuple[SectionKey, ...] = (
    "summary",
    "experience",
    "education",
    "projects",
    "skills",
    "languages",
    "certificates",
)

# Dates are a year or a year and month ("2025", "2025-06"), so every template prints them the same way
# and month names come from code in the CV's language instead of from the model.
YearMonth = Annotated[str, StringConstraints(pattern=r"^\d{4}(-(0[1-9]|1[0-2]))?$")]

ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)]
OptionalShortText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=160)] | None
LineText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=600)]
Url = Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)]


class CvModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


def _require_web_address(value: str) -> str:
    # Links are clickable in the PDF, so only web addresses are allowed (no javascript:, file: or mailto:).
    if not value.lower().startswith(("https://", "http://")):
        raise ValueError("Links must start with http:// or https://")
    return value


class CvLine(CvModel):
    """One bullet, summary sentence or skill, with its origin."""

    text: LineText
    origin: LineOrigin = "user"
    # Evidence ids from an analysis when origin is "cv"; empty otherwise.
    evidence_ids: list[Annotated[str, StringConstraints(max_length=20)]] = Field(
        default_factory=list, max_length=10
    )


class CvLink(CvModel):
    url: Url

    _check_url = field_validator("url")(_require_web_address)


class CvContact(CvModel):
    name: ShortText
    email: EmailStr | None = None
    phone: OptionalShortText = None
    location: OptionalShortText = None
    links: list[CvLink] = Field(default_factory=list, max_length=5)


class CvExperience(CvModel):
    role: ShortText
    organization: ShortText
    location: OptionalShortText = None
    start: YearMonth | None = None
    end: YearMonth | Literal["present"] | None = None
    bullets: list[CvLine] = Field(default_factory=list, max_length=12)


class CvEducation(CvModel):
    degree: ShortText
    school: ShortText
    location: OptionalShortText = None
    start: YearMonth | None = None
    end: YearMonth | Literal["present"] | None = None
    details: list[CvLine] = Field(default_factory=list, max_length=8)


class CvProject(CvModel):
    name: ShortText
    link: CvLink | None = None
    start: YearMonth | None = None
    end: YearMonth | Literal["present"] | None = None
    bullets: list[CvLine] = Field(default_factory=list, max_length=8)


class CvSkillGroup(CvModel):
    # A group label such as "Languages" or "Tools"; a CV with one plain list leaves it empty.
    name: OptionalShortText = None
    items: list[CvLine] = Field(min_length=1, max_length=40)


class CvLanguage(CvModel):
    name: ShortText
    level: OptionalShortText = None


class CvCertificate(CvModel):
    name: ShortText
    issuer: OptionalShortText = None
    date: YearMonth | None = None


class CvSection(CvModel):
    key: SectionKey
    visible: bool = True


class CvContent(CvModel):
    """A whole CV. Section titles are not stored: they come from the CV's language at render time."""

    contact: CvContact
    headline: OptionalShortText = None
    summary: list[CvLine] = Field(default_factory=list, max_length=8)
    experience: list[CvExperience] = Field(default_factory=list, max_length=15)
    education: list[CvEducation] = Field(default_factory=list, max_length=8)
    projects: list[CvProject] = Field(default_factory=list, max_length=15)
    skills: list[CvSkillGroup] = Field(default_factory=list, max_length=10)
    languages: list[CvLanguage] = Field(default_factory=list, max_length=10)
    certificates: list[CvCertificate] = Field(default_factory=list, max_length=15)
    # Order and visibility of the sections; keys left out keep their default place at the end.
    sections: list[CvSection] = Field(
        default_factory=list, max_length=len(DEFAULT_SECTION_ORDER), validate_default=True
    )

    @field_validator("sections")
    @classmethod
    def _complete_section_order(cls, sections: list[CvSection]) -> list[CvSection]:
        keys = [section.key for section in sections]
        if len(keys) != len(set(keys)):
            raise ValueError("Each section may appear only once")
        missing = [CvSection(key=key) for key in DEFAULT_SECTION_ORDER if key not in keys]
        return [*sections, *missing]

# Turns CvContent into the print-ready data a Typst template lays out: visible sections in order with titles,
# formatted dates and link text already resolved, so templates hold layout only and no language rules.

from typing import Any

from app.cv.content import CvContent, CvEducation, CvExperience, CvLine, CvProject, SectionKey
from app.cv.formatting import (
    SECTION_TITLES,
    display_url,
    format_month,
    format_period,
    upper_for,
)
from app.schemas.common import Language

PrintData = dict[str, Any]


def build_print_view(content: CvContent, language: Language) -> PrintData:
    contact = content.contact
    contact_items = [
        {"text": contact.email, "url": f"mailto:{contact.email}"} if contact.email else None,
        {"text": contact.phone, "url": None} if contact.phone else None,
        {"text": contact.location, "url": None} if contact.location else None,
    ]
    sections = []
    for section in content.sections:
        if not section.visible:
            continue
        body = _section_body(content, section.key, language)
        if body is None:
            continue
        title = SECTION_TITLES[language][section.key]
        sections.append(
            {"key": section.key, "title": title, "title_upper": upper_for(title, language), **body}
        )
    return {
        "lang": language,
        "name": contact.name,
        "headline": content.headline,
        "contact": [item for item in contact_items if item is not None],
        # Kept apart from the contact details so a template can give web addresses their own line.
        "links": [{"text": display_url(link.url), "url": link.url} for link in contact.links],
        "sections": sections,
    }


def _section_body(content: CvContent, key: SectionKey, language: Language) -> PrintData | None:
    """The section's printable body, or None when it has nothing to print (empty sections are left out)."""
    match key:
        case "summary":
            text = " ".join(line.text for line in content.summary)
            return {"kind": "paragraph", "text": text} if text else None
        case "experience":
            entries = [_experience_entry(item, language) for item in content.experience]
        case "education":
            entries = [_education_entry(item, language) for item in content.education]
        case "projects":
            entries = [_project_entry(item, language) for item in content.projects]
        case "certificates":
            entries = [
                _entry(
                    title=item.name,
                    organization=item.issuer,
                    period=item.date and format_month(item.date, language),
                )
                for item in content.certificates
            ]
        case "skills":
            groups = [
                {"label": group.name, "text": ", ".join(item.text for item in group.items)}
                for group in content.skills
            ]
            return {"kind": "groups", "groups": groups} if groups else None
        case "languages":
            text = ", ".join(
                f"{item.name} ({item.level})" if item.level else item.name
                for item in content.languages
            )
            return {"kind": "line", "text": text} if text else None
    return {"kind": "entries", "entries": entries} if entries else None


def _entry(
    *,
    title: str,
    organization: str | None = None,
    location: str | None = None,
    period: str | None = None,
    link: PrintData | None = None,
    bullets: list[CvLine] | None = None,
) -> PrintData:
    return {
        "title": title,
        "organization": organization,
        "location": location,
        "period": period,
        "link": link,
        "bullets": [line.text for line in bullets or []],
    }


def _experience_entry(item: CvExperience, language: Language) -> PrintData:
    return _entry(
        title=item.role,
        organization=item.organization,
        location=item.location,
        period=format_period(item.start, item.end, language),
        bullets=item.bullets,
    )


def _education_entry(item: CvEducation, language: Language) -> PrintData:
    return _entry(
        title=item.degree,
        organization=item.school,
        location=item.location,
        period=format_period(item.start, item.end, language),
        bullets=item.details,
    )


def _project_entry(item: CvProject, language: Language) -> PrintData:
    link = item.link and {"text": display_url(item.link.url), "url": item.link.url}
    return _entry(
        title=item.name,
        period=format_period(item.start, item.end, language),
        link=link,
        bullets=item.bullets,
    )

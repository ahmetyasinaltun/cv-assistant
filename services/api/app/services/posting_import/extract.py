# Finds the job title, company and posting text in a fetched page. Order: schema.org JobPosting data (job sites embed
# it for Google Jobs), then the layouts of sites that do not (LinkedIn, Kariyer.net), then the page's main text.

import copy
import html
import json
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from urllib.parse import urlsplit

from bs4 import BeautifulSoup, Tag

# A shorter text is a teaser or an error page, not a posting; the API asks the same of a pasted posting.
MIN_POSTING_CHARS = 50

# Blocks are set apart by a blank line; list items (handled on their own) stay on consecutive lines.
_BLOCK_TAGS = [
    "p", "div", "section", "article", "header", "footer", "ul", "ol", "table", "tr",
    "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "dl", "dt", "dd",
]  # fmt: skip
_NOISE_TAGS = [
    "script", "style", "noscript", "template", "svg", "nav", "header", "footer", "form", "aside", "button",
]  # fmt: skip


@dataclass(frozen=True)
class ExtractedPosting:
    title: str | None
    company: str | None
    text: str


def extract_posting(
    content: bytes, url: str, encoding: str | None = None
) -> ExtractedPosting | None:
    """The posting found on the page, or None when the page holds no posting text of a useful length."""
    soup = BeautifulSoup(content, "html.parser", from_encoding=encoding)
    for extractor in (_from_job_posting_data, _site_extractor(url), _from_main_text):
        posting = extractor(soup) if extractor else None
        if posting and len(posting.text) >= MIN_POSTING_CHARS:
            return posting
    return None


def html_to_text(node: Tag) -> str:
    """Visible text with the page's line structure: blocks and <br> become line breaks, list items become "- " lines.

    Works on a copy, so a later extractor still sees the page as it was fetched.
    """
    node = copy.copy(node)
    for br in node.find_all("br"):
        br.replace_with("\n")
    for item in node.find_all("li"):
        # "<li><p>Python</p></li>" stays one line: the item's own paragraphs do not break it.
        for inner in item.find_all(["p", "div"]):
            inner.unwrap()
        item.insert(0, "- ")
        item.insert_before("\n")
    for block in node.find_all(_BLOCK_TAGS):
        block.insert_before("\n")
        block.insert_after("\n")
    lines = (" ".join(line.split()) for line in node.get_text().split("\n"))
    return "\n".join(_collapse_blank_lines(lines)).strip()


def _site_extractor(url: str) -> Callable[[BeautifulSoup], ExtractedPosting | None] | None:
    parts = urlsplit(url)
    host = parts.hostname or ""
    if host == "linkedin.com" or host.endswith(".linkedin.com"):
        return (
            _linkedin_post if parts.path.startswith(("/posts/", "/feed/update/")) else _linkedin_job
        )
    if host == "kariyer.net" or host.endswith(".kariyer.net"):
        return _kariyer_net
    return None


def _from_job_posting_data(soup: BeautifulSoup) -> ExtractedPosting | None:
    for posting in _job_postings(soup):
        description = str(posting.get("description") or "")
        # Some sites escape the HTML inside the JSON string a second time ("&lt;p&gt;").
        if "&lt;" in description:
            description = html.unescape(description)
        organization = posting.get("hiringOrganization")
        company = organization.get("name") if isinstance(organization, dict) else organization
        return ExtractedPosting(
            title=_clean(posting.get("title")),
            company=_clean(company),
            text=html_to_text(BeautifulSoup(description, "html.parser")),
        )
    return None


def _job_postings(soup: BeautifulSoup) -> Iterator[dict]:
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            data = json.loads(script.string or "", strict=False)
        except json.JSONDecodeError:
            continue
        yield from _walk_for_type(data, "JobPosting")


def _walk_for_type(node: object, wanted: str) -> Iterator[dict]:
    if isinstance(node, list):
        for item in node:
            yield from _walk_for_type(item, wanted)
    elif isinstance(node, dict):
        kind = node.get("@type")
        if kind == wanted or (isinstance(kind, list) and wanted in kind):
            yield node
        for value in node.values():
            if isinstance(value, (dict, list)):
                yield from _walk_for_type(value, wanted)


def _linkedin_job(soup: BeautifulSoup) -> ExtractedPosting | None:
    description = soup.select_one(".show-more-less-html__markup")
    if description is None:
        return None
    return ExtractedPosting(
        title=_text_of(soup.select_one(".top-card-layout__title")),
        company=_text_of(soup.select_one(".topcard__org-name-link")),
        text=html_to_text(description),
    )


def _linkedin_post(soup: BeautifulSoup) -> ExtractedPosting | None:
    """A post has no job title; its preview text is the whole post with line breaks, and its title ends in
    "| <author>", the company or person who shared it."""
    text = _meta(soup, "og:description")
    if not text:
        return None
    title = _meta(soup, "og:title") or ""
    author = title.rsplit(" | ", 1)[1] if " | " in title else None
    return ExtractedPosting(title=None, company=_clean(author), text=text.strip())


def _kariyer_net(soup: BeautifulSoup) -> ExtractedPosting | None:
    description = soup.select_one('[data-test="qualifications-and-job-description"]')
    if description is None:
        return None
    text = html_to_text(description)
    # "Aday Kriterleri": experience, education and similar requirements Kariyer.net keeps outside the text.
    titles = soup.select('[data-test="alignment-list-title"]')
    values = soup.select('[data-test="alignment-list-value"]')
    criteria = [
        f"- {(_text_of(name) or '').lstrip('•').strip()}: {_text_of(value)}"
        for name, value in zip(titles, values, strict=False)
        if _text_of(value)
    ]
    if criteria:
        heading = (
            _text_of(soup.select_one('[data-test="alignment-list-header"]')) or "Aday Kriterleri"
        )
        text = "\n".join([text, "", heading, *criteria])
    return ExtractedPosting(
        title=_text_of(soup.select_one('[data-test="job-title"]')),
        company=_text_of(soup.select_one('[data-test="company-name"]')),
        text=text,
    )


def _from_main_text(soup: BeautifulSoup) -> ExtractedPosting | None:
    """Any other page: the main content without navigation and forms. A single <h1> is usually the job title; no
    company is guessed. The preview text is not used here: on an unknown site it is a teaser ("...") rather than
    the posting, and a page that renders in the browser only should end in "paste the text" instead."""
    headings = soup.find_all("h1")
    title = _text_of(headings[0]) if len(headings) == 1 else None
    for noise in soup.find_all(_NOISE_TAGS):
        noise.decompose()
    main = (
        soup.find("main") or soup.find("article") or soup.find(attrs={"role": "main"}) or soup.body
    )
    return ExtractedPosting(title=title, company=None, text=html_to_text(main) if main else "")


def _meta(soup: BeautifulSoup, key: str) -> str | None:
    tag = soup.find("meta", attrs={"property": key}) or soup.find("meta", attrs={"name": key})
    content = tag.get("content") if tag else None
    return content if isinstance(content, str) else None


def _text_of(node: Tag | None) -> str | None:
    return _clean(node.get_text(" ")) if node else None


def _clean(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = " ".join(html.unescape(value).split())
    return cleaned or None


def _collapse_blank_lines(lines: Iterator[str]) -> Iterator[str]:
    blank = False
    for line in lines:
        if line:
            blank = False
            yield line
        elif not blank:
            blank = True
            yield ""

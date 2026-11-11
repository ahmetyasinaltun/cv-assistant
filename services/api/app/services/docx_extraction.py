# Extracts plain text and link targets from uploaded Word (.docx) resumes. A .docx file is a zip of XML parts, so
# the standard library reads it: paragraphs in document order (tables included), list items as "- " lines, and
# hyperlink targets from the relationships part. The upload is untrusted: the unpacked size is capped (zip bombs),
# and the standard XML parser does not fetch external entities.

import io
import zipfile
from xml.etree import ElementTree

from app.core.errors import ValidationFailedError
from app.services.document_links import hidden_links, with_links_block

# A real CV's main document part is well under a megabyte; anything far larger is not a CV.
MAX_DOCUMENT_PART_BYTES = 10 * 1024 * 1024

_W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
_R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
_RELS = "{http://schemas.openxmlformats.org/package/2006/relationships}"
_DOCUMENT = "word/document.xml"
_DOCUMENT_RELS = "word/_rels/document.xml.rels"
_STYLES = "word/styles.xml"


def is_docx(file_bytes: bytes) -> bool:
    """A zip archive with Word's main document part; old binary .doc files and other zips are not."""
    if not file_bytes.startswith(b"PK\x03\x04"):
        return False
    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as archive:
            return _DOCUMENT in archive.namelist()
    except zipfile.BadZipFile:
        return False


def extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as archive:
            body = ElementTree.fromstring(_read_capped(archive, _DOCUMENT)).find(f"{_W}body")  # nosec B314: _read_capped refuses DTDs
            targets = _link_targets(archive)
            list_styles = _list_styles(archive)
    except (zipfile.BadZipFile, KeyError, ElementTree.ParseError) as exc:
        raise ValidationFailedError(
            "The uploaded file is not a readable Word document.", code="docx_invalid"
        ) from exc
    paragraphs = body.iter(f"{_W}p") if body is not None else iter(())
    lines: list[str] = []
    uris: list[str] = []
    for paragraph in paragraphs:
        lines.append(_paragraph_text(paragraph, list_styles))
        uris.extend(targets[rid] for rid in _hyperlink_ids(paragraph) if rid in targets)
    text = "\n".join(lines)
    if not text.strip():
        raise ValidationFailedError(
            "No text could be found in this Word document; paste the text instead.",
            code="docx_no_text",
        )
    return with_links_block(text, hidden_links(uris, text))


def _read_capped(archive: zipfile.ZipFile, name: str) -> bytes:
    """Reads one part, refusing it when it unpacks larger than a CV ever is (the declared size can lie)."""
    if archive.getinfo(name).file_size > MAX_DOCUMENT_PART_BYTES:
        raise ValidationFailedError("This Word document is too large to read.", code="docx_invalid")
    with archive.open(name) as part:
        content = part.read(MAX_DOCUMENT_PART_BYTES + 1)
    if len(content) > MAX_DOCUMENT_PART_BYTES:
        raise ValidationFailedError("This Word document is too large to read.", code="docx_invalid")
    # Word never writes a DTD into its parts. One that declares it can only be there to define entities, which
    # is how "billion laughs" files blow up in the parser, so it is refused before parsing.
    if b"<!DOCTYPE" in content:
        raise ValidationFailedError(
            "The uploaded file is not a readable Word document.", code="docx_invalid"
        )
    return content


def _paragraph_text(paragraph: ElementTree.Element, list_styles: set[str]) -> str:
    pieces: list[str] = []
    for node in paragraph.iter():
        if node.tag == f"{_W}t" and node.text:
            pieces.append(node.text)
        elif node.tag == f"{_W}tab":
            pieces.append(" ")
        elif node.tag in (f"{_W}br", f"{_W}cr"):
            pieces.append("\n")
    text = "".join(pieces)
    # The list marker is not in the text: a list item carries numbering properties itself or gets them from its
    # style ("List Bullet"); numbering id 0 switches a style's numbering off.
    numbering = paragraph.find(f"{_W}pPr/{_W}numPr")
    style = paragraph.find(f"{_W}pPr/{_W}pStyle")
    if numbering is not None:
        number_id = numbering.find(f"{_W}numId")
        is_list_item = number_id is None or number_id.get(f"{_W}val") != "0"
    else:
        is_list_item = style is not None and style.get(f"{_W}val") in list_styles
    return f"- {text}" if is_list_item and text.strip() else text


def _list_styles(archive: zipfile.ZipFile) -> set[str]:
    """Ids of paragraph styles that number or bullet their paragraphs, also through the styles they are based on."""
    if _STYLES not in archive.namelist():
        return set()
    numbered: set[str] = set()
    based_on: dict[str, str] = {}
    for style in ElementTree.fromstring(_read_capped(archive, _STYLES)).iter(f"{_W}style"):  # nosec B314: _read_capped refuses DTDs
        style_id = style.get(f"{_W}styleId", "")
        if style.find(f"{_W}pPr/{_W}numPr") is not None:
            numbered.add(style_id)
        parent = style.find(f"{_W}basedOn")
        if parent is not None:
            based_on[style_id] = parent.get(f"{_W}val", "")

    def numbers(style_id: str) -> bool:
        seen: set[str] = set()
        while style_id and style_id not in seen:  # a malformed file can loop its styles
            if style_id in numbered:
                return True
            seen.add(style_id)
            style_id = based_on.get(style_id, "")
        return False

    return {style_id for style_id in {*numbered, *based_on} if numbers(style_id)}


def _hyperlink_ids(paragraph: ElementTree.Element) -> list[str]:
    return [rid for link in paragraph.iter(f"{_W}hyperlink") if (rid := link.get(f"{_R}id"))]


def _link_targets(archive: zipfile.ZipFile) -> dict[str, str]:
    """Relationship id → address for the document's external hyperlinks."""
    if _DOCUMENT_RELS not in archive.namelist():
        return {}
    relationships = ElementTree.fromstring(_read_capped(archive, _DOCUMENT_RELS))  # nosec B314: _read_capped refuses DTDs
    return {
        rel.get("Id", ""): rel.get("Target", "")
        for rel in relationships.iter(f"{_RELS}Relationship")
        if rel.get("TargetMode") == "External" and rel.get("Type", "").endswith("/hyperlink")
    }

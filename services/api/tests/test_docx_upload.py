# Tests for Word (.docx) CV uploads: text from paragraphs, list items and tables, hidden hyperlink targets, and the
# refusals for files that are not Word documents, are broken, empty or unpack too large. The .docx files are built
# here with zipfile, so no real Word file or extra package is needed.

import io
import zipfile

import pytest

from app.core.errors import AppError
from app.services import docx_extraction
from app.services.docx_extraction import extract_text_from_docx, is_docx

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
HYPERLINK = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"


def run(text: str) -> str:
    return f"<w:r><w:t xml:space='preserve'>{text}</w:t></w:r>"


def paragraph(*parts: str, list_item: bool = False) -> str:
    numbering = (
        "<w:pPr><w:numPr><w:ilvl w:val='0'/><w:numId w:val='1'/></w:numPr></w:pPr>"
        if list_item
        else ""
    )
    return f"<w:p>{numbering}{''.join(parts)}</w:p>"


def docx(
    body: str,
    links: dict[str, str] | None = None,
    *,
    document: str | None = None,
    styles: str | None = None,
) -> bytes:
    xml = (
        document or f"<w:document xmlns:w='{W}' xmlns:r='{R}'><w:body>{body}</w:body></w:document>"
    )
    rels = "".join(
        f"<Relationship Id='{rid}' Type='{HYPERLINK}' Target='{target}' TargetMode='External'/>"
        for rid, target in (links or {}).items()
    )
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("[Content_Types].xml", "<Types/>")
        archive.writestr("word/document.xml", xml)
        if styles is not None:
            archive.writestr("word/styles.xml", f"<w:styles xmlns:w='{W}'>{styles}</w:styles>")
        archive.writestr(
            "word/_rels/document.xml.rels",
            f"<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>{rels}</Relationships>",
        )
    return buffer.getvalue()


CV_BODY = (
    paragraph(run("Jane Doe"))
    + paragraph(run("Experience"))
    + paragraph(
        run("Backend intern at Acme:"),
        "<w:r><w:tab/></w:r>",
        run("built REST APIs with FastAPI"),
        list_item=True,
    )
    + paragraph(
        run("Wrote pytest tests"),
        "<w:r><w:br/></w:r>",
        run("for the order service"),
        list_item=True,
    )
    + "<w:tbl><w:tr><w:tc>"
    + paragraph(run("Skills"))
    + "</w:tc><w:tc>"
    + paragraph(run("Python, SQL"))
    + "</w:tc></w:tr></w:tbl>"
    + paragraph("<w:hyperlink r:id='rId5'>" + run("Inventory Tracker") + "</w:hyperlink>")
    + paragraph("<w:hyperlink r:id='rId6'>" + run("github.com/jane") + "</w:hyperlink>")
    + paragraph("<w:hyperlink r:id='rId7'>" + run("Email") + "</w:hyperlink>")
)
CV_LINKS = {
    "rId5": "https://github.com/jane/inventory-tracker",
    "rId6": "https://github.com/jane",
    "rId7": "mailto:jane@example.com",
}


def error_code(call) -> str:
    with pytest.raises(AppError) as caught:
        call()
    return caught.value.code


def test_text_keeps_paragraphs_list_items_table_cells_and_breaks():
    text = extract_text_from_docx(docx(CV_BODY, CV_LINKS))
    assert text.splitlines()[:7] == [
        "Jane Doe",
        "Experience",
        "- Backend intern at Acme: built REST APIs with FastAPI",
        "- Wrote pytest tests",
        "for the order service",
        "Skills",
        "Python, SQL",
    ]


def test_links_behind_text_are_added_but_shown_and_non_web_ones_are_not():
    text = extract_text_from_docx(docx(CV_BODY, CV_LINKS))
    assert text.endswith("Links\n- https://github.com/jane/inventory-tracker")


def test_only_zips_with_a_word_document_count_as_docx():
    assert is_docx(docx(paragraph(run("CV"))))
    assert not is_docx(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1 old binary .doc")
    other_zip = io.BytesIO()
    with zipfile.ZipFile(other_zip, "w") as archive:
        archive.writestr("notes.txt", "hello")
    assert not is_docx(other_zip.getvalue())


def test_broken_empty_and_oversized_documents_are_refused(monkeypatch):
    assert (
        error_code(lambda: extract_text_from_docx(docx("", document="<w:document")))
        == "docx_invalid"
    )
    assert error_code(lambda: extract_text_from_docx(docx(paragraph(run("  "))))) == "docx_no_text"
    monkeypatch.setattr(docx_extraction, "MAX_DOCUMENT_PART_BYTES", 100)
    too_big = docx(paragraph(run("x" * 500)))
    assert error_code(lambda: extract_text_from_docx(too_big)) == "docx_invalid"


def test_uploading_a_docx_saves_its_text(client, auth_headers):
    response = client.post(
        "/resumes/upload",
        data={"title": "Word CV"},
        files={"file": ("cv.docx", docx(CV_BODY, CV_LINKS), "application/octet-stream")},
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["source_type"] == "docx"
    assert body["original_filename"] == "cv.docx"
    assert "- Backend intern at Acme: built REST APIs with FastAPI" in body["raw_text"]
    assert "https://github.com/jane/inventory-tracker" in body["raw_text"]


def test_an_old_doc_file_is_refused_with_a_way_forward(client, auth_headers):
    response = client.post(
        "/resumes/upload",
        data={"title": "Old CV"},
        files={
            "file": (
                "cv.doc",
                b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"0" * 200,
                "application/msword",
            )
        },
        headers=auth_headers,
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "unsupported_file_type"
    assert ".docx" in response.json()["error"]["message"]


def test_list_items_numbered_by_their_style_count_too():
    styles = (
        "<w:style w:styleId='ListBullet'><w:pPr><w:numPr><w:numId w:val='3'/></w:numPr></w:pPr></w:style>"
        "<w:style w:styleId='ProjectBullet'><w:basedOn w:val='ListBullet'/></w:style>"
    )

    def styled(text: str, style: str, numbering: str = "") -> str:
        return f"<w:p><w:pPr><w:pStyle w:val='{style}'/>{numbering}</w:pPr>{run(text)}</w:p>"

    body = (
        styled("SQL reports", "ListBullet")
        + styled("Inventory Tracker", "ProjectBullet")
        + styled("Not a list item", "ListBullet", "<w:numPr><w:numId w:val='0'/></w:numPr>")
        + styled("Plain paragraph", "Normal")
    )
    text = extract_text_from_docx(docx(body, styles=styles))
    assert text.splitlines() == [
        "- SQL reports",
        "- Inventory Tracker",
        "Not a list item",
        "Plain paragraph",
    ]

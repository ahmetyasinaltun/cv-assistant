# Integration tests for resume/job-description creation, PDF upload, listing and per-user isolation.

from tests.conftest import SAMPLE_JOB, SAMPLE_RESUME, register_user


def minimal_pdf(lines: list[str]) -> bytes:
    """Build a tiny single-page PDF with Helvetica text so pypdf can extract it."""
    content_lines = ["BT", "/F1 12 Tf", "50 750 Td", "14 TL"]
    for line in lines:
        escaped = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        content_lines.append(f"({escaped}) Tj T*")
    content_lines.append("ET")
    stream = "\n".join(content_lines).encode("latin-1")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        b"/Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = []
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{index} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref_pos = len(out)
    out += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    for offset in offsets:
        out += f"{offset:010d} 00000 n \n".encode()
    trailer = f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n"
    out += trailer.encode()
    return bytes(out)


def test_create_resume_from_text_normalizes(client, auth_headers):
    response = client.post(
        "/resumes", json={"title": "My CV", "text": SAMPLE_RESUME}, headers=auth_headers
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["source_type"] == "text"
    assert body["raw_text"].startswith("Jane Doe")
    assert body["character_count"] == len(body["raw_text"])


def test_create_resume_rejects_short_text(client, auth_headers):
    response = client.post(
        "/resumes", json={"title": "x", "text": "too short"}, headers=auth_headers
    )
    assert response.status_code == 422


def test_upload_pdf_resume_extracts_text(client, auth_headers):
    pdf = minimal_pdf(
        [
            "Jane Doe - Software Engineer",
            "Built REST APIs with Python and FastAPI at Acme Corp.",
            "Skills: Python, SQL, Docker, Git, PostgreSQL, testing.",
        ]
    )
    response = client.post(
        "/resumes/upload",
        data={"title": "PDF CV"},
        files={"file": ("cv.pdf", pdf, "application/pdf")},
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["source_type"] == "pdf"
    assert body["original_filename"] == "cv.pdf"
    assert "FastAPI" in body["raw_text"]


def test_upload_rejects_non_pdf(client, auth_headers):
    response = client.post(
        "/resumes/upload",
        data={"title": "Not PDF"},
        files={"file": ("cv.txt", b"plain text file content that is long enough", "text/plain")},
        headers=auth_headers,
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "unsupported_file_type"


def test_resume_list_and_isolation(client):
    jane = register_user(client, "jane@example.com")
    bob = register_user(client, "bob@example.com")
    created = client.post(
        "/resumes", json={"title": "Jane CV", "text": SAMPLE_RESUME}, headers=jane
    )
    resume_id = created.json()["id"]

    assert len(client.get("/resumes", headers=jane).json()) == 1
    assert client.get("/resumes", headers=bob).json() == []
    assert client.get(f"/resumes/{resume_id}", headers=bob).status_code == 404
    assert client.delete(f"/resumes/{resume_id}", headers=bob).status_code == 404
    assert client.delete(f"/resumes/{resume_id}", headers=jane).status_code == 204
    assert client.get("/resumes", headers=jane).json() == []


def test_job_description_crud(client, auth_headers):
    response = client.post(
        "/job-descriptions",
        json={"title": "Junior Backend Developer", "company": "Acme", "text": SAMPLE_JOB},
        headers=auth_headers,
    )
    assert response.status_code == 201, response.text
    job_id = response.json()["id"]
    listed = client.get("/job-descriptions", headers=auth_headers).json()
    assert [j["id"] for j in listed] == [job_id]
    assert listed[0]["company"] == "Acme"
    assert client.delete(f"/job-descriptions/{job_id}", headers=auth_headers).status_code == 204

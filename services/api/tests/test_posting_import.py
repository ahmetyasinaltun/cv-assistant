# Tests for filling a job description from a link: URL checks and the SSRF guard, the guarded fetch (redirects,
# refusals, limits) against a scripted transport, extraction from synthetic pages shaped like each site, and the
# endpoint. No test touches the network.

import json

import httpx
import pytest

from app.api.routes.job_descriptions import get_posting_import_service
from app.core.errors import AppError
from app.services.posting_import import fetch as fetch_module
from app.services.posting_import.extract import extract_posting
from app.services.posting_import.fetch import FetchedPage, fetch_page
from app.services.posting_import.service import PostingImportService
from app.services.posting_import.urls import canonical_link, ensure_public_host, parse_link

DESCRIPTION = (
    "We are looking for a backend intern who enjoys building APIs. "
    "You will write Python services and their tests with the team."
)


def error_code(call) -> str:
    with pytest.raises(AppError) as caught:
        call()
    return caught.value.code


def public_resolver(host: str, port: int) -> list[str]:
    return {"internal.example": ["10.0.0.5"]}.get(host, ["93.184.216.34"])


# --- links -------------------------------------------------------------------------------------------------------


def test_parse_link_adds_the_scheme_people_leave_out():
    assert parse_link("  kariyer.net/is-ilani/x-123 ") == "https://kariyer.net/is-ilani/x-123"


@pytest.mark.parametrize(
    "raw",
    ["", "ftp://example.com/job", "javascript:alert(1)", "file:/etc/passwd", "http://user:secret@example.com/job",
     "http://exa mple.com", "http://example.com:99999/", "https://" + "a" * 2001],
)  # fmt: skip
def test_parse_link_rejects_what_is_not_a_public_web_address(raw):
    assert error_code(lambda: parse_link(raw)) == "link_invalid"


@pytest.mark.parametrize(
    "url",
    [
        "https://tr.linkedin.com/jobs/view/software-intern-at-acme-4475250238",
        "https://www.linkedin.com/jobs/view/4475250238",
        "https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4475250238",
        "https://linkedin.com/jobs/search/?keywords=intern&currentJobId=4475250238",
    ],
)
def test_every_linkedin_job_link_shape_becomes_the_public_job_page(url):
    assert canonical_link(url) == "https://www.linkedin.com/jobs/view/4475250238/"


def test_other_links_are_fetched_as_given():
    post = "https://www.linkedin.com/posts/acme_staj-activity-7521127791510253568-Ww0b"
    assert canonical_link(post) == post
    assert (
        canonical_link("https://www.youthall.com/tr/acme/intern_12/")
        == "https://www.youthall.com/tr/acme/intern_12/"
    )


@pytest.mark.parametrize(
    "addresses",
    [["127.0.0.1"], ["10.0.0.5"], ["192.168.1.10"], ["169.254.169.254"], ["::1"], ["::ffff:127.0.0.1"],
     ["fd00::1"], ["93.184.216.34", "10.0.0.5"], []],
)  # fmt: skip
def test_private_and_internal_addresses_are_refused(addresses):
    def resolver(host, port):
        return addresses

    assert (
        error_code(lambda: ensure_public_host("https://jobs.example/x", resolver))
        == "link_not_allowed"
    )


def test_public_address_passes_and_an_unknown_host_is_unreachable():
    ensure_public_host(
        "https://jobs.example/x", lambda host, port: ["93.184.216.34", "2606:2800:220:1::"]
    )

    def unknown(host, port):
        raise OSError("name not known")

    assert (
        error_code(lambda: ensure_public_host("https://nowhere.example/x", unknown))
        == "link_unreachable"
    )


# --- fetch -------------------------------------------------------------------------------------------------------


def scripted(routes: dict[str, httpx.Response | Exception]) -> httpx.MockTransport:
    def handler(request: httpx.Request) -> httpx.Response:
        answer = routes[str(request.url)]
        if isinstance(answer, Exception):
            raise answer
        return answer

    return httpx.MockTransport(handler)


def fetch(url: str, routes: dict) -> FetchedPage:
    return fetch_page(url, resolve=public_resolver, transport=scripted(routes))


HTML = {"content-type": "text/html; charset=utf-8"}


def test_fetch_follows_redirects_and_returns_the_final_page():
    page = fetch(
        "https://lnkd.in/p/abc",
        {
            "https://lnkd.in/p/abc": httpx.Response(
                301, headers={"location": "https://www.linkedin.com/posts/x"}
            ),
            "https://www.linkedin.com/posts/x": httpx.Response(
                200, headers=HTML, content=b"<p>post</p>"
            ),
        },
    )
    assert page.url == "https://www.linkedin.com/posts/x"
    assert page.content == b"<p>post</p>"
    assert page.encoding == "utf-8"


def test_fetch_rechecks_every_redirect_hop():
    to_internal = {
        "https://jobs.example/x": httpx.Response(
            302, headers={"location": "http://internal.example/admin"}
        )
    }
    assert error_code(lambda: fetch("https://jobs.example/x", to_internal)) == "link_not_allowed"
    to_file = {
        "https://jobs.example/x": httpx.Response(302, headers={"location": "file:///etc/passwd"})
    }
    assert error_code(lambda: fetch("https://jobs.example/x", to_file)) == "link_invalid"


@pytest.mark.parametrize(
    ("answer", "code"),
    [
        (
            httpx.Response(403, headers=HTML, content=b"Access to this page has been denied"),
            "link_blocked",
        ),
        (httpx.Response(999, content=b""), "link_blocked"),
        (httpx.Response(429, content=b""), "link_blocked"),
        (httpx.Response(404, headers=HTML, content=b"gone"), "link_not_found"),
        (httpx.Response(500, content=b""), "link_unreachable"),
        (
            httpx.Response(200, headers={"content-type": "application/pdf"}, content=b"%PDF"),
            "link_no_posting",
        ),
        (httpx.ConnectTimeout("slow"), "link_unreachable"),
        (httpx.ConnectError("refused"), "link_unreachable"),
    ],
)
def test_fetch_maps_each_failure_to_a_stable_code(answer, code):
    assert (
        error_code(lambda: fetch("https://jobs.example/x", {"https://jobs.example/x": answer}))
        == code
    )


def test_a_login_wall_counts_as_refused():
    routes = {
        "https://www.linkedin.com/jobs/view/1/": httpx.Response(
            302, headers={"location": "https://www.linkedin.com/authwall?x=1"}
        ),
        "https://www.linkedin.com/authwall?x=1": httpx.Response(
            200, headers=HTML, content=b"<p>Sign in</p>"
        ),
    }
    assert (
        error_code(lambda: fetch("https://www.linkedin.com/jobs/view/1/", routes)) == "link_blocked"
    )


def test_fetch_stops_a_redirect_loop_and_an_oversized_page(monkeypatch):
    loop = {
        "https://jobs.example/a": httpx.Response(
            302, headers={"location": "https://jobs.example/a"}
        )
    }
    assert error_code(lambda: fetch("https://jobs.example/a", loop)) == "link_unreachable"

    monkeypatch.setattr(fetch_module, "MAX_PAGE_BYTES", 100)
    big = {"https://jobs.example/big": httpx.Response(200, headers=HTML, content=b"x" * 101)}
    assert error_code(lambda: fetch("https://jobs.example/big", big)) == "link_no_posting"


# --- extraction --------------------------------------------------------------------------------------------------


def page(head: str = "", body: str = "") -> bytes:
    return f"<html><head>{head}</head><body>{body}</body></html>".encode()


def test_job_posting_data_gives_title_company_and_structured_text():
    data = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "BreadcrumbList", "itemListElement": []},
            {
                "@type": "JobPosting",
                "title": "Backend Intern",
                "hiringOrganization": {"@type": "Organization", "name": "Acme &amp; Co"},
                "description": f"<p>{DESCRIPTION}</p><ul><li>Python</li><li>SQL</li></ul>",
            },
        ],
    }
    html = page(
        f'<script type="application/ld+json">{json.dumps(data)}</script>', "<nav>Menu</nav>"
    )
    posting = extract_posting(html, "https://www.youthall.com/tr/acme/backend-intern_1/")
    assert posting.title == "Backend Intern"
    assert posting.company == "Acme & Co"
    assert posting.text == f"{DESCRIPTION}\n\n- Python\n- SQL"


def test_list_items_stay_on_consecutive_lines_even_with_paragraphs_inside():
    data = {
        "@type": "JobPosting",
        "title": "Intern",
        "description": f"<p>{DESCRIPTION}</p><ul><li><p>Python</p></li><li><div>SQL</div></li></ul><p>Remote</p>",
    }
    html = page(f'<script type="application/ld+json">{json.dumps(data)}</script>')
    posting = extract_posting(html, "https://www.secretcv.com/acme/intern-1")
    assert posting.text == f"{DESCRIPTION}\n\n- Python\n- SQL\n\nRemote"


def test_job_posting_data_with_escaped_html_is_unescaped_once():
    data = {
        "@type": "JobPosting",
        "title": "Intern",
        "description": f"&lt;p&gt;{DESCRIPTION}&lt;br /&gt;Remote&lt;/p&gt;",
    }
    html = page(f'<script type="application/ld+json">{json.dumps(data)}</script>')
    assert (
        extract_posting(html, "https://www.eleman.net/is-ilani/x").text == f"{DESCRIPTION}\nRemote"
    )


def test_linkedin_job_page_layout():
    body = (
        '<h2 class="top-card-layout__title topcard__title">Software Engineering Intern</h2>'
        '<a class="topcard__org-name-link" href="#"> Analog Devices </a>'
        f'<div class="show-more-less-html__markup">{DESCRIPTION}<br><br><strong>Requirements</strong>'
        "<ul><li>C++</li></ul></div>"
    )
    posting = extract_posting(page(body=body), "https://www.linkedin.com/jobs/view/4475250238/")
    assert (posting.title, posting.company) == ("Software Engineering Intern", "Analog Devices")
    assert posting.text == f"{DESCRIPTION}\n\nRequirements\n\n- C++"


def test_linkedin_post_uses_its_full_preview_text_and_author():
    text = f"🚀 Stajyer arıyoruz\n\n{DESCRIPTION}\n• React"
    head = (
        '<meta property="og:title" content="#staj #yazılım | SafeSpeech Yazılım">'
        f'<meta property="og:description" content="{text}">'
    )
    posting = extract_posting(
        page(head), "https://www.linkedin.com/posts/safespeech_staj-activity-1-x"
    )
    assert posting.title is None
    assert posting.company == "SafeSpeech Yazılım"
    assert posting.text == text


def test_kariyer_net_layout_appends_the_candidate_criteria():
    body = (
        '<div data-test="job-title" class="job-title"> Kimya Mühendisi </div>'
        '<a data-test="company-name"> BEYKÖYÜ GIDA A.Ş. </a>'
        f'<div data-test="qualifications-and-job-description"><p>{DESCRIPTION}</p></div>'
        '<h2 data-test="alignment-list-header">Aday Kriterleri</h2>'
        '<div data-test="alignment-list-title"><span>•</span> Tecrübe</div>'
        '<div data-test="alignment-list-value"> En çok 5 yıl tecrübeli </div>'
        '<div data-test="alignment-list-title"><span>•</span> Eğitim Seviyesi</div>'
        '<div data-test="alignment-list-value"> Üniversite(Mezun) </div>'
    )
    posting = extract_posting(
        page(body=body), "https://www.kariyer.net/is-ilani/beykoyu-kimya-muhendisi-4586269"
    )
    assert (posting.title, posting.company) == ("Kimya Mühendisi", "BEYKÖYÜ GIDA A.Ş.")
    assert posting.text == (
        f"{DESCRIPTION}\n\nAday Kriterleri\n- Tecrübe: En çok 5 yıl tecrübeli\n- Eğitim Seviyesi: Üniversite(Mezun)"
    )


def test_any_other_page_falls_back_to_its_main_text_without_navigation_or_forms():
    body = (
        "<nav><a>Jobs</a><a>About</a></nav>"
        "<main><h1>Data Analyst Intern</h1>"
        f"<div class='job__description'><p>{DESCRIPTION}</p></div>"
        "<form><label>First name</label><input></form></main>"
        "<footer>© Acme</footer>"
    )
    posting = extract_posting(page(body=body), "https://job-boards.greenhouse.io/acme/jobs/1")
    assert posting.title == "Data Analyst Intern"
    assert posting.company is None
    assert posting.text == f"Data Analyst Intern\n\n{DESCRIPTION}"


def test_a_page_without_posting_text_gives_nothing():
    html = page('<meta property="og:description" content="Apply now">', "<div id='app'></div>")
    assert extract_posting(html, "https://apply.workable.com/j/ABC") is None


def test_the_declared_encoding_is_respected():
    html = (
        page(body=f"<main><p>Yazılım stajyeri arıyoruz. {DESCRIPTION}</p></main>")
        .decode()
        .encode("cp1254")
    )
    posting = extract_posting(html, "https://www.example.com.tr/ilan/1", encoding="cp1254")
    assert posting.text.startswith("Yazılım stajyeri")


# --- service and endpoint ----------------------------------------------------------------------------------------


def fake_fetch(pages: dict[str, bytes]):
    def fetch_fake(url: str) -> FetchedPage:
        return FetchedPage(url, pages[url], "utf-8")

    return fetch_fake


def test_service_fetches_the_canonical_link_and_normalizes_the_text():
    body = (
        '<h1 class="top-card-layout__title">Intern</h1>'
        f'<div class="show-more-less-html__markup"><p>{DESCRIPTION}</p><p>•  Python</p></div>'
    )
    service = PostingImportService(
        fake_fetch({"https://www.linkedin.com/jobs/view/4475250238/": page(body=body)})
    )
    draft = service.draft_from_link(
        "linkedin.com/jobs/collections/recommended/?currentJobId=4475250238"
    )
    assert draft.title == "Intern"
    assert draft.text == f"{DESCRIPTION}\n\n- Python"


def test_service_reports_a_page_without_a_posting():
    service = PostingImportService(fake_fetch({"https://example.com/": page(body="<p>Hello</p>")}))
    assert error_code(lambda: service.draft_from_link("https://example.com/")) == "link_no_posting"


def test_import_endpoint_needs_a_signed_in_user(client):
    response = client.post("/job-descriptions/import", json={"url": "https://example.com/job"})
    assert response.status_code == 401


def test_import_endpoint_returns_a_draft_and_saves_nothing(client, auth_headers):
    job_page = page(body=f"<main><h1>Backend Intern</h1><p>{DESCRIPTION}</p></main>")
    client.app.dependency_overrides[get_posting_import_service] = lambda: PostingImportService(
        fake_fetch({"https://jobs.example/backend-intern": job_page})
    )
    response = client.post(
        "/job-descriptions/import",
        json={"url": "https://jobs.example/backend-intern"},
        headers=auth_headers,
    )
    assert response.status_code == 200, response.text
    assert response.json() == {
        "title": "Backend Intern",
        "company": None,
        "text": f"Backend Intern\n\n{DESCRIPTION}",
        "source_url": "https://jobs.example/backend-intern",
    }
    assert client.get("/job-descriptions", headers=auth_headers).json() == []


def test_import_endpoint_answers_a_refusal_with_its_code(client, auth_headers):
    def refused(url: str) -> FetchedPage:
        return fetch_page(
            url, resolve=public_resolver, transport=scripted({url: httpx.Response(403)})
        )

    client.app.dependency_overrides[get_posting_import_service] = lambda: PostingImportService(
        refused
    )
    response = client.post(
        "/job-descriptions/import",
        json={"url": "https://www.kariyer.net/is-ilani/x-1"},
        headers=auth_headers,
    )
    assert response.status_code == 502
    assert response.json()["error"]["code"] == "link_blocked"

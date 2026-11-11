# Tests the Brevo email sender against a fake transport: the request it builds and how it reports failures.

import httpx
import pytest

from app.core.email import BREVO_SEND_URL, BrevoEmailSender, EmailMessage
from app.core.errors import EmailDeliveryError

MESSAGE = EmailMessage(
    to_address="deniz@example.com",
    to_name="Deniz Kurgu",
    subject="Your CV Assistant code: 123456",
    text="Your verification code: 123456",
    html="<p>123456</p>",
)


def sender_answering(handler) -> BrevoEmailSender:
    return BrevoEmailSender(
        "brevo-key",
        "codes@example.com",
        "CV Assistant",
        httpx.Client(transport=httpx.MockTransport(handler)),
    )


def test_the_request_names_the_sender_recipient_and_both_bodies():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["request"] = request
        return httpx.Response(201, json={"messageId": "<abc@smtp-relay>"})

    sender_answering(handler).send(MESSAGE)
    request = seen["request"]
    assert str(request.url) == BREVO_SEND_URL and request.headers["api-key"] == "brevo-key"
    body = request.read().decode()
    for expected in (
        '"codes@example.com"',
        '"CV Assistant"',
        '"deniz@example.com"',
        "textContent",
        "htmlContent",
    ):
        assert expected in body


@pytest.mark.parametrize("status", [400, 401, 500])
def test_a_refusal_becomes_an_email_error(status):
    with pytest.raises(EmailDeliveryError):
        sender_answering(
            lambda request: httpx.Response(status, json={"code": "unauthorized"})
        ).send(MESSAGE)


def test_an_unreachable_service_becomes_an_email_error():
    def handler(request):
        raise httpx.ConnectTimeout("timed out", request=request)

    with pytest.raises(EmailDeliveryError):
        sender_answering(handler).send(MESSAGE)

# Sends transactional email (verification codes): through Brevo's HTTP API in production, or only to the log in
# development and tests so no real mail leaves a developer's machine.

import logging
from dataclasses import dataclass
from functools import lru_cache
from typing import Protocol

import httpx

from app.core.config import Settings, get_settings
from app.core.errors import EmailDeliveryError

logger = logging.getLogger(__name__)

BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email"
SEND_TIMEOUT_SECONDS = 10.0


@dataclass(frozen=True)
class EmailMessage:
    to_address: str
    to_name: str
    subject: str
    text: str
    html: str


class EmailSender(Protocol):
    def send(self, message: EmailMessage) -> None:
        """Delivers the message or raises EmailDeliveryError."""


class BrevoEmailSender:
    def __init__(
        self,
        api_key: str,
        sender_address: str,
        sender_name: str,
        client: httpx.Client | None = None,
    ):
        self.api_key = api_key
        self.sender_address = sender_address
        self.sender_name = sender_name
        self.client = client or httpx.Client(timeout=SEND_TIMEOUT_SECONDS)

    def send(self, message: EmailMessage) -> None:
        payload = {
            "sender": {"email": self.sender_address, "name": self.sender_name},
            "to": [{"email": message.to_address, "name": message.to_name}],
            "subject": message.subject,
            "textContent": message.text,
            "htmlContent": message.html,
        }
        try:
            response = self.client.post(
                BREVO_SEND_URL,
                json=payload,
                headers={"api-key": self.api_key, "accept": "application/json"},
            )
        except httpx.HTTPError as exc:
            logger.warning("Brevo could not be reached: %s", type(exc).__name__)
            raise EmailDeliveryError("The email could not be sent. Try again in a minute.") from exc
        if response.status_code not in (201, 202):
            # The body names the problem (bad key, unverified sender); the recipient is not logged.
            logger.warning(
                "Brevo refused an email: %s %s", response.status_code, response.text[:300]
            )
            raise EmailDeliveryError("The email could not be sent. Try again in a minute.")


class LogEmailSender:
    """Development only: the configuration guard refuses this provider in production."""

    def send(self, message: EmailMessage) -> None:
        logger.info(
            "Email (not sent) to %s: %s\n%s", message.to_address, message.subject, message.text
        )


def build_email_sender(settings: Settings) -> EmailSender:
    if settings.email_provider == "brevo":
        return BrevoEmailSender(
            settings.brevo_api_key, settings.email_sender_address, settings.email_sender_name
        )
    return LogEmailSender()


@lru_cache
def get_email_sender() -> EmailSender:
    return build_email_sender(get_settings())

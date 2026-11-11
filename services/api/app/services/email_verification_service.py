# Email verification: sends a six-digit code to the account's address and confirms it. Codes are stored only as
# keyed hashes, expire after fifteen minutes and allow five wrong guesses.

import hashlib
import hmac
import secrets
from datetime import timedelta
from html import escape

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.email import EmailMessage, EmailSender
from app.core.errors import ConflictError, TooManyRequestsError, ValidationFailedError
from app.db.base import utc_now
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.usage_service import UsageKind, UsageService, as_utc

CODE_LIFETIME = timedelta(minutes=15)
MAX_WRONG_GUESSES = 5


def new_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def code_hash(user: User, code: str) -> str:
    """Keyed with the server secret and bound to the account, so a leaked table row cannot be checked offline
    against the million possible codes."""
    message = f"{user.id}:{code}".encode()
    return hmac.new(get_settings().jwt_secret_key.encode(), message, hashlib.sha256).hexdigest()


class EmailVerificationService:
    def __init__(self, db: Session, sender: EmailSender):
        self.users = UserRepository(db)
        self.usage = UsageService(db)
        self.sender = sender

    def send_code(self, user: User, address_key: str | None, *, check_limits: bool = True) -> None:
        """Replaces any earlier code with a new one and emails it. Raises EmailDeliveryError when the email
        service fails; the code is kept, so asking again after a minute works."""
        if user.email_verified:
            raise ConflictError("This email address is already verified.", code="already_verified")
        if check_limits:
            self.usage.check_verification_email(user.id, address_key)
        code = new_code()
        user.verification_code_hash = code_hash(user, code)
        user.verification_code_expires_at = utc_now() + CODE_LIFETIME
        user.verification_attempts = 0
        self.users.save(user)
        self.usage.record(UsageKind.VERIFICATION_EMAIL, user.id, address_key)
        self.sender.send(verification_message(user, code))

    def confirm(self, user: User, code: str) -> User:
        if user.email_verified:
            return user
        if user.verification_code_hash is None or user.verification_code_expires_at is None:
            raise ValidationFailedError(
                "There is no code to confirm; ask for a new one.", code="code_expired"
            )
        if as_utc(user.verification_code_expires_at) < utc_now():
            raise ValidationFailedError(
                "The code has expired; ask for a new one.", code="code_expired"
            )
        if user.verification_attempts >= MAX_WRONG_GUESSES:
            raise TooManyRequestsError(
                "Too many wrong codes; ask for a new one.",
                retry_after_seconds=1,
                code="too_many_attempts",
            )
        if not hmac.compare_digest(code_hash(user, code), user.verification_code_hash):
            user.verification_attempts += 1
            self.users.save(user)
            raise ValidationFailedError("The code is not correct.", code="code_invalid")
        user.email_verified_at = utc_now()
        user.verification_code_hash = None
        user.verification_code_expires_at = None
        user.verification_attempts = 0
        return self.users.save(user)


_COPY = {
    "en": {
        "subject": "Your CV Assistant code: {code}",
        "greeting": "Hi {name},",
        "intro": "Your verification code:",
        "lifetime": "It works for 15 minutes.",
        "use": "Enter it on the CV Assistant verification screen to start analyses and AI-written CVs.",
        "ignore": "If you did not create an account, you can ignore this email.",
    },
    "tr": {
        "subject": "CV Assistant doğrulama kodun: {code}",
        "greeting": "Merhaba {name},",
        "intro": "Doğrulama kodun:",
        "lifetime": "Kod 15 dakika geçerli.",
        "use": "Analiz başlatmak ve yapay zekâya CV yazdırmak için kodu CV Assistant'taki doğrulama ekranına gir.",
        "ignore": "Bu hesabı sen açmadıysan bu e-postayı yok sayabilirsin.",
    },
}


def verification_message(user: User, code: str) -> EmailMessage:
    copy = _COPY.get(user.preferred_language, _COPY["en"])
    greeting = copy["greeting"].format(name=user.full_name)
    paragraphs = [
        greeting,
        f"{copy['intro']} {code}",
        copy["lifetime"],
        copy["use"],
        copy["ignore"],
    ]
    text = "\n\n".join(paragraphs)
    html = (
        '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#102321">'
        f"<p>{escape(greeting)}</p>"
        f"<p>{escape(copy['intro'])}</p>"
        f'<p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:8px 0 16px">{code}</p>'
        f"<p>{escape(copy['lifetime'])} {escape(copy['use'])}</p>"
        f'<p style="color:#586c68;font-size:13px">{escape(copy["ignore"])}</p>'
        "</div>"
    )
    return EmailMessage(
        to_address=user.email,
        to_name=user.full_name,
        subject=copy["subject"].format(code=code),
        text=text,
        html=html,
    )

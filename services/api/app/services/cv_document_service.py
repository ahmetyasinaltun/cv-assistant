# Use cases for CV documents: write one from scratch or from a saved CV, list, edit, delete and render it as a PDF.

from uuid import UUID

from sqlalchemy.orm import Session

from app.ai.language_guess import guess_language
from app.ai.providers.base import LLMClient
from app.core.errors import NotFoundError
from app.cv.content import CvContent
from app.cv.render import CvRenderer, RenderedCv
from app.cv.structuring import CvStructurer, StructuringResult
from app.models.cv_document import CvDocument
from app.models.user import User
from app.repositories.cv_document_repository import CvDocumentRepository
from app.schemas.common import Language
from app.schemas.cv import CvDocumentUpdateRequest
from app.services.document_service import ResumeService


class CvDocumentService:
    def __init__(self, db: Session):
        self.db = db
        self.documents = CvDocumentRepository(db)

    def create_blank(
        self, user: User, title: str, language: Language, template: str, content: CvContent | None
    ) -> CvDocument:
        content = content or CvContent.model_validate({"contact": {"name": user.full_name}})
        return self.documents.save(
            CvDocument(
                user_id=user.id,
                kind="maker",
                title=title.strip(),
                language=language,
                template=template,
                content=content.model_dump(mode="json"),
            )
        )

    def create_from_resume(
        self, user: User, resume_id: UUID, template: str, llm: LLMClient
    ) -> tuple[CvDocument, StructuringResult]:
        resume = ResumeService(self.db).get(resume_id, user.id)
        result = CvStructurer(llm).structure(resume.raw_text, fallback_name=user.full_name)
        # The CV keeps its own language; the account's language is only the fallback for an unclear text.
        language = guess_language(resume.raw_text) or user.preferred_language
        document = self.documents.save(
            CvDocument(
                user_id=user.id,
                kind="maker",
                resume_id=resume.id,
                title=resume.title,
                language=language,
                template=template,
                content=result.content.model_dump(mode="json"),
            )
        )
        return document, result

    def list_for_user(self, user_id: UUID) -> list[CvDocument]:
        return self.documents.list_for_user(user_id)

    def get(self, document_id: UUID, user_id: UUID) -> CvDocument:
        document = self.documents.get_for_user(document_id, user_id)
        if document is None:
            raise NotFoundError("CV not found.", code="cv_not_found")
        return document

    def update(
        self, document_id: UUID, user_id: UUID, changes: CvDocumentUpdateRequest
    ) -> CvDocument:
        document = self.get(document_id, user_id)
        sent = changes.model_fields_set
        if "title" in sent and changes.title is not None:
            document.title = changes.title.strip()
        if "language" in sent and changes.language is not None:
            document.language = changes.language
        if "template" in sent and changes.template is not None:
            document.template = changes.template
        if "content" in sent and changes.content is not None:
            document.content = changes.content.model_dump(mode="json")
        return self.documents.save(document)

    def delete(self, document_id: UUID, user_id: UUID) -> None:
        self.documents.delete(self.get(document_id, user_id))

    def render(
        self, document_id: UUID, user_id: UUID, renderer: CvRenderer
    ) -> tuple[CvDocument, RenderedCv]:
        document = self.get(document_id, user_id)
        content = CvContent.model_validate(document.content)
        return document, renderer.render(content, document.template, document.language)

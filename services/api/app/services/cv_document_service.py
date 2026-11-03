# Use cases for CV documents: write one from scratch or from a saved CV, list, edit, delete and render it as a PDF.

import re
from uuid import UUID

from sqlalchemy.orm import Session

from app.ai.language_guess import guess_language
from app.ai.providers.base import LLMClient
from app.core.errors import NotFoundError, ValidationFailedError
from app.cv.content import CvContent, CvLine
from app.cv.render import THUMBNAIL_PPI, CvRenderer, RenderedCv, RenderedPage
from app.cv.structuring import CvStructurer, StructuringResult
from app.cv.tailoring import CvTailorer, TailoringMode, TailoringRequest
from app.models.analysis import AnalysisStatus
from app.models.cv_document import CvDocument
from app.models.user import User
from app.repositories.analysis_repository import AnalysisRepository
from app.repositories.cv_document_repository import CvDocumentRepository
from app.schemas.analysis import AnalysisResult
from app.schemas.common import Language
from app.schemas.cv import CvDocumentUpdateRequest, TailoringQuestion
from app.services.document_service import ResumeService

# A saved CV is often named after its file ("Deniz_CV_2025.pdf"); the CV document keeps the name, not the extension.
_FILE_EXTENSION = re.compile(r"\.(pdf|docx?|txt)$", re.IGNORECASE)


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
                title=_FILE_EXTENSION.sub("", resume.title).strip() or resume.title,
                language=language,
                template=template,
                content=result.content.model_dump(mode="json"),
            )
        )
        return document, result

    def create_tailored(
        self, user: User, analysis_id: UUID, mode: TailoringMode, template: str, llm: LLMClient
    ) -> CvDocument:
        """A CV written for the posting of a completed analysis, in the posting's language. It starts from the
        user's latest CV Maker copy of the same saved CV (so their edits count), or structures the saved CV."""
        analysis = AnalysisRepository(self.db).get_for_user(analysis_id, user.id)
        if analysis is None:
            raise NotFoundError("Analysis not found.", code="analysis_not_found")
        if analysis.status != AnalysisStatus.COMPLETED or analysis.result is None:
            raise ValidationFailedError(
                "A CV can only be tailored to a completed analysis.", code="analysis_not_completed"
            )
        resume, job = analysis.resume, analysis.job_description
        edited = self.documents.latest_maker_for_resume(resume.id, user.id)
        if edited is not None:
            base, base_language = CvContent.model_validate(edited.content), edited.language
        else:
            base = CvStructurer(llm).structure(resume.raw_text, user.full_name).content
            base_language = guess_language(resume.raw_text) or user.preferred_language
        target_language = guess_language(job.raw_text) or analysis.output_language
        result = CvTailorer(llm).tailor(
            TailoringRequest(
                base=base,
                base_language=base_language,
                target_language=target_language,
                job_title=job.title,
                company=job.company,
                posting=job.raw_text,
                requirements=AnalysisResult.model_validate(analysis.result).requirements,
                mode=mode,
            )
        )
        title = f"{job.title} · {job.company}" if job.company else job.title
        return self.documents.save(
            CvDocument(
                user_id=user.id,
                kind="tailored",
                resume_id=resume.id,
                analysis_id=analysis.id,
                tailoring_mode=mode,
                title=title[:150],
                language=target_language,
                template=template,
                content=result.content.model_dump(mode="json"),
                questions=[
                    TailoringQuestion(
                        id=q.id,
                        question=q.question,
                        kind=q.kind,
                        entry_name=q.entry_name,
                        proposed_line=q.proposed_line,
                    ).model_dump(mode="json")
                    for q in result.questions
                ],
            )
        )

    def answer_questions(
        self, document_id: UUID, user_id: UUID, answers: dict[str, bool]
    ) -> CvDocument:
        """A yes adds the proposed line to its position or project, marked as confirmed by the user."""
        document = self.get(document_id, user_id)
        content = CvContent.model_validate(document.content)
        questions = [TailoringQuestion.model_validate(q) for q in document.questions or []]
        for question in questions:
            if question.answer is not None or question.id not in answers:
                continue
            question.answer = answers[question.id]
            if question.answer:
                _add_confirmed_line(content, question)
        document.content = content.model_dump(mode="json")
        document.questions = [q.model_dump(mode="json") for q in questions]
        return self.documents.save(document)

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

    def render_thumbnail(
        self, document_id: UUID, user_id: UUID, renderer: CvRenderer
    ) -> tuple[CvDocument, RenderedPage]:
        document = self.get(document_id, user_id)
        content = CvContent.model_validate(document.content)
        page = renderer.render_page(
            content, document.template, document.language, page=1, ppi=THUMBNAIL_PPI
        )
        return document, page


def _add_confirmed_line(content: CvContent, question: TailoringQuestion) -> None:
    """Finds the entry by name (the user may have reordered entries since) and adds the line if there is room."""
    if question.kind == "experience":
        jobs = [
            e for e in content.experience if f"{e.role} · {e.organization}" == question.entry_name
        ]
        if jobs and len(jobs[0].bullets) < 12:
            jobs[0].bullets.append(CvLine(text=question.proposed_line, origin="confirmed"))
    else:
        projects = [p for p in content.projects if p.name == question.entry_name]
        if projects and len(projects[0].bullets) < 8:
            projects[0].bullets.append(CvLine(text=question.proposed_line, origin="confirmed"))

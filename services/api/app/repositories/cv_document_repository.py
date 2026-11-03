# Database access for CV documents, always scoped by owner.

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.cv_document import CvDocument


class CvDocumentRepository:
    def __init__(self, db: Session):
        self.db = db

    def save(self, document: CvDocument) -> CvDocument:
        self.db.add(document)
        self.db.commit()
        self.db.refresh(document)
        return document

    def list_for_user(self, user_id: UUID) -> list[CvDocument]:
        stmt = (
            select(CvDocument)
            .where(CvDocument.user_id == user_id)
            .order_by(CvDocument.updated_at.desc())
        )
        return list(self.db.scalars(stmt))

    def get_for_user(self, document_id: UUID, user_id: UUID) -> CvDocument | None:
        stmt = select(CvDocument).where(CvDocument.id == document_id, CvDocument.user_id == user_id)
        return self.db.scalar(stmt)

    def latest_maker_for_resume(self, resume_id: UUID, user_id: UUID) -> CvDocument | None:
        """The CV Maker copy of a saved CV that the user edited last, if there is one."""
        stmt = (
            select(CvDocument)
            .where(
                CvDocument.user_id == user_id,
                CvDocument.resume_id == resume_id,
                CvDocument.kind == "maker",
            )
            .order_by(CvDocument.updated_at.desc())
            .limit(1)
        )
        return self.db.scalar(stmt)

    def delete(self, document: CvDocument) -> None:
        self.db.delete(document)
        self.db.commit()

# Database access for Analysis rows, always scoped by the owning user and eager-loading document titles.

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.analysis import Analysis


class AnalysisRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, analysis: Analysis) -> Analysis:
        self.db.add(analysis)
        self.db.commit()
        self.db.refresh(analysis)
        return analysis

    def save(self, analysis: Analysis) -> Analysis:
        self.db.commit()
        self.db.refresh(analysis)
        return analysis

    def get_with_documents(self, analysis_id: UUID) -> Analysis | None:
        """Unscoped lookup used by the background runner, which already holds a trusted id."""
        stmt = self._with_documents(select(Analysis)).where(Analysis.id == analysis_id)
        return self.db.scalar(stmt)

    def get_for_user(self, analysis_id: UUID, user_id: UUID) -> Analysis | None:
        stmt = self._with_documents(select(Analysis)).where(
            Analysis.id == analysis_id, Analysis.user_id == user_id
        )
        return self.db.scalar(stmt)

    def list_for_user(self, user_id: UUID) -> list[Analysis]:
        stmt = (
            self._with_documents(select(Analysis))
            .where(Analysis.user_id == user_id)
            .order_by(Analysis.created_at.desc())
        )
        return list(self.db.scalars(stmt))

    @staticmethod
    def _with_documents(stmt):
        return stmt.options(selectinload(Analysis.resume), selectinload(Analysis.job_description))

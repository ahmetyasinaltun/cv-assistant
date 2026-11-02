# Imports every ORM model so SQLAlchemy metadata and Alembic see the full schema.

from app.models.analysis import Analysis, AnalysisStatus
from app.models.cv_document import CvDocument
from app.models.job_description import JobDescription
from app.models.resume import Resume
from app.models.user import User

__all__ = ["Analysis", "AnalysisStatus", "CvDocument", "JobDescription", "Resume", "User"]

# Aggregates all route modules into the single API router mounted by the application.

from fastapi import APIRouter

from app.api.routes import analyses, auth, cv_templates, job_descriptions, resumes, samples

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(resumes.router)
api_router.include_router(job_descriptions.router)
api_router.include_router(analyses.router)
api_router.include_router(samples.router)
api_router.include_router(cv_templates.router)

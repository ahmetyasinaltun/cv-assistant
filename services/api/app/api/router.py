# Aggregates all route modules into the single API router mounted by the application.

from fastapi import APIRouter

from app.api.routes import auth, job_descriptions, resumes

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(resumes.router)
api_router.include_router(job_descriptions.router)

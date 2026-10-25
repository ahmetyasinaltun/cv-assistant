# Response schema for the fictional sample CV and job posting that clients offer to first-time users.

from pydantic import BaseModel


class SampleResume(BaseModel):
    title: str
    text: str


class SampleJobDescription(BaseModel):
    title: str
    company: str | None
    text: str


class SampleAnalysisInput(BaseModel):
    resume: SampleResume
    job_description: SampleJobDescription

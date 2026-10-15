# AI Career Assistant

An end-to-end web + mobile application that helps students and early-career candidates understand how well their CV matches a job description, what evidence supports the match, what is missing, and how to prepare for the interview.

The product is deliberately explainable: instead of an unexplained "87% fit", it shows extracted requirements, the CV evidence found for each one, a reproducible score, targeted improvement suggestions and interview questions grounded in the actual gap.

## Architecture

One shared backend, two independent clients.

```text
apps/web        Next.js / TypeScript web client
apps/mobile     Flutter / Dart mobile client
services/api    FastAPI backend: auth, documents, AI pipeline, persistence
```

- Backend: Python 3.12+, FastAPI, SQLAlchemy 2, Alembic, PostgreSQL
- AI: provider-agnostic service layer; default provider is Google Gemini (free tier) for both structured LLM output and embeddings
- Auth: email/password with bcrypt hashing and JWT bearer tokens

## Local setup (backend)

Requirements: Git, Python 3.12+, Docker.

```bash
# 0. Clone
git clone https://github.com/ahmetyasinaltun/ai_career_assistant.git
cd ai_career_assistant

# 1. Start PostgreSQL (listens on localhost:5434 to avoid clashing with a local install)
docker compose up -d

# 2. Create a virtualenv and install the API
cd services/api
python -m venv .venv
.venv/Scripts/activate            # Windows
# source .venv/bin/activate       # macOS / Linux
pip install -e ".[dev]"

# 3. Configure environment
cp .env.example .env              # Windows cmd: copy; then set JWT_SECRET_KEY and GEMINI_API_KEY

# 4. Apply migrations and run
alembic upgrade head
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

## Tests

```bash
cd services/api
pytest
```

Tests run against an in-memory SQLite database and a deterministic fake AI provider, so they need no network access or API keys.

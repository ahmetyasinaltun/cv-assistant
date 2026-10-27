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
- AI: provider-agnostic service layer; default provider is Google Gemini (free tier) for both structured LLM output and embeddings, with a fallback chain of models because free-tier quotas are per model
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

## Local setup (web)

Requirements: Node.js 20+.

```bash
# Start the backend first (see above); the web client talks to it at http://localhost:8000
cd apps/web
npm install
npm run dev            # http://localhost:3000 → redirects to /en or /tr
```

The web client is a Next.js 16 app (App Router, TypeScript, Tailwind CSS 4). The interface is bilingual (English/Turkish): the language lives in the URL (`/en/...`, `/tr/...`) and the first visit picks it from the browser.

- Register at `/en/register`, then start an analysis from **New analysis**. "Fill with the sample CV and posting" runs the fictional sample live.
- The session token lives in an httpOnly cookie and every API call is made by the Next.js server, so the browser never sees the token. Set `API_BASE_URL` in `apps/web/.env.local` if the API is not on `http://localhost:8000` (see `.env.example`).
- Without an account, the pre-computed sample result is at `/en/analyses/sample`. Add `?preview=running`, `failed`, `no-questions` or `questions-error` to see the other states.

## Local setup (mobile)

Requirements: Flutter 3.47 (stable) and the Android SDK. The mobile client is Android-first; it calls the same API as the web client.

```bash
# Start the backend first (see above)
cd apps/mobile
flutter pub get
flutter run            # Android emulator; the API is reached at http://10.0.2.2:8000
flutter run --dart-define=API_BASE_URL=http://192.168.1.20:8000   # a phone on the same network
```

- The access token is kept in `flutter_secure_storage` (encrypted with a key in the Android Keystore).
- The app opens in the device language until sign-in, then in the account's language; changing the language while signed in saves it to the account, as on the web.
- Debug builds allow plain HTTP for the local API; release builds allow HTTPS only.

## Tests

```bash
cd services/api
pytest

cd apps/web
npm test               # unit tests (Vitest)
npm run lint
npm run build          # also type-checks

cd apps/mobile
flutter analyze
flutter test           # unit and widget tests against a scripted fake API
```

Backend tests run against an in-memory SQLite database and a deterministic fake AI provider, so they need no network access or API keys.

## Known limitations

- **Free AI tier and personal data.** The default provider is Gemini's free tier. Under Google's terms for unpaid services, submitted content may be used to improve Google's products and may be read by human reviewers. Use fictional or anonymized CVs for demos; a paid tier or a self-hosted model would be needed for real personal data.
- **Speed depends on the free tier.** An analysis takes from a few seconds to a few minutes, depending on which models in the fallback chain are overloaded or out of quota.
- **Security is portfolio-grade.** Passwords are hashed with bcrypt and the web client keeps the token in an httpOnly cookie, but there are no refresh tokens, rate limits or audit logs.

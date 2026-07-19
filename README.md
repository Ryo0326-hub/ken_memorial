# Ken Memorial

Ken Memorial is a digital tribute wall and living memory archive focused on respectful remembrance, privacy-aware contribution, and moderated publishing.

## Repository Structure

- `docs/PRD.md`: product requirements (v1 draft)
- `docs/ARCHITECTURE.md`: proposed technical architecture
- `docs/MVP_BACKLOG.md`: implementation phases and milestones
- `frontend/`: TypeScript memorial web app scaffold
- `backend/`: Python FastAPI API scaffold
- `infra/`: deployment and environment templates

## Current Public Experience

- Public memorial app:
  - `/` Home (hero + integrated Tribute Wall)
  - `/submit` Leave a Tribute
  - `/guidelines` Submission/privacy guidelines
  - `/chat` governed, memory-based AI memorial chat (feature-flagged)
- Admin moderation app:
  - `/admin/login`
  - `/admin/tributes`
  - Protected moderation endpoints with bearer token auth
- Home page highlights:
  - integrated cork-board Tribute Wall directly under hero
  - realistic sticky-note design with handwritten tribute text styles
  - hero photo frame (interactive click-to-open)
- Public tribute wall filters:
  - tribute type
  - anonymous vs named
- Submission fields:
  - type, title, content
  - display mode + optional display name
  - sticky note color selection (Sky, Mint, Lavender)
  - pen style selection (Classic, Marker, Fountain)
  - optional single image attachment (JPEG/PNG/WEBP, max 3MB)
  - separate, optional AI-memory consent (unchecked by default)
- Automatic metadata:
  - posted date is recorded automatically and displayed on each sticky note
- Moderation API actions:
  - admin login
  - list/filter admin tributes
  - patch moderation/content metadata
  - approve/reject/hide/unhide
  - pin/unpin
  - sanitize, include, exclude, and re-index consented AI memories
  - create, review, activate, and roll back versioned Core Personas
  - review AI answer feedback and reports

## Quick Start (Scaffold)

### Infrastructure (Postgres via Docker)

```bash
docker compose up -d postgres
```

### Infrastructure (Neon)

Use your Neon organization and project:

- Org: `org-blue-boat-72105994`
- Project: `holy-truth-29696808` (`ken-memorial`)

1) Install and authenticate Neon CLI:

```bash
brew install neonctl
neonctl auth
```

2) Get your Neon connection string:

```bash
neonctl connection-string --project-id holy-truth-29696808
```

3) Set up backend env file once:

```bash
cp backend/.env.example backend/.env
# then paste your Neon connection string into backend/.env as DATABASE_URL
```

4) Run backend migrations and API against Neon:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
alembic upgrade head
uvicorn app.main:app --reload
```

The currently configured deployment database is Supabase rather than the older Neon setup
described above. Migration `0007_ai_memorial_chat` enables the PostgreSQL `vector` extension;
confirm the deployment database role can create that extension before applying it.

### Full Local Stack

```bash
docker compose up --build -d
```

### Backend with Neon (One-time setup + one-command start)

1) Create root env file for Docker Compose:

```bash
cp .env.example .env
```

2) Set your Neon connection string in `.env`:

```dotenv
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require&channel_binding=require
```

3) Start/restart backend (uses Neon automatically):

```bash
docker compose up -d --build backend
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:5173`

For production frontend deployment (for example, Vercel), set:

```dotenv
VITE_API_BASE_URL=https://your-backend-domain
```

`frontend/vercel.json` contains the SPA fallback required for direct `/chat`, `/submit`,
`/guidelines`, and admin-route refreshes.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
alembic upgrade head
uvicorn app.main:app --reload
```

Open API: `http://localhost:8000`

### AI memorial configuration

The backend loads the root `.env` first and then `backend/.env` without overwriting existing
values, so Docker Compose and direct `uvicorn` runs use the same server-side OpenAI key. Required
launch settings are documented in both `.env.example` files. Keep these disabled during migration
and review:

```dotenv
AI_CHAT_ENABLED=false
AI_SAFETY_HMAC_SECRET=<long-random-secret>
```

After applying migrations, import the Git-ignored private persona draft from `backend/` with:

```bash
python -m scripts.import_persona
```

Review it in the admin dashboard and activate it only when Ryo approves it. Then index only
approved, public, explicitly consented tributes through the admin memory controls. See
`docs/CORE_PERSONA_OPERATIONS.md` for the full workflow.

## Next Build Steps

1. Add stronger auth hardening (password hashing, refresh strategy, lockout)
2. Add backend integration tests for admin patch and visibility rules
3. Add anti-spam/rate limiting and optional captcha
4. Deploy staging on AWS with CI/CD and secret management

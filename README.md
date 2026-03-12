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

- Multi-page memorial app:
  - `/` Home
  - `/about` Ken's Story
  - `/tributes` Tribute Wall with filters and full-detail modal
  - `/submit` Tribute submission with privacy notice
  - `/guidelines` Submission/privacy guidelines
- Admin moderation app:
  - `/admin/login`
  - `/admin/tributes`
  - Protected moderation endpoints with bearer token auth
- Public tribute wall filters:
  - tribute type
  - year
  - anonymous vs named
  - featured only
- Submission fields:
  - type, title, content
  - display mode + optional display name
  - optional relationship to Ken
  - optional year tag / occasion date
  - optional single image attachment (JPEG/PNG/WEBP, max 3MB)
- Moderation API actions:
  - admin login
  - list/filter admin tributes
  - patch moderation/content metadata
  - approve/reject/hide/unhide
  - pin/unpin

## Quick Start (Scaffold)

### Infrastructure (Postgres)

```bash
docker compose up -d postgres
```

### Database Admin UI (Adminer)

```bash
docker compose up -d adminer
```

Open: `http://localhost:8080`

Login values:
- System: `PostgreSQL`
- Server: `postgres`
- Username: `postgres`
- Password: `postgres`
- Database: `ken_memorial`

### Full Local Stack

```bash
docker compose up --build -d
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
alembic upgrade head
uvicorn app.main:app --reload
```

## Next Build Steps

1. Add stronger auth hardening (password hashing, refresh strategy, lockout)
2. Add backend integration tests for admin patch and visibility rules
3. Add anti-spam/rate limiting and optional captcha
4. Deploy staging on AWS with CI/CD and secret management

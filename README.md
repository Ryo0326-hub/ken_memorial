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
- Automatic metadata:
  - posted date is recorded automatically and displayed on each sticky note
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

Open: `http://localhost:5173`

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

## Next Build Steps

1. Add stronger auth hardening (password hashing, refresh strategy, lockout)
2. Add backend integration tests for admin patch and visibility rules
3. Add anti-spam/rate limiting and optional captcha
4. Deploy staging on AWS with CI/CD and secret management

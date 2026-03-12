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
- Public tribute wall filters:
  - tribute type
  - year tag
  - author visibility (named/anonymous)
  - featured only
- Submission fields:
  - type, title, content
  - display mode + optional display name
  - optional relationship to Ken
  - optional year tag / occasion date
- Moderation API actions:
  - approve/reject/hide/unhide
  - pin/unpin

## Quick Start (Scaffold)

### Infrastructure (Postgres)

```bash
docker compose up -d postgres
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

1. Add admin authentication and protected admin frontend routes
2. Add backend integration tests for filter and moderation flows
3. Add anti-spam/rate limiting and moderation audit trail improvements
4. Deploy staging environment on AWS with CI/CD

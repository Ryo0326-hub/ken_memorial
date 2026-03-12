# Ken Memorial

Ken Memorial is a digital tribute wall and living memory archive focused on respectful remembrance, privacy-aware contribution, and moderated publishing.

## Repository Structure

- `docs/PRD.md`: product requirements (v1 draft)
- `docs/ARCHITECTURE.md`: proposed technical architecture
- `docs/MVP_BACKLOG.md`: implementation phases and milestones
- `frontend/`: TypeScript memorial web app scaffold
- `backend/`: Python FastAPI API scaffold
- `infra/`: deployment and environment templates

## MVP Scope (v1)

- Public memorial homepage and tribute wall
- Submission form for:
  - birthday messages
  - yearly tribute letters
- Identity choice:
  - display name shown
  - anonymous display
- Admin moderation workflow:
  - review pending submissions
  - approve/reject/hide
  - optional pinning

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

1. Add moderation auth for admin routes
2. Add tests and CI pipeline
3. Add anti-spam/rate limiting
4. Containerize and deploy to AWS

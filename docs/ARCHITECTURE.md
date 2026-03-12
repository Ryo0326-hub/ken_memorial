# Architecture (MVP)

## Stack

- Frontend: React + TypeScript + Vite
- Backend: FastAPI (Python 3.11+)
- Database: PostgreSQL
- Infra (initial): Docker Compose for local, AWS deployment target later

## System Components

1. Web client
- Renders memorial landing and tribute wall
- Hosts submission form
- Calls backend API

2. API service
- Validates and stores submissions
- Exposes approved tributes for public read
- Exposes admin moderation endpoints

3. Database
- Stores tributes and moderation metadata

## API Surface (initial)

Public:

- `GET /health`
- `GET /api/v1/tributes` (approved only)
- `POST /api/v1/submissions`

Admin:

- `GET /api/v1/admin/tributes?status=pending`
- `POST /api/v1/admin/tributes/{id}/approve`
- `POST /api/v1/admin/tributes/{id}/reject`
- `POST /api/v1/admin/tributes/{id}/hide`
- `POST /api/v1/admin/tributes/{id}/pin`

## Security Baseline

- Strict server-side validation for content and display mode
- Basic rate limiting on submission endpoint
- Admin routes protected by token/session auth (single-admin acceptable for v1)
- Never expose hidden/rejected/pending tributes publicly

## Data Flow

1. User submits tribute -> validation -> saved as `pending`
2. Admin reviews -> status updated
3. Public wall fetches only `approved` and not hidden items

## Deployment Evolution

- Phase 1: Docker Compose
- Phase 2: AWS (ECS/Fargate or EC2)
- Phase 3: Kubernetes for learning track

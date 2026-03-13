import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import admin, admin_auth, public, submissions

app = FastAPI(title="Ken Memorial API", version="0.1.0")


def _allowed_origins() -> list[str]:
    raw = os.getenv("CORS_ALLOW_ORIGINS", "")
    if raw.strip():
        return [origin.strip() for origin in raw.split(",") if origin.strip()]
    return ["http://localhost:5173", "http://127.0.0.1:5173"]


def _allowed_origin_regex() -> str | None:
    raw = os.getenv("CORS_ALLOW_ORIGIN_REGEX", "").strip()
    return raw or None

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_origin_regex=_allowed_origin_regex(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public.router, prefix="/api/v1")
app.include_router(submissions.router, prefix="/api/v1")
app.include_router(admin_auth.router, prefix="/api/v1/admin")
app.include_router(admin.router, prefix="/api/v1/admin")

# Aliases that match the PRD endpoint style.
app.include_router(public.router, prefix="/api")
app.include_router(submissions.router, prefix="/api")
app.include_router(admin_auth.router, prefix="/api/admin")
app.include_router(admin.router, prefix="/api/admin")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

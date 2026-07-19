from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

JWT_ALGORITHM = "HS256"
JWT_SECRET = settings.admin_jwt_secret
ADMIN_EMAIL = settings.admin_email
ADMIN_PASSWORD = settings.admin_password

security_scheme = HTTPBearer(auto_error=False)


def authenticate_admin(email: str, password: str) -> bool:
    return email == ADMIN_EMAIL and password == ADMIN_PASSWORD


def create_access_token(subject: str, expires_in_hours: int = 12) -> str:
    payload = {
        "sub": subject,
        "role": "admin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=expires_in_hours),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as exc:  # pragma: no cover - defensive branch
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_scheme),
) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authentication required",
        )

    payload = decode_access_token(credentials.credentials)
    if payload.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )

    return payload

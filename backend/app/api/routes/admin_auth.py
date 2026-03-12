from fastapi import APIRouter, HTTPException, status

from app.schemas.admin import AdminLoginRequest, AdminLoginResponse
from app.security import authenticate_admin, create_access_token

router = APIRouter(tags=["admin-auth"])


@router.post("/login", response_model=AdminLoginResponse)
def admin_login(payload: AdminLoginRequest) -> AdminLoginResponse:
    if not authenticate_admin(payload.email, payload.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    return AdminLoginResponse(access_token=create_access_token(payload.email))

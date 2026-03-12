from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.admin import AdminTributePatch
from app.schemas.tribute import Tribute, TributeStatus
from app.security import require_admin
from app.services.tributes import (
    apply_admin_patch,
    get_by_id,
    list_tributes_by_status,
    set_featured,
    set_status,
)

router = APIRouter(tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/tributes", response_model=list[Tribute])
def get_tributes(
    status: TributeStatus | None = None,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
) -> list[Tribute]:
    return list_tributes_by_status(db, status, page, page_size)


@router.get("/tributes/{tribute_id}", response_model=Tribute)
def get_tribute(tribute_id: str, db: Session = Depends(get_db)) -> Tribute:
    tribute = get_by_id(db, tribute_id)
    if not tribute:
        raise HTTPException(status_code=404, detail="Tribute not found")
    return tribute


@router.patch("/tributes/{tribute_id}", response_model=Tribute)
def patch_tribute(
    tribute_id: str,
    payload: AdminTributePatch,
    db: Session = Depends(get_db),
) -> Tribute:
    tribute = get_by_id(db, tribute_id)
    if not tribute:
        raise HTTPException(status_code=404, detail="Tribute not found")
    return apply_admin_patch(db, tribute, payload)


@router.post("/tributes/{tribute_id}/approve", response_model=Tribute)
def approve_tribute(tribute_id: str, db: Session = Depends(get_db)) -> Tribute:
    tribute = get_by_id(db, tribute_id)
    if not tribute:
        raise HTTPException(status_code=404, detail="Tribute not found")
    return set_status(db, tribute, TributeStatus.approved)


@router.post("/tributes/{tribute_id}/reject", response_model=Tribute)
def reject_tribute(tribute_id: str, db: Session = Depends(get_db)) -> Tribute:
    tribute = get_by_id(db, tribute_id)
    if not tribute:
        raise HTTPException(status_code=404, detail="Tribute not found")
    return set_status(db, tribute, TributeStatus.rejected)


@router.post("/tributes/{tribute_id}/hide", response_model=Tribute)
def hide_tribute(tribute_id: str, db: Session = Depends(get_db)) -> Tribute:
    tribute = get_by_id(db, tribute_id)
    if not tribute:
        raise HTTPException(status_code=404, detail="Tribute not found")
    return set_status(db, tribute, TributeStatus.hidden)


@router.post("/tributes/{tribute_id}/unhide", response_model=Tribute)
def unhide_tribute(tribute_id: str, db: Session = Depends(get_db)) -> Tribute:
    tribute = get_by_id(db, tribute_id)
    if not tribute:
        raise HTTPException(status_code=404, detail="Tribute not found")
    return set_status(db, tribute, TributeStatus.approved)


@router.post("/tributes/{tribute_id}/pin", response_model=Tribute)
def pin_tribute(tribute_id: str, db: Session = Depends(get_db)) -> Tribute:
    tribute = get_by_id(db, tribute_id)
    if not tribute:
        raise HTTPException(status_code=404, detail="Tribute not found")
    return set_featured(db, tribute, True)


@router.post("/tributes/{tribute_id}/unpin", response_model=Tribute)
def unpin_tribute(tribute_id: str, db: Session = Depends(get_db)) -> Tribute:
    tribute = get_by_id(db, tribute_id)
    if not tribute:
        raise HTTPException(status_code=404, detail="Tribute not found")
    return set_featured(db, tribute, False)

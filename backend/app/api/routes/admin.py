from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.tribute import Tribute, TributeStatus
from app.services.tributes import get_by_id, list_tributes_by_status, set_status

router = APIRouter(tags=["admin"])


@router.get("/tributes", response_model=list[Tribute])
def get_tributes(
    status: TributeStatus = TributeStatus.pending, db: Session = Depends(get_db)
) -> list[Tribute]:
    return list_tributes_by_status(db, status)


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

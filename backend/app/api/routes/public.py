from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.tribute import Tribute, TributeType
from app.services.tributes import get_public_by_id, list_public_tributes

router = APIRouter(tags=["public"])


@router.get("/tributes", response_model=list[Tribute])
def get_tributes(
    type: TributeType | None = None,
    year: int | None = None,
    featured: bool = False,
    anonymous: bool | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
) -> list[Tribute]:
    return list_public_tributes(db, type, year, anonymous, featured, page, page_size)


@router.get("/tributes/{tribute_id}", response_model=Tribute)
def get_tribute_detail(tribute_id: str, db: Session = Depends(get_db)) -> Tribute:
    tribute = get_public_by_id(db, tribute_id)
    if not tribute:
        raise HTTPException(status_code=404, detail="Tribute not found")
    return tribute

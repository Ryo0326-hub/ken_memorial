from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.tribute import Tribute
from app.services.tributes import list_public_tributes

router = APIRouter(tags=["public"])


@router.get("/tributes", response_model=list[Tribute])
def get_tributes(db: Session = Depends(get_db)) -> list[Tribute]:
    return list_public_tributes(db)

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.tribute import DisplayMode, SubmissionCreate, Tribute
from app.services.tributes import create_submission as create_submission_service

router = APIRouter(tags=["submissions"])


@router.post("/submissions", response_model=Tribute, status_code=201)
def create_submission(payload: SubmissionCreate, db: Session = Depends(get_db)) -> Tribute:
    if payload.display_mode == DisplayMode.named and not payload.submitted_name:
        raise HTTPException(status_code=400, detail="submitted_name is required for named submissions")
    return create_submission_service(db, payload)

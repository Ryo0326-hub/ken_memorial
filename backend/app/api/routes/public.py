from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.tribute import PublicTribute, TributeType, normalize_tribute_type
from app.services.tributes import get_public_by_id, get_public_image_data, list_public_tributes

router = APIRouter(tags=["public"])


@router.get("/tributes", response_model=list[PublicTribute])
def get_tributes(
    type: str | None = None,
    year: int | None = None,
    featured: bool = False,
    anonymous: bool | None = None,
    page: int = 1,
    page_size: int = 20,
    include_images: bool = True,
    db: Session = Depends(get_db),
) -> list[PublicTribute]:
    tribute_type: TributeType | None = None
    if type is not None:
        try:
            tribute_type = TributeType(normalize_tribute_type(type))
        except ValueError as exc:
            raise HTTPException(status_code=422, detail="Unknown tribute type") from exc
    return list_public_tributes(
        db,
        tribute_type,
        year,
        anonymous,
        featured,
        page,
        page_size,
        include_images,
    )


@router.get("/tributes/{tribute_id}/image", response_class=Response)
def get_tribute_image(tribute_id: str, db: Session = Depends(get_db)) -> Response:
    image = get_public_image_data(db, tribute_id)
    if not image:
        raise HTTPException(status_code=404, detail="Tribute image not found")

    media_type, content = image
    return Response(
        content=content,
        media_type=media_type,
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/tributes/{tribute_id}", response_model=PublicTribute)
def get_tribute_detail(tribute_id: str, db: Session = Depends(get_db)) -> PublicTribute:
    tribute = get_public_by_id(db, tribute_id)
    if not tribute:
        raise HTTPException(status_code=404, detail="Tribute not found")
    return tribute

from datetime import date

from pydantic import BaseModel, Field

from app.schemas.tribute import TributeStatus, Visibility


class AdminLoginRequest(BaseModel):
    email: str
    password: str


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminTributePatch(BaseModel):
    moderation_status: TributeStatus | None = None
    featured: bool | None = None
    visibility: Visibility | None = None
    title: str | None = Field(default=None, max_length=140)
    content: str | None = Field(default=None, min_length=10, max_length=5000)
    relationship_to_ken: str | None = Field(default=None, max_length=80)
    year_tag: int | None = Field(default=None, ge=2000, le=2100)
    occasion_date: date | None = None
    moderation_notes: str | None = Field(default=None, max_length=2000)
    image_data_url: str | None = Field(default=None, max_length=4_500_000)

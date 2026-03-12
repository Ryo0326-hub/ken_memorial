from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, model_validator


class TributeType(str, Enum):
    birthday = "birthday"
    yearly_letter = "yearly_letter"


class DisplayMode(str, Enum):
    named = "named"
    anonymous = "anonymous"


class TributeStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    hidden = "hidden"


class SubmissionCreate(BaseModel):
    type: TributeType
    title: str | None = Field(default=None, max_length=140)
    content: str = Field(min_length=10, max_length=5000)
    display_mode: DisplayMode
    submitted_name: str | None = Field(default=None, max_length=100)
    relationship_to_ken: str | None = Field(default=None, max_length=80)
    year_tag: int | None = Field(default=None, ge=2000, le=2100)
    occasion_date: date | None = None

    @model_validator(mode="after")
    def validate_title_for_yearly_letters(self) -> "SubmissionCreate":
        if self.type == TributeType.yearly_letter and not self.title:
            raise ValueError("title is required for yearly tribute letters")
        return self


class Tribute(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: TributeType
    title: str | None = None
    content: str
    display_mode: DisplayMode
    submitted_name: str | None = None
    relationship_to_ken: str | None = None
    year_tag: int | None = None
    occasion_date: date | None = None
    public_display_name: str
    status: TributeStatus
    submitted_at: datetime
    is_featured: bool = False

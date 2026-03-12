from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


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
    content: str = Field(min_length=10, max_length=5000)
    display_mode: DisplayMode
    submitted_name: str | None = Field(default=None, max_length=100)


class Tribute(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: TributeType
    content: str
    display_mode: DisplayMode
    submitted_name: str | None = None
    public_display_name: str
    status: TributeStatus
    submitted_at: datetime
    is_featured: bool = False

import base64
import binascii
from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator


class TributeType(str, Enum):
    birthday = "birthday"
    yearly_letter = "yearly_letter"


class DisplayMode(str, Enum):
    named = "named"
    anonymous = "anonymous"


class Visibility(str, Enum):
    public = "public"
    private = "private"


class TributeStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    hidden = "hidden"


class StickyNoteColor(str, Enum):
    sunshine = "sunshine"
    sky = "sky"
    blossom = "blossom"
    mint = "mint"
    lavender = "lavender"


class PenStyle(str, Enum):
    classic = "classic"
    marker = "marker"
    fountain = "fountain"
    gel = "gel"


class SubmissionCreate(BaseModel):
    type: TributeType
    title: str | None = Field(default=None, max_length=140)
    content: str = Field(min_length=10, max_length=5000)
    display_mode: DisplayMode
    submitted_name: str | None = Field(default=None, max_length=100)
    relationship_to_ken: str | None = Field(default=None, max_length=80)
    year_tag: int | None = Field(default=None, ge=2000, le=2100)
    occasion_date: date | None = None
    image_data_url: str | None = Field(default=None, max_length=4_500_000)
    sticky_note_color: StickyNoteColor = StickyNoteColor.sunshine
    pen_style: PenStyle = PenStyle.classic

    @model_validator(mode="after")
    def validate_submission(self) -> "SubmissionCreate":
        if self.type == TributeType.yearly_letter and not (self.title or "").strip():
            raise ValueError("title is required for letters")

        if self.type == TributeType.birthday and len(self.content.strip()) > 1500:
            raise ValueError("birthday messages must be 1500 characters or fewer")

        if self.type == TributeType.yearly_letter and len(self.content.strip()) < 50:
            raise ValueError("letters must be at least 50 characters")

        if self.image_data_url:
            if not self.image_data_url.startswith("data:image/") or ";base64," not in self.image_data_url:
                raise ValueError("image must be a valid base64 data URL")

            header, encoded = self.image_data_url.split(",", 1)
            mime = header[5:].split(";")[0]
            if mime not in {"image/jpeg", "image/png", "image/webp"}:
                raise ValueError("image must be JPEG, PNG, or WEBP")

            try:
                raw_bytes = base64.b64decode(encoded, validate=True)
            except (binascii.Error, ValueError) as exc:
                raise ValueError("image data is invalid") from exc

            if len(raw_bytes) > 3 * 1024 * 1024:
                raise ValueError("image must be 3MB or smaller")

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
    image_data_url: str | None = None
    sticky_note_color: StickyNoteColor
    pen_style: PenStyle
    public_display_name: str
    status: TributeStatus
    visibility: Visibility
    moderation_notes: str | None = None
    submitted_at: datetime
    is_featured: bool = False
    created_at: datetime
    updated_at: datetime
    approved_at: datetime | None = None

    @computed_field
    @property
    def is_anonymous(self) -> bool:
        return self.display_mode == DisplayMode.anonymous

    @computed_field
    @property
    def public_author_label(self) -> str:
        return self.public_display_name

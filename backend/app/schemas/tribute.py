import base64
import binascii
from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator


class TributeType(str, Enum):
    message = "message"
    memory_recollection = "memory_recollection"


LEGACY_TRIBUTE_TYPE_ALIASES = {
    "birthday": TributeType.message,
    "yearly_letter": TributeType.message,
}


def normalize_tribute_type(value: object) -> object:
    if isinstance(value, str):
        return LEGACY_TRIBUTE_TYPE_ALIASES.get(value, value)
    return value


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


class AIConsentBasis(str, Enum):
    submitter_opt_in = "submitter_opt_in"
    contributor_confirmed = "contributor_confirmed"
    owner_authored = "owner_authored"


class AIUseStatus(str, Enum):
    excluded = "excluded"
    pending_review = "pending_review"
    included = "included"
    index_error = "index_error"


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


class PaperTheme(str, Enum):
    plain = "plain"
    wildflower_corners = "wildflower_corners"
    eucalyptus_frame = "eucalyptus_frame"
    lavender_edge = "lavender_edge"


class MemorySticker(str, Enum):
    daisy = "daisy"
    forget_me_not = "forget_me_not"
    lavender_sprig = "lavender_sprig"
    fern = "fern"
    butterfly = "butterfly"
    white_dove = "white_dove"
    small_heart = "small_heart"
    warm_star = "warm_star"
    photo = "photo"


class MemoryDecoration(BaseModel):
    model_config = ConfigDict(extra="forbid")

    instance_id: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    asset: MemorySticker
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    scale: float = Field(ge=0.65, le=1.35)
    rotation: float = Field(ge=-30, le=30)


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
    paper_theme: PaperTheme = PaperTheme.plain
    decorations: list[MemoryDecoration] = Field(default_factory=list, max_length=6)
    ai_consent: bool = False

    @model_validator(mode="before")
    @classmethod
    def normalize_legacy_type(cls, value: object) -> object:
        if isinstance(value, dict) and "type" in value:
            return {**value, "type": normalize_tribute_type(value["type"])}
        return value

    @model_validator(mode="after")
    def validate_submission(self) -> "SubmissionCreate":
        if self.type == TributeType.message:
            if len(self.content.strip()) > 1500:
                raise ValueError("messages must be 1500 characters or fewer")
            if self.paper_theme != PaperTheme.plain or self.decorations:
                raise ValueError("memory paper styling is only available for memory recollections")

        if self.type == TributeType.memory_recollection and (self.title or "").strip():
            raise ValueError("memory recollections do not use a separate title")

        if self.type == TributeType.memory_recollection:
            photo_decorations = [item for item in self.decorations if item.asset == MemorySticker.photo]
            sticker_decorations = [item for item in self.decorations if item.asset != MemorySticker.photo]
            if len(photo_decorations) > 1:
                raise ValueError("memory recollections can use only one photo decoration")
            if len(sticker_decorations) > 5:
                raise ValueError("memory recollections can use up to five stickers")
            if photo_decorations and not self.image_data_url:
                raise ValueError("photo decorations require an uploaded image")

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
    paper_theme: PaperTheme = PaperTheme.plain
    decorations: list[MemoryDecoration] = Field(default_factory=list)
    public_display_name: str
    status: TributeStatus
    visibility: Visibility
    moderation_notes: str | None = None
    submitted_at: datetime
    is_featured: bool = False
    created_at: datetime
    updated_at: datetime
    approved_at: datetime | None = None
    has_image: bool = False
    ai_consent: bool = False
    ai_consent_policy_version: str | None = None
    ai_consent_at: datetime | None = None
    ai_consent_basis: AIConsentBasis | None = None
    ai_use_status: AIUseStatus = AIUseStatus.excluded
    ai_redacted_content: str | None = None
    ai_indexed_at: datetime | None = None
    ai_index_error: str | None = None

    @computed_field
    @property
    def is_anonymous(self) -> bool:
        return self.display_mode == DisplayMode.anonymous

    @computed_field
    @property
    def public_author_label(self) -> str:
        return self.public_display_name


class PublicTribute(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: TributeType
    title: str | None = None
    content: str
    display_mode: DisplayMode
    relationship_to_ken: str | None = None
    year_tag: int | None = None
    occasion_date: date | None = None
    image_data_url: str | None = None
    sticky_note_color: StickyNoteColor
    pen_style: PenStyle
    paper_theme: PaperTheme = PaperTheme.plain
    decorations: list[MemoryDecoration] = Field(default_factory=list)
    public_display_name: str
    submitted_at: datetime
    is_featured: bool = False
    created_at: datetime
    approved_at: datetime | None = None
    has_image: bool = False

    @computed_field
    @property
    def is_anonymous(self) -> bool:
        return self.display_mode == DisplayMode.anonymous

    @computed_field
    @property
    def public_author_label(self) -> str:
        return self.public_display_name

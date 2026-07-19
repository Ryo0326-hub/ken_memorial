from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


AI_MEMORIAL_NOTICE = (
    "This is an AI memorial inspired by approved memories about Ken. "
    "It is not Ken and may get things wrong."
)


class Relationship(str, Enum):
    family = "family"
    friend = "friend"
    school = "school"
    teammate = "teammate"
    other = "other"
    prefer_not_to_say = "prefer_not_to_say"


class ChatRole(str, Enum):
    user = "user"
    assistant = "assistant"


class HistoryMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: ChatRole
    content: str = Field(min_length=1, max_length=2000)


class ChatMessageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    session_id: str = Field(min_length=16, max_length=100)
    message: str = Field(min_length=1, max_length=1000)
    relationship: Relationship | None = None
    history: list[HistoryMessage] = Field(default_factory=list, max_length=8)

    @field_validator("message")
    @classmethod
    def trim_message(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("message cannot be blank")
        return value.strip()


class GroundingMode(str, Enum):
    profile = "profile"
    memory = "memory"
    mixed = "mixed"
    uncertain = "uncertain"
    safety = "safety"


class SourceCard(BaseModel):
    tribute_id: str
    title: str
    author_label: str
    snippet: str


class ChatMessageResponse(BaseModel):
    request_id: str
    message: str
    grounding_mode: GroundingMode
    sources: list[SourceCard]
    can_feedback: bool = True


class FeedbackRating(str, Enum):
    helpful = "helpful"
    inaccurate = "inaccurate"
    inappropriate = "inappropriate"
    too_personal = "too_personal"


class ReportedExchange(BaseModel):
    model_config = ConfigDict(extra="forbid")
    user_message: str = Field(min_length=1, max_length=1000)
    assistant_message: str = Field(min_length=1, max_length=4000)


class FeedbackCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    request_id: str
    rating: FeedbackRating
    comment: str | None = Field(default=None, max_length=1000)
    attach_exchange: bool = False
    reported_exchange: ReportedExchange | None = None

    @model_validator(mode="after")
    def require_explicit_exchange_consent(self) -> "FeedbackCreate":
        if self.reported_exchange is not None and not self.attach_exchange:
            raise ValueError("attach_exchange must be true to store a reported exchange")
        return self


class Feedback(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    request_id: str
    rating: FeedbackRating
    comment: str | None
    reported_exchange: dict | None
    source_tribute_ids: list[str]
    persona_version: int
    generation_model: str
    created_at: datetime
    reviewed_at: datetime | None
    resolution_notes: str | None


class ChatConfig(BaseModel):
    enabled: bool
    persona_version: int | None
    notice_version: str
    notice: str = AI_MEMORIAL_NOTICE
    starter_prompts: list[str]
    max_message_characters: int = 1000


class ModelChatOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, max_length=4000)
    grounding_mode: GroundingMode
    source_ids: list[str] = Field(max_length=5)
    safety_mode: bool

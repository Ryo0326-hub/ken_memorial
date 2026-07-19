from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PersonaStatus(str, Enum):
    draft = "draft"
    active = "active"
    archived = "archived"


class PersonaProfileContent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    identity_and_life_context: list[str] = Field(default_factory=list)
    voice_and_speaking_style: list[str] = Field(default_factory=list)
    vocabulary_expressions_languages: list[str] = Field(default_factory=list)
    values: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    weaknesses_and_imperfections: list[str] = Field(default_factory=list)
    habits_and_mannerisms: list[str] = Field(default_factory=list)
    hobbies_and_interests: list[str] = Field(default_factory=list)
    humor_style: list[str] = Field(default_factory=list)
    relationships: list[str] = Field(default_factory=list)
    important_places_and_periods: list[str] = Field(default_factory=list)
    known_sayings: list[dict[str, str]] = Field(default_factory=list)
    insufficient_evidence_topics: list[str] = Field(default_factory=list)
    hard_boundaries: list[str] = Field(default_factory=list)
    example_responses: list[str] = Field(default_factory=list)
    counterexamples: list[str] = Field(default_factory=list)


class PersonaCreate(BaseModel):
    profile: PersonaProfileContent
    change_note: str = Field(min_length=1, max_length=2000)


class PersonaPatch(BaseModel):
    profile: PersonaProfileContent | None = None
    change_note: str | None = Field(default=None, min_length=1, max_length=2000)


class PersonaProfile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    version: int
    status: PersonaStatus
    profile: dict[str, Any]
    change_note: str
    created_by: str
    activated_by: str | None = None
    created_at: datetime
    updated_at: datetime
    activated_at: datetime | None = None

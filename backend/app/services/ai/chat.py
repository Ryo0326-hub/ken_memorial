from __future__ import annotations

from uuid import uuid4

from sqlalchemy.orm import Session

from app.config import settings
from app.models.ai import ChatGenerationModel, PersonaProfileModel
from app.schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    GroundingMode,
    ModelChatOutput,
    SourceCard,
)
from app.services.ai.memory import RetrievedMemory, retrieve_memories
from app.services.ai.openai_gateway import OpenAIGateway
from app.services.ai.prompt import build_ken_guide_instructions, build_ken_profile_evidence
from app.services.ai.safety import (
    contains_first_person_ken_narration,
    deterministic_safety_response,
    is_impersonation_request,
)


MODERATION_REFUSAL = (
    "This guide can't continue with that request. It can answer questions about Ken using approved "
    "profile information and shared memories, or you can return to the tribute wall."
)
IMPERSONATION_BOUNDARY = (
    "This guide can’t speak as Ken or create a message from him. It can share what Ryo’s approved "
    "profile and consented memories say about him."
)
UNGROUNDED_RESPONSE = (
    "The approved profile and shared memories don't contain enough reliable information to answer "
    "that without guessing. You could ask about the places, activities, or stories documented here."
)


def _source_card(memory: RetrievedMemory) -> SourceCard:
    content = " ".join(memory.chunk.content.split())
    snippet = content if len(content) <= 240 else f"{content[:237].rstrip()}..."
    return SourceCard(
        tribute_id=memory.tribute.id,
        title=memory.tribute.title or "Shared memory",
        author_label=memory.tribute.public_display_name,
        snippet=snippet,
    )


def _record_generation(
    db: Session,
    *,
    request_id: str,
    source_ids: list[str],
    persona: PersonaProfileModel,
    grounding_mode: GroundingMode,
) -> None:
    db.add(
        ChatGenerationModel(
            request_id=request_id,
            source_tribute_ids=source_ids,
            persona_version=persona.version,
            generation_model=settings.openai_chat_model,
            grounding_mode=grounding_mode.value,
        )
    )
    db.commit()


def _fixed_response(
    db: Session,
    persona: PersonaProfileModel,
    message: str,
    mode: GroundingMode,
) -> ChatMessageResponse:
    request_id = str(uuid4())
    _record_generation(
        db,
        request_id=request_id,
        source_ids=[],
        persona=persona,
        grounding_mode=mode,
    )
    return ChatMessageResponse(
        request_id=request_id,
        message=message,
        grounding_mode=mode,
        sources=[],
    )


def create_chat_response(
    db: Session,
    payload: ChatMessageRequest,
    persona: PersonaProfileModel,
    safety_identifier: str,
    gateway: OpenAIGateway | None = None,
) -> ChatMessageResponse:
    fixed_safety = deterministic_safety_response(payload.message)
    if fixed_safety:
        return _fixed_response(db, persona, fixed_safety, GroundingMode.safety)
    if is_impersonation_request(payload.message):
        return _fixed_response(db, persona, IMPERSONATION_BOUNDARY, GroundingMode.safety)

    gateway = gateway or OpenAIGateway()
    moderation_text = "\n".join(
        [item.content for item in payload.history] + [payload.message]
    )
    if gateway.moderate(moderation_text):
        return _fixed_response(db, persona, MODERATION_REFUSAL, GroundingMode.safety)

    query_embedding = gateway.embed([payload.message])[0]
    retrieved = retrieve_memories(db, query_embedding)
    memory_context = [
        {"tribute_id": item.tribute.id, "excerpt": item.chunk.content}
        for item in retrieved
    ]
    generated: ModelChatOutput = gateway.generate(
        instructions=build_ken_guide_instructions(persona),
        message=payload.message,
        history=payload.history,
        memory_context=memory_context,
        safety_identifier=safety_identifier,
    )
    if gateway.moderate(generated.message):
        return _fixed_response(db, persona, MODERATION_REFUSAL, GroundingMode.safety)
    profile_evidence = build_ken_profile_evidence(persona)
    documented_quotes = tuple(
        str(saying[field])
        for saying in profile_evidence.get("known_sayings", [])
        if isinstance(saying, dict)
        for field in ("quote", "saying")
        if field in saying and str(saying[field]).strip()
    )
    if contains_first_person_ken_narration(generated.message, documented_quotes):
        return _fixed_response(db, persona, IMPERSONATION_BOUNDARY, GroundingMode.safety)

    retrieved_by_id = {item.tribute.id: item for item in retrieved}
    valid_ids: list[str] = []
    for source_id in generated.source_ids:
        if source_id in retrieved_by_id and source_id not in valid_ids:
            valid_ids.append(source_id)

    grounding_mode = generated.grounding_mode
    message = generated.message
    if grounding_mode in {GroundingMode.memory, GroundingMode.mixed} and not valid_ids:
        grounding_mode = GroundingMode.uncertain
        message = UNGROUNDED_RESPONSE

    sources = [_source_card(retrieved_by_id[source_id]) for source_id in valid_ids[:3]]
    request_id = str(uuid4())
    _record_generation(
        db,
        request_id=request_id,
        source_ids=[source.tribute_id for source in sources],
        persona=persona,
        grounding_mode=grounding_mode,
    )
    return ChatMessageResponse(
        request_id=request_id,
        message=message,
        grounding_mode=grounding_mode,
        sources=sources,
    )

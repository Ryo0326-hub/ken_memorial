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
from app.services.ai.prompt import build_memorial_instructions
from app.services.ai.safety import deterministic_safety_response, is_identity_question


MODERATION_REFUSAL = (
    "I can't continue with that request in this memorial chat. We can talk about approved memories "
    "of Ken, or you can return to the tribute wall."
)
IDENTITY_DISCLOSURE = (
    "I'm not really Ken. I'm an AI memorial shaped by Ryo's approved profile and public memories "
    "that contributors allowed the memorial to use. I can be mistaken, and I can't know Ken's "
    "private thoughts or speak for what he would believe today."
)
UNGROUNDED_RESPONSE = (
    "I don't have a reliable shared memory about that in the approved archive, so I don't want to "
    "make something up. You could ask about the places, activities, or stories that are documented here."
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
    if is_identity_question(payload.message):
        return _fixed_response(db, persona, IDENTITY_DISCLOSURE, GroundingMode.profile)

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
        instructions=build_memorial_instructions(persona),
        message=payload.message,
        history=payload.history,
        relationship=payload.relationship,
        memory_context=memory_context,
        safety_identifier=safety_identifier,
    )
    if gateway.moderate(generated.message):
        return _fixed_response(db, persona, MODERATION_REFUSAL, GroundingMode.safety)

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

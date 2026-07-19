from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.ai import MemoryChunkModel
from app.models.tribute import TributeModel
from app.schemas.tribute import AIUseStatus, TributeStatus, Visibility
from app.services.ai.openai_gateway import OpenAIGateway


@dataclass
class RetrievedMemory:
    chunk: MemoryChunkModel
    tribute: TributeModel
    similarity: float


def is_eligible_for_ai(tribute: TributeModel) -> bool:
    return bool(
        tribute.status == TributeStatus.approved
        and tribute.visibility == Visibility.public
        and tribute.ai_consent
        and tribute.ai_consent_basis is not None
        and tribute.ai_consent_policy_version
        and tribute.ai_use_status == AIUseStatus.included
        and (tribute.ai_redacted_content or "").strip()
    )


def chunk_memory_text(text: str, target_chars: int = 1600, overlap_chars: int = 180) -> list[str]:
    paragraphs = [part.strip() for part in text.replace("\r\n", "\n").split("\n\n") if part.strip()]
    if not paragraphs:
        return []
    chunks: list[str] = []
    current = ""
    for paragraph in paragraphs:
        candidate = f"{current}\n\n{paragraph}".strip()
        if current and len(candidate) > target_chars:
            chunks.append(current)
            overlap = current[-overlap_chars:].lstrip()
            current = f"{overlap}\n\n{paragraph}".strip()
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks


def remove_memory_chunks(db: Session, tribute: TributeModel) -> None:
    db.execute(delete(MemoryChunkModel).where(MemoryChunkModel.tribute_id == tribute.id))
    tribute.ai_indexed_at = None
    tribute.ai_index_error = None
    db.add(tribute)
    db.commit()


def sync_tribute_memory(
    db: Session,
    tribute: TributeModel,
    gateway: OpenAIGateway | None = None,
) -> TributeModel:
    if not is_eligible_for_ai(tribute):
        remove_memory_chunks(db, tribute)
        return tribute

    texts = chunk_memory_text((tribute.ai_redacted_content or "").strip())
    content_hashes = [hashlib.sha256(content.encode("utf-8")).hexdigest() for content in texts]
    existing = list(
        db.scalars(
            select(MemoryChunkModel)
            .where(MemoryChunkModel.tribute_id == tribute.id)
            .order_by(MemoryChunkModel.chunk_index)
        )
    )
    if (
        len(existing) == len(texts)
        and all(
            item.chunk_index == index
            and item.content_hash == content_hashes[index]
            and item.embedding_model == settings.openai_embedding_model
            for index, item in enumerate(existing)
        )
    ):
        tribute.ai_indexed_at = tribute.ai_indexed_at or datetime.now(timezone.utc)
        tribute.ai_index_error = None
        db.add(tribute)
        db.commit()
        db.refresh(tribute)
        return tribute

    try:
        gateway = gateway or OpenAIGateway()
        embeddings = gateway.embed(texts)
        if len(embeddings) != len(texts):
            raise RuntimeError("Embedding provider returned an unexpected number of vectors")

        db.execute(delete(MemoryChunkModel).where(MemoryChunkModel.tribute_id == tribute.id))
        for index, (content, embedding) in enumerate(zip(texts, embeddings, strict=True)):
            db.add(
                MemoryChunkModel(
                    tribute_id=tribute.id,
                    chunk_index=index,
                    content=content,
                    content_hash=content_hashes[index],
                    embedding=embedding,
                    embedding_model=settings.openai_embedding_model,
                )
            )
        tribute.ai_use_status = AIUseStatus.included
        tribute.ai_indexed_at = datetime.now(timezone.utc)
        tribute.ai_index_error = None
        db.add(tribute)
        db.commit()
        db.refresh(tribute)
        return tribute
    except Exception as exc:
        db.rollback()
        current = db.get(TributeModel, tribute.id)
        if current is None:
            raise
        current.ai_use_status = AIUseStatus.index_error
        current.ai_index_error = f"{type(exc).__name__}: {str(exc)[:500]}"
        current.ai_indexed_at = None
        db.add(current)
        db.commit()
        db.refresh(current)
        return current


def _cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    numerator = sum(a * b for a, b in zip(left, right, strict=True))
    denominator = math.sqrt(sum(a * a for a in left)) * math.sqrt(sum(b * b for b in right))
    return numerator / denominator if denominator else 0.0


def retrieve_memories(
    db: Session,
    query_embedding: list[float],
    *,
    limit: int = 5,
    candidate_limit: int = 8,
) -> list[RetrievedMemory]:
    eligibility = (
        TributeModel.status == TributeStatus.approved,
        TributeModel.visibility == Visibility.public,
        TributeModel.ai_consent.is_(True),
        TributeModel.ai_consent_basis.is_not(None),
        TributeModel.ai_consent_policy_version.is_not(None),
        TributeModel.ai_use_status == AIUseStatus.included,
        TributeModel.ai_redacted_content.is_not(None),
        MemoryChunkModel.embedding_model == settings.openai_embedding_model,
    )

    if db.bind is not None and db.bind.dialect.name == "postgresql":
        distance = MemoryChunkModel.embedding.cosine_distance(query_embedding)
        statement = (
            select(MemoryChunkModel, TributeModel, distance.label("distance"))
            .join(TributeModel, TributeModel.id == MemoryChunkModel.tribute_id)
            .where(*eligibility)
            .order_by(distance)
            .limit(candidate_limit)
        )
        candidates = [
            RetrievedMemory(chunk=chunk, tribute=tribute, similarity=1.0 - float(distance_value))
            for chunk, tribute, distance_value in db.execute(statement).all()
        ]
    else:
        statement = (
            select(MemoryChunkModel, TributeModel)
            .join(TributeModel, TributeModel.id == MemoryChunkModel.tribute_id)
            .where(*eligibility)
        )
        candidates = [
            RetrievedMemory(
                chunk=chunk,
                tribute=tribute,
                similarity=_cosine_similarity(list(chunk.embedding), query_embedding),
            )
            for chunk, tribute in db.execute(statement).all()
        ]
        candidates.sort(key=lambda item: item.similarity, reverse=True)
        candidates = candidates[:candidate_limit]

    diverse: list[RetrievedMemory] = []
    seen_tributes: set[str] = set()
    for candidate in candidates:
        if candidate.similarity < settings.ai_retrieval_threshold:
            continue
        if candidate.tribute.id in seen_tributes:
            continue
        seen_tributes.add(candidate.tribute.id)
        diverse.append(candidate)
        if len(diverse) >= limit:
            break
    return diverse

from __future__ import annotations

import re


CRISIS_PATTERNS = (
    r"\bkill myself\b",
    r"\bend my life\b",
    r"\bwant to die\b",
    r"\bgoing to die by suicide\b",
    r"\bdie (?:so I can|to) be with (?:you|ken)\b",
    r"\bsuicide plan\b",
    r"死にたい",
    r"自殺(?:したい|する)",
    r"ケンに会うために死",
)
SEXUAL_PATTERNS = (
    r"\bsexual roleplay\b",
    r"\bsext(?:ing)?\b",
    r"\bnudes?\b",
    r"\berotic\b",
    r"\bexplicit sex\b",
)
PROMPT_EXFILTRATION_PATTERNS = (
    r"\b(?:show|reveal|print|repeat) (?:your |the )?(?:system prompt|core persona)\b",
    r"\bignore (?:all |the )?(?:previous|memorial) instructions\b",
    r"\bhidden (?:tribute|memory|admin data)\b",
)


CRISIS_RESPONSE = (
    "I'm stepping out of the AI memorial voice because your safety matters more than this "
    "conversation. If you may act on these thoughts or are in immediate danger, contact your "
    "local emergency services now and tell a trusted person nearby so you are not alone. You can "
    "also find a local, confidential crisis line at https://findahelpline.com/. This memorial chat "
    "is not a crisis service."
)

SEXUAL_REFUSAL = (
    "I can't take part in sexual or sexualized conversation. This is an AI memorial of someone "
    "who died at 17, so that boundary is absolute. We can talk about non-sexual memories, family, "
    "friendship, school, sports, art, or the tribute wall instead."
)

PROMPT_REFUSAL = (
    "I can't reveal private persona instructions, hidden memories, admin data, or system prompts. "
    "I can only talk from the approved profile and public, consented memories shown as sources."
)


def _matches(text: str, patterns: tuple[str, ...]) -> bool:
    return any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in patterns)


def deterministic_safety_response(text: str) -> str | None:
    if _matches(text, CRISIS_PATTERNS):
        return CRISIS_RESPONSE
    if _matches(text, SEXUAL_PATTERNS):
        return SEXUAL_REFUSAL
    if _matches(text, PROMPT_EXFILTRATION_PATTERNS):
        return PROMPT_REFUSAL
    return None


def is_identity_question(text: str) -> bool:
    return bool(
        re.search(
            r"\b(?:are you (?:really )?ken|are you real|is this (?:really )?ken)\b",
            text,
            flags=re.IGNORECASE,
        )
    )

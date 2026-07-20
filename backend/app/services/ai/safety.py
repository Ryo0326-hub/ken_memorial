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
    r"\b(?:show|reveal|print|repeat) (?:your |the )?(?:system prompt|core persona|ken profile)\b",
    r"\bignore (?:all |the )?(?:previous|memorial) instructions\b",
    r"\bhidden (?:tribute|memory|admin data)\b",
)
IMPERSONATION_REQUEST_PATTERNS = (
    r"\b(?:are you|is this) (?:really )?ken\b",
    r"\b(?:can|could|will|would) you be ken\b",
    r"\b(?:pretend|act|roleplay|imagine|become).{0,20}\bken\b",
    r"\b(?:speak|reply|respond|talk|answer|write).{0,16}\b(?:as|like) ken\b",
    r"\b(?:speak|reply|respond|talk|answer|write).{0,20}\bas (?:if|though) (?:you are|you were) ken\b",
    r"\b(?:use|copy|adopt) ken(?:'s|’s) (?:voice|tone|style)\b",
    r"\b(?:speak|write|answer|respond) in ken(?:'s|’s) (?:voice|tone|style)\b",
    r"\b(?:write|give|send|create) (?:me )?(?:a )?(?:message|letter|note|reply).{0,16}\bfrom ken\b",
    r"\bwhat would ken (?:say|tell|write|think|want|believe|choose|do)\b",
    r"\bwhat ken would (?:say|tell|write|think|want|believe|choose|do)\b",
    r"\bhow would ken (?:reply|respond|answer|react)\b",
    r"\b(?:reply|respond|answer|write) (?:in )?the way ken would\b",
    r"\b(?:message|letter|note|reply) ken would (?:write|send|give)\b",
    r"\b(?:do|can) you remember me\b",
    r"\b(?:can i|let me) talk to ken\b",
    r"\bchannel ken\b",
    r"ケン(?:として|になりきって|のふりをして)",
    r"ケンからの(?:メッセージ|手紙)",
)
FIRST_PERSON_KEN_PATTERNS = (
    r"\bi(?:'m| am) ken\b",
    r"\bi (?:remember|was|loved|liked|enjoyed|preferred|played|went|felt|thought|wanted|grew up|lived|attended|studied|ran|swam|painted|spoke|died)\b",
    r"\bi used to\b",
    r"\bwhen i was\b",
    r"\bmy (?:brother|family|friends?|school|life|childhood|death|favorites?|favourites?|sports?|interests?|hobbies|home|parents?)\b",
)


CRISIS_RESPONSE = (
    "Your safety matters more than this memorial Q&A. If you may act on these thoughts or are "
    "in immediate danger, contact your "
    "local emergency services now and tell a trusted person nearby so you are not alone. You can "
    "also find a local, confidential crisis line at https://findahelpline.com/. This memory guide "
    "is not a crisis service."
)

SEXUAL_REFUSAL = (
    "This guide can't take part in sexual or sexualized conversation about someone who died at "
    "17. It can answer questions about non-sexual memories, family, friendship, school, sports, "
    "art, or the tribute wall instead."
)

PROMPT_REFUSAL = (
    "This guide can't reveal private profile instructions, hidden memories, admin data, or system "
    "prompts. It can only answer from the filtered Ryo-approved profile and public, consented "
    "memories shown as sources."
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


def is_impersonation_request(text: str) -> bool:
    return _matches(text, IMPERSONATION_REQUEST_PATTERNS)


def _without_documented_quoted_spans(text: str, documented_quotes: tuple[str, ...]) -> str:
    documented = {quote.strip().casefold() for quote in documented_quotes if quote.strip()}
    if not documented:
        return text

    def remove_when_documented(match: re.Match[str]) -> str:
        quoted = match.group(1).strip().casefold()
        return "" if quoted in documented else match.group(0)

    without_straight_quotes = re.sub(r'"([^"\n]*)"', remove_when_documented, text)
    without_curly_double = re.sub(r"“([^”\n]*)”", remove_when_documented, without_straight_quotes)
    return re.sub(r"‘([^’\n]*)’", remove_when_documented, without_curly_double)


def contains_first_person_ken_narration(
    text: str, documented_quotes: tuple[str, ...] = ()
) -> bool:
    checked_text = _without_documented_quoted_spans(text, documented_quotes)
    return _matches(checked_text, FIRST_PERSON_KEN_PATTERNS)

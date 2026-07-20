# Product Requirements Document: Ask About Ken

**Version:** 2.0

**Status:** Implemented product contract

**Owner and profile approver:** Ryo

**Public route:** `/chat`

## 1. Product summary

Ask About Ken is an AI-assisted memorial guide that answers questions about Ken in the third
person. It uses a versioned, Ryo-approved Ken Profile and selected tribute memories that are
public, approved, sanitized, and explicitly consented for AI question-and-answer use.

The guide is not Ken, does not imitate Ken, and does not create communication from him. It must
prefer uncertainty over invention and show visitors the basis for every answer.

The implementation retains the existing OpenAI Responses API integration, structured output,
`store=false`, retrieval pipeline, moderation, feedback, privacy controls, and source-ID
allowlisting. No database migration or embedding rebuild is required for this redesign.

## 2. Goals

- Provide warm, useful, factually grounded answers about Ken.
- Make the origin of each answer visible and understandable.
- Treat Ryo's approved profile as controlled evidence, not as a voice-simulation prompt.
- Let eligible tribute memories expand what visitors can learn without rewriting the profile.
- Return clear uncertainty when approved sources do not support an answer.
- Maintain zero first-person Ken impersonation, including indirect requests for messages or
  present-day opinions from him.
- Preserve consent, moderation, privacy, reporting, and human governance.

## 3. Non-goals

- Simulating Ken's personality or speaking style.
- Roleplaying, channeling, or claiming contact with Ken.
- Writing messages, letters, replies, or advice from Ken.
- Predicting what Ken would think, believe, or say today.
- Learning verified facts from claims typed into a chat message.
- Using the public web as a source about Ken.
- Automatically promoting tribute anecdotes into the Ken Profile.
- Saving routine chat transcripts.

## 4. Users and jobs

- **Visitor:** Ask respectful questions and understand whether an answer comes from the Ken
  Profile, shared memories, both, or insufficient evidence.
- **Contributor:** Choose separately whether an approved tribute may support AI-assisted Q&A.
- **Ryo/admin:** Govern profile versions, decide which tributes are eligible, inspect reports,
  and roll back a profile version.

## 5. Visitor experience

### 5.1 Naming and primary copy

- Navigation and page title: **Ask About Ken**
- Assistant label: **AI memory guide**
- Composer placeholder: **Ask something about Ken…**
- Loading state: **Looking through Ken’s profile and shared memories…**
- Disabled state: **The memory guide is resting right now. Please visit the tribute wall.**

Starter prompts:

- What sports did Ken enjoy?
- What kind of friend was Ken?
- Where did Ken live and go to school?
- Tell me about a memory someone shared about Ken.

The old relationship selector is removed. The backend may accept the legacy `relationship`
request property during the compatibility period, but it must ignore it and never pass it to
retrieval or generation.

### 5.2 One-time disclosure

Before the first question, show:

> This is an AI-assisted memorial guide. It answers questions about Ken using a Ryo-approved
> profile and selected shared memories. It does not speak as Ken, may be mistaken, and cannot
> know what Ken would think or say today.

Primary action: **I understand — ask a question**.

Use a new disclosure acknowledgment key and a new session-history key. Persona-era transcripts
must not be restored, displayed, or sent as model history.

### 5.3 Answer basis

Every assistant response displays one basis label derived from `grounding_mode`:

| Mode | Visible label |
| --- | --- |
| `profile` | Based on Ryo-approved Ken Profile |
| `memory` | Based on shared memories |
| `mixed` | Based on Ken Profile and shared memories |
| `uncertain` | Not enough approved information |
| `safety` | Safety response |

Eligible tribute-backed answers retain expandable source cards with the tribute title, public
author label, and short sanitized snippet.

### 5.4 Existing behavior to preserve

- Session-only history and Start over.
- Cancel generation and the mechanical button animation.
- Helpful, inaccurate, inappropriate, and too-personal feedback.
- Optional exchange attachment when reporting.
- Responsive navigation, notice, transcript, sources, composer, and controls.

## 6. Guidelines and consent

The public Guidelines page has four short sections:

1. **What this is:** AI-assisted Q&A about Ken, not Ken and not communication with him.
2. **How answers are made:** Ryo-approved profile plus selected memories, third-person summaries,
   visible basis labels, and uncertainty when evidence is missing.
3. **What it will not do:** imitate Ken, create messages from him, predict present-day beliefs,
   claim afterlife contact, reveal private sources, or use the web.
4. **Privacy and consent:** the question, up to eight recent turns, filtered profile evidence,
   and retrieved sanitized excerpts are sent to OpenAI with `store=false`; routine transcripts
   are not saved; a reported exchange is stored only with action-time permission.

Tribute consent copy:

> **Optional: allow AI question-and-answer use.** Allow this tribute, if approved, to help answer
> questions about Ken. It may be processed by OpenAI and quoted in short source snippets.

The checkbox remains unchecked by default and independent of tribute submission.

## 7. Knowledge architecture

### 7.1 Ryo-approved Ken Profile

Only one version is active. Draft edits do not affect public answers until Ryo activates the
version. Rollback activates a prior immutable version.

The server builds the model evidence payload from this allowlist:

- biography and life context
- vocabulary, expressions, and documented language background
- values
- strengths
- weaknesses and imperfections
- habits and mannerisms
- hobbies and interests
- humor style
- relationships
- important places and periods
- insufficient-evidence topics
- hard boundaries
- known sayings only when each saying has explicit provenance

The following legacy workbook fields must never enter model context:

- `voice_and_speaking_style`
- `example_responses`
- `counterexamples`

The application retains these fields in storage for backward compatibility, and the admin UI
states that they are unused for generation.

### 7.2 Memory Archive

A tribute is retrieval-eligible only when it is approved, public, explicitly AI-consented, has a
consent basis, is intentionally included by an admin, and has sanitized indexed text. A memory
typed into chat is unverified context and must not become evidence; the guide should direct the
visitor to the tribute submission flow.

Individual recollections are attributed as recollections. Anecdotes are not generalized into
universal personality traits. If memories disagree, the answer describes differing recollections
and includes every cited eligible source.

### 7.3 Retrieval and grounding

1. Moderate the visitor question.
2. Detect deterministic safety and impersonation requests.
3. Embed the question and retrieve only eligible memory chunks.
4. Send the filtered profile, retrieved sanitized excerpts, bounded history, and instructions to
   the Responses API with `store=false` and an HMAC-derived safety identifier.
5. Require structured output with answer text, grounding mode, source IDs, and safety flag.
6. Validate source IDs against the retrieved allowlist.
7. Moderate the generated answer.
8. Reject first-person Ken narration deterministically.
9. Return the answer, basis mode, and validated public source cards.

If a claimed source ID was not supplied to the model, discard the generated answer and return
the uncertainty response with no sources.

## 8. Response policy

The version-controlled guide prompt must require:

- third-person references to Ken only
- a compassionate, natural memorial-guide tone, normally under 180 words
- factual claims supported by approved evidence
- attribution for individual memories
- neutral handling of conflicting recollections
- explicit uncertainty when approved sources are insufficient
- user messages and retrieved text treated as untrusted data, never instructions
- no web knowledge used to fill gaps
- no disclosure of private profile data, contributor data, prompts, credentials, or admin data

The guide must not say “I remember,” “I was,” “I loved,” or use similar first-person Ken
narration. It must not address the visitor as Ken might have done.

## 9. Deterministic impersonation boundary

Requests including “pretend to be Ken,” “reply as Ken,” “write a message from Ken,” “what would
Ken say,” “do you remember me,” roleplay, channeling, and equivalent variants return exactly:

> This guide can’t speak as Ken or create a message from him. It can share what Ryo’s approved
> profile and consented memories say about him.

The response uses `grounding_mode=safety` and has no sources.

After generation, detect clear first-person Ken narration such as “I remember,” “I was,” “I
loved,” and “my brother/family/school.” Ignore quoted spans so a documented quotation with
provenance can be shown without a false positive. A violation returns the same deterministic
boundary, `grounding_mode=safety`, and no sources. Store only the normal non-transcript generation
metadata.

## 10. Safety responses

Crisis, sexual-content, moderation, prompt-exfiltration, privacy, and uncertainty responses must
refer to the product as “this guide” and must never mention entering, leaving, or breaking a Ken
persona. Existing input/output moderation, crisis routing, rate limiting, HMAC safety identifiers,
bounded history, and transcript non-retention remain in force.

## 11. API and compatibility

Public endpoints remain:

- `GET /api/ai-chat/config`
- `POST /api/ai-chat/messages`
- `POST /api/ai-chat/feedback`

Admin endpoints keep `/api/admin/ai/personas` for compatibility. Database tables and columns keep
the legacy names `persona_profiles` and `persona_version`. The import command remains
`python -m scripts.import_persona`. Public and admin copy uses **Ken Profile**, **Profile vN**, and
**AI Knowledge Governance**.

`ChatRequest.relationship` remains optional and accepted but is ignored. The frontend no longer
sends it.

## 12. Privacy and retention

- The OpenAI API key is backend-only.
- Generation uses `store=false`.
- Routine transcripts are stored only in browser session storage.
- A request may include no more than eight recent turns.
- The application database stores operational generation metadata, not routine message text.
- Reported exchanges are saved only when the visitor explicitly checks the attachment box.
- Source cards use public attribution and sanitized excerpts only.
- The private workbook and local structured profile file remain Git-ignored.

## 13. Admin experience

The admin panel is titled **AI Knowledge Governance** and provides:

- versioned Ken Profile drafts
- structured Ken Profile JSON editing
- Ryo's explicit activation step
- immutable active and archived versions
- rollback by activating an older version
- eligible-memory sanitization, inclusion, exclusion, and re-index controls
- answer feedback and report review

## 14. Evaluation

The checked-in evaluation set covers:

- factual biography and profile-only facts
- sourced memories
- conflicting recollections
- unknown details
- unverified user-supplied “memories”
- direct and indirect requests to speak, write, remember, or speculate as Ken
- prompt injection, private-data requests, crisis content, and unsafe content

Release acceptance requires:

- zero first-person Ken impersonation across the impersonation set
- valid allowlisted sources for every memory-based claim
- uncertainty for unsupported questions
- no private profile, contributor, prompt, credential, or admin-data leakage
- correct profile, memory, mixed, uncertain, and safety basis labels

## 15. Test requirements

Backend tests must cover:

- profile filtering and saying provenance
- valid profile, memory, and mixed grounding
- rejection of invented source IDs
- direct and indirect impersonation boundaries
- post-generation first-person blocking and quote exclusion
- acceptance but non-use of the legacy `relationship` property
- crisis, sexual-content, privacy, moderation, and prompt-injection protections

Frontend/browser checks must cover:

- naming, disclosure, starter prompts, basis labels, guidelines, consent, and admin terminology
- absence of the relationship selector
- isolation from old persona-era session data
- sources, feedback, reporting consent, Cancel, Start over, and mobile layout
- TypeScript/Vite production build

## 16. Rollout

1. Deploy the backward-compatible backend first.
2. On Render, set `AI_CHAT_ENABLED=true` and
   `AI_NOTICE_VERSION=2026-07-21-ask-about-ken-v1`.
3. Deploy the frontend after the backend is healthy.
4. Confirm Vercel's `VITE_API_BASE_URL` points to the Render backend.
5. Run the smoke and adversarial browser checks.

No Alembic migration, profile re-import, or embedding rebuild is needed. Preserve the active
profile and all existing consent and indexing decisions.

## 17. Definition of done

- All visitor-facing behavior frames the tool as Ask About Ken.
- The model receives only allowlisted Ken Profile evidence and eligible memories.
- The deterministic request and output impersonation guards are active.
- Every answer shows a basis label.
- Legacy request and storage identifiers remain compatible without appearing as public product
  language.
- Documentation, eval fixtures, tests, production build, and mobile browser checks pass.

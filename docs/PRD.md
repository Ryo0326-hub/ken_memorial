# Product Requirements Document (PRD)

## Project Title

Ken Memorial - Digital Tribute Wall & Living Memory Archive

## Document Status

Draft v1.0

## Product Owner

Ryo Kitano

## 1. Executive Summary

Ken Memorial is a digital memorial website honoring Ken, who passed away in November 2021 at age 17. The product provides a respectful, emotionally warm, durable online space where friends, family, and loved ones can share birthday messages, annual tribute letters, and memories over time.

The product balances three goals:

1. Emotional purpose: preserve Ken's memory in a beautiful and dignified way.
2. Community purpose: allow meaningful tributes with optional anonymity.
3. Technical growth purpose: support practical learning in TypeScript, Python, AWS, Docker, CI/CD, Kubernetes, and future RAG.

## 2. Product Vision

Create a long-lasting digital memorial site where Ken's friends and loved ones can leave thoughtful tributes presented on a beautiful tribute wall/canvas layout.

Experience principles:

- Respectful
- Emotionally warm
- Timeless
- Easy to contribute to
- Safe from spam and abuse
- Maintainable over many years

Not a social feed; a curated remembrance space.

## 3. Problem Statement

Mainstream social platforms are not designed for long-term remembrance. Content gets buried, moderation is inconsistent, and tone is transient.

Ken Memorial addresses this by enabling:

- Dedicated birthday and yearly tribute submissions
- Moderated publishing before public visibility
- Optional identity disclosure for contributors
- Thoughtful presentation in a curated tribute wall

Core question:

How can we create a dignified, community-driven memorial website that makes tribute contribution easy while preserving quality, privacy, and emotional sensitivity?

## 4. Goals

### 4.1 Primary Goals

1. Build a public memorial website dedicated to Ken.
2. Support two tribute types:
   - Birthday message
   - Yearly tribute letter
3. Allow contributors to post as named or anonymous.
4. Display approved tributes in a polished visual wall.
5. Provide admin moderation before publication.
6. Build with production-oriented engineering quality.

### 4.2 Secondary Goals

1. Maintainable full-stack architecture.
2. Durable archive foundation for long-term growth.
3. Future support for media uploads and richer search.
4. Clear UX around privacy and identity disclosure.

### 4.3 Learning Goals

Develop practical skills in:

- TypeScript
- Python
- AWS
- Docker
- CI/CD
- Kubernetes (later stage)
- RAG (future archive/search enhancement)

## 5. Non-Goals (v1)

1. Full social network features (likes/comments/follows/DMs).
2. Real-time chat.
3. Public user accounts for general users.
4. User self-editing after publication.
5. Auto-publish without moderation.
6. AI-generated memorial messages.
7. Complex microservice architecture.
8. Kubernetes as initial deployment target.
9. Genealogy/family-tree systems.
10. Literal drawing-canvas engine.

The canvas metaphor is a curated card/tile layout.

## 6. Target Users

### 6.1 Primary Users

Ken's friends and loved ones who want to submit and browse tributes, optionally anonymously.

### 6.2 Secondary Users

Site administrator(s), initially Ryo, responsible for review, curation, and moderation quality.

### 6.3 Future Users

Trusted family/admin users managing private archive assets.

## 7. Personas

### Persona A - Close Friend Contributor

- Age: late teens to mid-20s
- Motivation: share heartfelt remembrance quickly and safely
- Need: low-friction submission and privacy choice

### Persona B - Family Reader/Contributor

- Age: broad
- Motivation: preserve memory with dignity
- Need: polished reading experience and trustworthy moderation

### Persona C - Admin Curator

- Role: trusted moderator
- Motivation: keep space respectful and high quality
- Need: efficient moderation queue and curation tools

## 8. Core User Flows

1. Public visitor browses tribute wall.
2. Contributor submits tribute with type, content, and identity setting.
3. Submission enters pending moderation.
4. Admin reviews and approves/rejects/hides.
5. Approved tribute appears on wall; optional featured pin.

## 9. Functional Requirements (MVP)

### 9.1 Public Site

- Memorial landing section for Ken
- Tribute wall with approved content only
- Filters by tribute type and year

### 9.2 Submission

- Form fields:
  - Tribute type (`birthday`, `yearly_letter`)
  - Message content
  - Contributor display name (optional if anonymous)
  - Identity choice (`named`, `anonymous`)
- Basic anti-spam validation and rate limiting
- Confirmation message after submission

### 9.3 Moderation Admin

- Secure admin login (single admin for v1 acceptable)
- Pending queue
- Actions: approve/reject/hide/unhide/pin/unpin
- Internal moderation notes
- Audit fields (timestamps, reviewer)

## 10. Non-Functional Requirements

- Availability: stable public access
- Security: server-side validation, input sanitization
- Privacy: anonymous handling must not reveal identity publicly
- Performance: wall loads quickly on mobile and desktop
- Accessibility: keyboard navigation and readable contrast
- Maintainability: clean structure, tests, CI-ready setup

## 11. Data Model (MVP)

Primary entity: `Tribute`

Key attributes:

- `id`
- `type` (`birthday`, `yearly_letter`)
- `content`
- `submitted_name`
- `display_mode` (`named`, `anonymous`)
- `public_display_name`
- `status` (`pending`, `approved`, `rejected`, `hidden`)
- `is_featured`
- `moderation_notes`
- `submitted_at`, `reviewed_at`, `published_at`

## 12. Milestones

1. M0 - Foundation: repo setup, CI skeleton, base app shells
2. M1 - Submission + moderation backend
3. M2 - Public wall UI + API integration
4. M3 - Hardening: tests, anti-spam, deployment
5. M4 - Post-v1: media support and archive/search evolution

## 13. Success Metrics (MVP)

- Tribute submission completion rate
- Moderation turnaround time
- Share of approved tributes published without incident
- Qualitative sentiment from family/friends on tone and usability

## 14. Future Extensions

- Media attachments (photo/audio/video)
- Private archive mode for trusted users
- Search and thematic browsing
- RAG-powered memory assistant over approved private corpus

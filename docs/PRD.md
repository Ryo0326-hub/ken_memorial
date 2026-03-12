# Product Requirements Document (PRD)

## Project Title

Ken Memorial - Digital Tribute Wall & Living Memory Archive

## Document Status

Draft v1.0

## Product Owner

Ryo Kitano

## Intended Use

This document guides architecture, implementation, sequencing, and product decisions for AI-assisted and human development.

## 1. Executive Summary

Ken Memorial is a digital memorial website honoring Ken, who passed away in November 2021 at age 17. The product provides a respectful and durable online space where friends and family can share birthday messages, yearly tribute letters, and memories over time.

The site balances:

1. Emotional purpose: preserve Ken's memory with dignity.
2. Community purpose: enable named or anonymous tributes.
3. Technical growth purpose: practical learning in TypeScript, Python, AWS, Docker, CI/CD, Kubernetes, and future RAG.

## 2. Product Vision

Create a long-lasting digital memorial site where tributes are displayed in a tasteful wall/canvas layout with strong moderation and privacy controls.

Tone: respectful, warm, timeless, calm, maintainable.

## 3. Problem Statement

General social platforms are not optimized for long-term remembrance: content gets buried, moderation and privacy are inconsistent, and tone is noisy.

Ken Memorial solves this with dedicated tribute submissions, moderation-first publishing, and curated display.

## 4. Goals

### 4.1 Primary Goals

1. Public memorial website dedicated to Ken.
2. Support tribute types: birthday messages and yearly tribute letters.
3. Support named or anonymous contributions.
4. Display approved tributes in a polished memorial wall.
5. Provide admin moderation before publication.
6. Build with production-quality engineering practices.

### 4.2 Secondary Goals

1. Maintainable full-stack architecture.
2. Durable memory archive foundation.
3. Future support for media and richer archive/search.
4. Clear UX around privacy and identity disclosure.

### 4.3 Learning Goals

TypeScript, Python, AWS, Docker, CI/CD, Kubernetes (later), RAG (future).

## 5. Non-Goals (Initial)

1. Social network features (likes/comments/follows/DMs).
2. Real-time chat.
3. Public user accounts.
4. Open post-publication edits by submitters.
5. Fully automated publishing without moderation.
6. AI-generated memorial messages.
7. Complex microservices.
8. Kubernetes as initial deployment target.
9. Genealogy/family-tree features.
10. Freeform drawing-canvas implementation.

## 6. Target Users

1. Ken's friends.
2. Family members/loved ones.
3. Site admins/moderators (initially Ryo).
4. Future private-archive users.

## 7. User Personas

1. Close Friend Contributor: wants simple heartfelt submission with anonymity option.
2. Family Reader: needs calm, beautiful, moderated experience.
3. Site Admin: needs efficient moderation and curation controls.

## 8. Core Product Principles

1. Dignity first.
2. Moderation by default.
3. Privacy clarity.
4. Simplicity over overengineering.
5. Longevity.
6. Calm UX.
7. Extensibility.

## 9. Core Use Cases

1. Visitor reads memorial homepage.
2. Visitor browses tribute wall.
3. Visitor submits birthday message.
4. Visitor submits yearly letter.
5. Visitor chooses anonymity.
6. Admin moderates submission.
7. Approved tribute appears publicly.
8. Visitor filters tributes.

## 10. Functional Scope

### 10.1 Public Site

1. Homepage
2. About / Ken's Story
3. Tribute Wall / Canvas
4. Submit Tribute
5. Optional Guidelines page

### 10.2 Admin

1. Admin login
2. Moderation dashboard
3. Tribute management and curation

## 11. Functional Requirements

- Submission without public accounts
- Named vs anonymous visibility
- Moderation queue before publication
- Public wall shows approved-only tributes
- Tribute filtering by type/year/visibility/featured
- Admin actions: approve/reject/hide/edit/pin
- Moderation timestamps and audit metadata
- Admin authentication and authorization

## 12. Suggested UX Flows

1. Public visitor flow
2. Tribute submission flow
3. Admin moderation flow

## 13. Information Architecture

### Public Pages

- `/`
- `/about`
- `/tributes`
- `/tributes/[id]` or modal detail
- `/submit`
- `/guidelines`

### Admin Pages

- `/admin/login`
- `/admin`
- `/admin/tributes`
- `/admin/tributes/pending`
- `/admin/tributes/[id]`

## 14. Data Model (Summary)

Core tribute record supports:

- Tribute type and optional title
- Content body
- Display mode and optional submitted name
- Public display name
- Optional relationship to Ken
- Optional year tag and occasion date
- Moderation state and timestamps
- Featured flag and moderation notes


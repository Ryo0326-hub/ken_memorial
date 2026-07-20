# Ken Profile operations

Ken's raw workbook is private source material and must not be committed. The local structured
draft currently lives at `backend/private/ken_persona_v1.json`; the entire `backend/private/`
directory is ignored by Git.

The filename, the `persona_profiles` database table, the `persona_version` API fields, the
`/api/admin/ai/personas` endpoints, and the command `python -m scripts.import_persona` are legacy
compatibility names. Product and admin language uses **Ken Profile**.

## Review and import

1. Edit the private JSON locally, or edit a draft under **AI Knowledge Governance** after import.
2. Apply database migrations when setting up a new database.
3. From `backend/`, run `python -m scripts.import_persona` to replace the migration's empty
   version-1 placeholder with the private draft.
4. Review every field in the admin dashboard.
5. Activate only after Ryo approves the version. Use the dashboard, or deliberately run
   `python -m scripts.import_persona --activate` during first-time setup.

Draft edits do not affect public answers. To revise an active profile, create a new draft version,
review it, and activate it. Active and archived versions are immutable; activating an older
version provides rollback.

## Generation allowlist

The server, not the browser or workbook, constructs the evidence payload. It can include identity
and life context, documented language background, values, strengths, imperfections, habits,
interests, humor, relationships, places and periods, boundaries, and insufficient-evidence
topics. A known saying is included only when it has explicit provenance.

The legacy `voice_and_speaking_style`, `example_responses`, and `counterexamples` fields remain in
the schema but are never sent to the model. Do not use them to influence public answer behavior.

## Content boundaries

Do not enter raw medical speculation, contact information, third-party-private details,
undocumented quotations, credentials, or information that Ryo has not approved for answer use.
An empty field means unknown, not permission for the model to invent content.

Tribute memories follow a separate consent, sanitization, inclusion, and indexing workflow. They
can support attributed answers but never edit the Ken Profile automatically.

## Redesign deployment

No migration, profile re-import, or memory re-index is required when moving from the old persona
experience to Ask About Ken. Preserve the active version and current memory eligibility decisions.
Deploy the compatible backend first, set
`AI_NOTICE_VERSION=2026-07-21-ask-about-ken-v1` on Render, and then deploy the frontend.

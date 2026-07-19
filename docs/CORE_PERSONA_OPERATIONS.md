# Core Persona operations

Ken's raw persona workbook is private source material and must not be committed to this repository. The implementation uses a structured JSON draft at `backend/private/ken_persona_v1.json`; the entire `backend/private/` directory is ignored by Git.

## Review and import

1. Edit the private JSON locally, or use the Persona Versions editor in the admin dashboard after importing.
2. Apply database migrations.
3. From `backend/`, run `python -m scripts.import_persona` to replace the migration's empty version-1 placeholder with the private draft.
4. Review every section in the admin dashboard. Empty voice/humor/example fields mean “unknown,” not permission for the model to invent them.
5. Activate only after Ryo approves the draft. Activation can be done in the dashboard or deliberately with `python -m scripts.import_persona --activate`.

Draft edits never change the active chat persona. To revise an active persona, create a new draft version, review it, and activate it. Activating an older version provides rollback without restoring the database.

Do not paste raw medical speculation, third-party-private details, contact information, or undocumented quotations into the Core Persona. Public tribute memories follow a separate consent, sanitization, inclusion, and indexing workflow.

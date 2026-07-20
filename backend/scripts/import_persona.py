from __future__ import annotations

import argparse
import json
from pathlib import Path

from sqlalchemy import select

from app.db import SessionLocal
from app.models.ai import PersonaProfileModel
from app.schemas.persona import PersonaCreate, PersonaProfileContent, PersonaStatus
from app.services.ai.persona import activate_persona, create_persona


DEFAULT_PERSONA_PATH = Path(__file__).resolve().parents[1] / "private" / "ken_persona_v1.json"


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Import a private, structured Ken Profile draft into the memorial database."
    )
    parser.add_argument("path", nargs="?", type=Path, default=DEFAULT_PERSONA_PATH)
    parser.add_argument(
        "--activate",
        action="store_true",
        help="Activate the imported version. Omit until Ryo has reviewed it in the admin UI.",
    )
    parser.add_argument("--created-by", default="Ryo private workbook import")
    args = parser.parse_args()

    raw = json.loads(args.path.read_text(encoding="utf-8"))
    profile = PersonaProfileContent.model_validate(raw["profile"])
    profile_data = profile.model_dump(mode="json")
    change_note = str(raw.get("change_note") or "Imported private Ken Profile draft v1")

    with SessionLocal() as db:
        personas = list(
            db.scalars(select(PersonaProfileModel).order_by(PersonaProfileModel.version.asc()))
        )
        matching = next((item for item in personas if item.profile == profile_data), None)
        placeholder = next(
            (
                item
                for item in personas
                if item.version == 1
                and item.status == PersonaStatus.draft
                and item.created_by == "migration"
            ),
            None,
        )

        if matching is not None:
            persona = matching
        elif placeholder is not None:
            placeholder.profile = profile.model_dump(mode="json")
            placeholder.change_note = change_note
            placeholder.created_by = args.created_by
            db.add(placeholder)
            db.commit()
            db.refresh(placeholder)
            persona = placeholder
        else:
            persona = create_persona(
                db,
                PersonaCreate(profile=profile, change_note=change_note),
                args.created_by,
            )

        if args.activate:
            persona = activate_persona(db, persona, args.created_by)

        print(
            f"Imported Ken Profile version {persona.version} with status {persona.status.value}."
        )


if __name__ == "__main__":
    main()

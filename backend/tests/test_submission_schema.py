import pytest
from pydantic import ValidationError

from app.schemas.tribute import DisplayMode, PaperTheme, SubmissionCreate, TributeType


BASE_MEMORY = {
    "type": TributeType.memory_recollection,
    "title": None,
    "content": "I remember the way Ken made an ordinary afternoon feel full of light.",
    "display_mode": DisplayMode.named,
    "submitted_name": "Ryo",
}


@pytest.mark.parametrize("legacy_type", ["birthday", "yearly_letter"])
def test_legacy_types_are_normalized_to_message(legacy_type: str) -> None:
    submission = SubmissionCreate(
        type=legacy_type,  # type: ignore[arg-type]
        content="A warm message for Ken that is long enough.",
        display_mode=DisplayMode.anonymous,
    )

    assert submission.type == TributeType.message


def test_memory_recollection_allows_freeform_content_without_title() -> None:
    submission = SubmissionCreate(**BASE_MEMORY)
    assert submission.title is None
    assert submission.paper_theme == PaperTheme.plain


def test_message_is_limited_to_1500_characters() -> None:
    with pytest.raises(ValidationError, match="1500"):
        SubmissionCreate(
            type=TributeType.message,
            content="m" * 1501,
            display_mode=DisplayMode.anonymous,
        )


def test_memory_recollection_allows_5000_characters() -> None:
    submission = SubmissionCreate(**{**BASE_MEMORY, "content": "m" * 5000})
    assert len(submission.content) == 5000


def test_message_rejects_memory_styling() -> None:
    with pytest.raises(ValidationError, match="only available"):
        SubmissionCreate(
            type=TributeType.message,
            content="A warm message for Ken that is long enough.",
            display_mode=DisplayMode.anonymous,
            paper_theme=PaperTheme.lavender_edge,
        )


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("asset", "remote.svg"),
        ("x", -0.01),
        ("y", 1.01),
        ("scale", 1.36),
        ("rotation", 31),
        ("instance_id", "https://example.com/sticker.svg"),
    ],
)
def test_memory_decoration_validation(field: str, value: object) -> None:
    decoration = {
        "instance_id": "sticker-1",
        "asset": "daisy",
        "x": 0.2,
        "y": 0.3,
        "scale": 1,
        "rotation": 0,
        field: value,
    }
    with pytest.raises(ValidationError):
        SubmissionCreate(**{**BASE_MEMORY, "decorations": [decoration]})


def test_memory_decoration_limit_is_five() -> None:
    decorations = [
        {
            "instance_id": f"sticker-{index}",
            "asset": "daisy",
            "x": 0.2,
            "y": 0.3,
            "scale": 1,
            "rotation": 0,
        }
        for index in range(6)
    ]
    with pytest.raises(ValidationError):
        SubmissionCreate(**{**BASE_MEMORY, "decorations": decorations})


def test_memory_recollection_allows_five_stickers_plus_one_photo() -> None:
    decorations = [
        {
            "instance_id": f"sticker-{index}",
            "asset": "daisy",
            "x": 0.2,
            "y": 0.3,
            "scale": 1,
            "rotation": 0,
        }
        for index in range(5)
    ]
    decorations.append(
        {
            "instance_id": "memory-photo",
            "asset": "photo",
            "x": 0.78,
            "y": 0.2,
            "scale": 1,
            "rotation": 4,
        }
    )

    submission = SubmissionCreate(
        **{
            **BASE_MEMORY,
            "image_data_url": "data:image/png;base64,aGVsbG8=",
            "decorations": decorations,
        }
    )

    assert len(submission.decorations) == 6
    assert submission.decorations[-1].asset.value == "photo"


def test_photo_decoration_requires_an_uploaded_image() -> None:
    with pytest.raises(ValidationError, match="uploaded image"):
        SubmissionCreate(
            **{
                **BASE_MEMORY,
                "decorations": [
                    {
                        "instance_id": "memory-photo",
                        "asset": "photo",
                        "x": 0.78,
                        "y": 0.2,
                        "scale": 1,
                        "rotation": 4,
                    }
                ],
            }
        )


def test_memory_recollection_rejects_separate_title() -> None:
    with pytest.raises(ValidationError, match="do not use"):
        SubmissionCreate(**{**BASE_MEMORY, "title": "A separate title"})

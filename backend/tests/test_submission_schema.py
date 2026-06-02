from app.schemas.tribute import DisplayMode, SubmissionCreate, TributeType


def test_yearly_letter_allows_missing_title() -> None:
    submission = SubmissionCreate(
        type=TributeType.yearly_letter,
        title=None,
        content="I keep thinking about the way Ken made ordinary days feel warm and memorable.",
        display_mode=DisplayMode.named,
        submitted_name="Ryo",
    )

    assert submission.title is None

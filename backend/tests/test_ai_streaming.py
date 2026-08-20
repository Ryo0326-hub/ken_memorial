from __future__ import annotations

import json
import unittest
from types import SimpleNamespace

from app.api.routes.chat import encode_stream_event
from app.schemas.chat import GroundingMode, ModelChatOutput
from app.services.ai.openai_gateway import OpenAIGateway


class FakeResponses:
    def __init__(self, events: list[SimpleNamespace]) -> None:
        self.events = events
        self.create_kwargs: dict | None = None

    def create(self, **kwargs):
        self.create_kwargs = kwargs
        return iter(self.events)


class AIStreamingTests(unittest.TestCase):
    def test_gateway_collects_response_text_deltas_before_validation(self) -> None:
        expected = ModelChatOutput(
            message="Ken enjoyed turning track practice into a friendly competition.",
            grounding_mode=GroundingMode.memory,
            source_ids=["tribute-1"],
            safety_mode=False,
        )
        output = expected.model_dump_json()
        midpoint = len(output) // 2
        responses = FakeResponses(
            [
                SimpleNamespace(type="response.output_text.delta", delta=output[:midpoint]),
                SimpleNamespace(type="response.output_text.delta", delta=output[midpoint:]),
                SimpleNamespace(type="response.completed"),
            ]
        )
        gateway = OpenAIGateway.__new__(OpenAIGateway)
        gateway.client = SimpleNamespace(responses=responses)

        result = gateway.generate(
            instructions="Answer as a third-person memorial guide.",
            message="What sport did Ken enjoy?",
            history=[],
            memory_context=[],
            safety_identifier="test-session",
        )

        self.assertEqual(result, expected)
        self.assertIsNotNone(responses.create_kwargs)
        assert responses.create_kwargs is not None
        self.assertIs(responses.create_kwargs["stream"], True)
        self.assertIs(responses.create_kwargs["store"], False)
        self.assertEqual(responses.create_kwargs["input"][0]["role"], "user")

    def test_ndjson_stream_event_is_one_complete_json_record(self) -> None:
        encoded = encode_stream_event(
            {"type": "delta", "text": "Ken enjoyed track.\nHe also liked friends."}
        )

        self.assertTrue(encoded.endswith("\n"))
        self.assertEqual(
            json.loads(encoded),
            {
                "type": "delta",
                "text": "Ken enjoyed track.\nHe also liked friends.",
            },
        )

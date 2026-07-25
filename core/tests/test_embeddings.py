from services.embeddings import event_to_text


def test_event_to_text_includes_primitives():
    text = event_to_text(
        "tool_call",
        {
            "tool": "weather",
            "temperature": 22,
            "success": True,
        },
    )

    assert "event_type:tool_call" in text
    assert "tool:weather" in text
    assert "temperature:22" in text
    assert "success:True" in text


def test_event_to_text_nested_dict():
    text = event_to_text(
        "tool_call",
        {
            "arguments": {
                "city": "Paris",
                "country": "France",
            }
        },
    )

    assert "arguments.city:Paris" in text
    assert "arguments.country:France" in text


def test_event_to_text_lists():
    text = event_to_text(
        "retrieval",
        {
            "documents": [
                "doc1",
                "doc2",
            ]
        },
    )

    assert "documents.0:doc1" in text
    assert "documents.1:doc2" in text
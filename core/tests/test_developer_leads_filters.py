from services.github_leads import parse_keywords
from services.leads_countries import location_matches_country


def test_parse_keywords_defaultish():
    assert "mcp" in parse_keywords("agent, mcp, langchain")
    assert parse_keywords("")  # falls back to defaults


def test_location_worldwide():
    assert location_matches_country(None, "WW")
    assert location_matches_country("anywhere", "WW")


def test_location_spain():
    assert location_matches_country("Málaga, Spain", "ES")
    assert location_matches_country("Berlin, Germany", "ES") is False
    assert location_matches_country("somewhere in spain", "ES")

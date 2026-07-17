"""Country list for Developer Leads geography filter."""

from __future__ import annotations

# (iso2, display_name, match_aliases) — aliases match GitHub profile location (case-insensitive contains)
COUNTRIES: list[tuple[str, str, tuple[str, ...]]] = [
    ("WW", "Worldwide", ()),
    ("US", "United States", ("united states", "usa", "u.s.", "america")),
    ("GB", "United Kingdom", ("united kingdom", "uk", "england", "scotland", "wales", "britain")),
    ("DE", "Germany", ("germany", "deutschland")),
    ("FR", "France", ("france")),
    ("ES", "Spain", ("spain", "españa", "espana")),
    ("IT", "Italy", ("italy", "italia")),
    ("NL", "Netherlands", ("netherlands", "holland")),
    ("BE", "Belgium", ("belgium")),
    ("PT", "Portugal", ("portugal")),
    ("PL", "Poland", ("poland")),
    ("SE", "Sweden", ("sweden")),
    ("NO", "Norway", ("norway")),
    ("DK", "Denmark", ("denmark")),
    ("FI", "Finland", ("finland")),
    ("IE", "Ireland", ("ireland")),
    ("CH", "Switzerland", ("switzerland")),
    ("AT", "Austria", ("austria")),
    ("CA", "Canada", ("canada")),
    ("MX", "Mexico", ("mexico")),
    ("BR", "Brazil", ("brazil", "brasil")),
    ("AR", "Argentina", ("argentina")),
    ("IN", "India", ("india")),
    ("PK", "Pakistan", ("pakistan")),
    ("BD", "Bangladesh", ("bangladesh")),
    ("CN", "China", ("china")),
    ("JP", "Japan", ("japan")),
    ("KR", "South Korea", ("south korea", "korea")),
    ("SG", "Singapore", ("singapore")),
    ("AU", "Australia", ("australia")),
    ("NZ", "New Zealand", ("new zealand")),
    ("IL", "Israel", ("israel")),
    ("AE", "United Arab Emirates", ("uae", "dubai", "abu dhabi")),
    ("SA", "Saudi Arabia", ("saudi")),
    ("ZA", "South Africa", ("south africa")),
    ("NG", "Nigeria", ("nigeria")),
    ("KE", "Kenya", ("kenya")),
    ("EG", "Egypt", ("egypt")),
    ("TR", "Turkey", ("turkey", "türkiye", "turkiye")),
    ("UA", "Ukraine", ("ukraine")),
    ("RU", "Russia", ("russia")),
    ("CZ", "Czechia", ("czech", "prague")),
    ("RO", "Romania", ("romania")),
    ("HU", "Hungary", ("hungary")),
    ("GR", "Greece", ("greece")),
    ("ID", "Indonesia", ("indonesia")),
    ("TH", "Thailand", ("thailand")),
    ("VN", "Vietnam", ("vietnam")),
    ("PH", "Philippines", ("philippines")),
    ("MY", "Malaysia", ("malaysia")),
    ("TW", "Taiwan", ("taiwan")),
    ("HK", "Hong Kong", ("hong kong")),
]


def countries_for_api() -> list[dict]:
    return [{"code": code, "name": name} for code, name, _ in COUNTRIES]


def location_matches_country(location: str | None, country_code: str) -> bool:
    if not country_code or country_code.upper() == "WW":
        return True
    if not location or not location.strip():
        return False
    loc = location.strip().lower()
    for code, _name, aliases in COUNTRIES:
        if code == country_code.upper():
            if any(a in loc for a in aliases):
                return True
            # also match display name tokens
            return False
    return False

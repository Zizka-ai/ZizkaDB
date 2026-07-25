"""AI provider abstraction — a reusable seam for LLM-backed features.

`suggestions` is the first consumer; Reports narratives / Analytics can reuse the
same `SuggestionProvider` interface and config. Nothing here is coupled to
Anthropic beyond `claude_provider`.
"""

"""Evidence-grounded AI suggestions for a single agent.

Pipeline: ``evidence.extract_evidence`` (deterministic facts from the events
table) → ``prompt`` (system prompt + per-request tool schema) → an
``ai.SuggestionProvider`` → ``engine`` (validate/ground/cache). Claude never
sees anything but the computed evidence, so it cannot invent a problem the data
doesn't show.
"""

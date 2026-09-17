"""Session-scoped logging and cross-agent why()."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from zizkadb.models import CausalChain, Event, LogResult

if TYPE_CHECKING:
    from zizkadb.client import ZizkaDB


class SessionScope:
    """Bind logs and why() to one session_id (multi-agent timeline)."""

    def __init__(self, db: ZizkaDB, session_id: str) -> None:
        self._db = db
        self.session_id = session_id

    def track(self, agent: str) -> Any:
        return self._db.track(agent=agent, session_id=self.session_id)

    async def log(
        self,
        agent: str,
        event: str,
        data: dict[str, Any],
        parent_id: str | None = None,
        metadata: dict[str, Any] | None = None,
        token_usage: dict[str, Any] | None = None,
    ) -> LogResult:
        return await self._db.log(
            agent=agent,
            event=event,
            data=data,
            parent_id=parent_id,
            session_id=self.session_id,
            metadata=metadata,
            token_usage=token_usage,
        )

    async def why(self, event_id: str, depth: int = 10) -> CausalChain:
        response = await self._db._get(
            f"/v1/sessions/{self.session_id}/why/{event_id}",
            {"depth": depth},
        )
        from zizkadb.models import Event as Ev

        return CausalChain(
            event_id=response["event_id"],
            chain_length=response["chain_length"],
            chain=[Ev.from_dict(e) for e in response["chain"]],
            chain_complete=response.get("chain_complete", True),
            orphan=response.get("orphan", False),
            depth_truncated=response.get("depth_truncated", False),
            scoped_agent_limited=response.get("scoped_agent_limited", False),
        )

    async def events(self, limit: int = 500) -> list[Event]:
        response = await self._db._get(
            f"/v1/sessions/{self.session_id}/events",
            {"limit": limit},
        )
        from zizkadb.models import Event as Ev

        return [Ev.from_dict(e) for e in response.get("events", [])]

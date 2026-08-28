"""Re-export when zizkadb-livekit is installed alongside zizkadb-sdk."""

try:
    from zizkadb_livekit import ZizkaDBLiveKitObserver
except ImportError:  # pragma: no cover - optional extra
    ZizkaDBLiveKitObserver = None  # type: ignore[misc, assignment]

__all__ = ["ZizkaDBLiveKitObserver"]

from .client import ZizkaDB
from .exceptions import ZizkaDBError, AuthError, NotFoundError, RateLimitError, AgentScopeError

try:
    from importlib.metadata import version as _pkg_version

    __version__ = _pkg_version("zizkadb-sdk")
except Exception:
    __version__ = "0.2.5"

__all__ = [
    "ZizkaDB",
    "ZizkaDBError",
    "AuthError",
    "NotFoundError",
    "RateLimitError",
    "AgentScopeError",
    "__version__",
]

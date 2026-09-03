"""Make the sibling `integrations/` packages importable when running the SDK suite.

The LiveKit observer tests live here but the package itself ships from
`integrations/livekit/`, which is not installed in every environment.
"""

import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parents[3]
_LIVEKIT_PKG = _REPO_ROOT / "integrations" / "livekit"

if _LIVEKIT_PKG.is_dir():
    sys.path.insert(0, str(_LIVEKIT_PKG))

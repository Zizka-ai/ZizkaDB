from zizkadb.telemetry import ping_on_install

from .observer import ZizkaDBLiveKitObserver

ping_on_install(sdk="livekit")

__all__ = ["ZizkaDBLiveKitObserver"]

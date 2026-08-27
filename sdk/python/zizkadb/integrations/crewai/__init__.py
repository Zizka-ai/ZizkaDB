from .logger import ZizkaDBCrewLogger
from zizkadb.telemetry import ping_on_install

ping_on_install(sdk="crewai")

__all__ = ["ZizkaDBCrewLogger"]

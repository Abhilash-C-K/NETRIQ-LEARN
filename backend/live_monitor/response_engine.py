"""
backend/live_monitor/response_engine.py
LEGACY ALIAS / REDIRECTION MODULE.

The production ResponseEngine lives at:
  backend.response.response_engine.ResponseEngine

The CLI simulation runner lives at:
  backend.live_monitor.cli_simulation_runner.LiveMonitorRunner

This module exports aliases for backwards compatibility.
"""

from backend.response.response_engine import ResponseEngine
from backend.live_monitor.cli_simulation_runner import LiveMonitorRunner, check_is_internal_flow
from backend.utils.validators import is_internal_ip as is_private_ip

__all__ = [
    "ResponseEngine",
    "LiveMonitorRunner",
    "check_is_internal_flow",
    "is_private_ip"
]

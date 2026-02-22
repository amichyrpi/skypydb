"""Relational function HTTP client wrappers."""

from __future__ import annotations

from typing import Any, Dict, Optional

from .httpclient import _HttpTransport


def _normalize_endpoint(endpoint: str) -> str:
    value = endpoint.strip().replace(":", ".")
    if not value:
        raise ValueError("endpoint must be a non-empty string.")
    return value


class HttpRelationalClient:
    """Relational client using function endpoints over HTTP."""

    def __init__(self, *, api_url: str, api_key: str, timeout: float = 30.0):
        if not api_url.strip():
            raise ValueError("api_url must be a non-empty string.")
        if not api_key.strip():
            raise ValueError("api_key must be a non-empty string.")
        self._transport = _HttpTransport(
            api_url=api_url, api_key=api_key, timeout=timeout
        )

    def _call(self, endpoint: str, args: Optional[Dict[str, Any]] = None) -> Any:
        payload = {
            "endpoint": _normalize_endpoint(endpoint),
            "args": args or {},
        }
        data = self._transport.request("POST", "/v1/functions/call", payload)
        if isinstance(data, dict) and "result" in data:
            return data["result"]
        return data

    def read(self, endpoint: str, args: Optional[Dict[str, Any]] = None) -> Any:
        return self._call(endpoint, args)

    def write(self, endpoint: str, args: Optional[Dict[str, Any]] = None) -> Any:
        return self._call(endpoint, args)

    def close(self) -> None:
        self._transport.close()

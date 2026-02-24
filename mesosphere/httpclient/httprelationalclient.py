"""Relational function HTTP client wrappers."""

from __future__ import annotations

from typing import Any, Dict, Optional

from .httpclient import _HttpTransport


def _normalize_endpoint(endpoint: Any) -> str:
    raw_endpoint: str
    if isinstance(endpoint, str):
        raw_endpoint = endpoint
    else:
        endpoint_attr = getattr(endpoint, "endpoint", None)
        if isinstance(endpoint_attr, str):
            raw_endpoint = endpoint_attr
        else:
            raise TypeError(
                "endpoint must be a string or expose a string `endpoint` attribute; "
                f"received {type(endpoint).__name__}"
            )

    value = raw_endpoint.strip()
    if not value:
        raise ValueError("endpoint must be a non-empty string.")
    if ":" in value:
        raise ValueError(
            "colon-delimited endpoints are no longer supported; "
            "use dot notation (for example 'users.createUser') or `api.*` references."
        )
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

    def _call(self, endpoint: Any, args: Optional[Dict[str, Any]] = None) -> Any:
        payload = {
            "endpoint": _normalize_endpoint(endpoint),
            "args": args or {},
        }
        data = self._transport.request("POST", "/v1/functions/call", payload)
        if isinstance(data, dict) and "result" in data:
            return data["result"]
        return data

    def read(self, endpoint: Any, args: Optional[Dict[str, Any]] = None) -> Any:
        return self._call(endpoint, args)

    def write(self, endpoint: Any, args: Optional[Dict[str, Any]] = None) -> Any:
        return self._call(endpoint, args)

    def close(self) -> None:
        self._transport.close()

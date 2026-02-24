"""Python function-reference API."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple


@dataclass(frozen=True)
class FunctionReference:
    """Reference to a deployed function endpoint."""

    _segments: Tuple[str, ...]

    def __post_init__(self) -> None:
        if not self._segments:
            raise ValueError("FunctionReference must have at least one segment")

    @property
    def endpoint(self) -> str:
        return ".".join(self._segments)

    def __getattr__(self, name: str) -> "FunctionReference":
        if name.startswith("_"):
            raise AttributeError(name)
        return FunctionReference((*self._segments, name))

    def __str__(self) -> str:
        return self.endpoint

    def __repr__(self) -> str:
        return f"FunctionReference({self.endpoint!r})"


class _ApiRoot:
    """Root object used like `api.myfunction.functionname`."""

    def __getattr__(self, name: str) -> FunctionReference:
        if name.startswith("_"):
            raise AttributeError(name)
        return FunctionReference((name,))

    def __str__(self) -> str:
        return ""

    def __repr__(self) -> str:
        return "api"


api = _ApiRoot()

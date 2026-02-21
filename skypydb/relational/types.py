"""Type contracts used by the Python relational bridge."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Literal, Optional, TypedDict, Union

JsonPrimitive = Union[str, int, float, bool, None]
JsonValue = Union[JsonPrimitive, Dict[str, "JsonValue"], list["JsonValue"]]
JsonObject = Dict[str, JsonValue]

BridgeAction = Literal[
    "init",
    "ping",
    "callschemas",
    "callquery",
    "callmutation",
    "shutdown",
]


class BridgeErrorPayload(TypedDict):
    """Error payload returned by the TypeScript worker."""

    name: str
    message: str
    stack: Optional[str]
    code: Optional[int]


class BridgeSuccessResponse(TypedDict):
    """Successful worker response envelope."""

    id: Union[str, int, None]
    ok: Literal[True]
    result: Any


class BridgeFailureResponse(TypedDict):
    """Failed worker response envelope."""

    id: Union[str, int, None]
    ok: Literal[False]
    error: BridgeErrorPayload


BridgeResponse = Union[BridgeSuccessResponse, BridgeFailureResponse]


@dataclass(slots=True)
class RelationalWorkerError(Exception):
    """Raised when the TypeScript worker returns an error response."""

    name: str
    message: str
    stack: Optional[str] = None
    code: Optional[int] = None

    def __str__(self) -> str:
        if self.code is None:
            return f"[{self.name}] {self.message}"
        return f"[{self.name}#{self.code}] {self.message}"

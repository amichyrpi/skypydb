"""Synchronous Python client for TypeScript relational functions."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional, Sequence, Union

from skypydb.relational.runtime import resolve_worker_command
from skypydb.relational.transport import NodeWorkerTransport


class RelationalClient:
    """Call TypeScript relational `query` and `mutation` endpoints from Python."""

    def __init__(
        self,
        project_root: Optional[Union[str, Path]] = None,
        worker_path: Optional[Union[str, Path]] = None,
        worker_command: Optional[Sequence[str]] = None,
    ):
        self._project_root = Path(project_root or Path.cwd()).resolve()
        command = resolve_worker_command(
            worker_path=worker_path,
            worker_command=worker_command,
        )
        self._transport = NodeWorkerTransport(command, self._project_root)

    def callquery(self, endpoint: str, args: Optional[Dict[str, Any]] = None) -> Any:
        """Call a TypeScript `query` endpoint by `module.function` name."""

        return self._transport.send(
            "callquery",
            {
                "endpoint": endpoint,
                "args": args or {},
            },
        )

    def callmutation(
        self,
        endpoint: str,
        args: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """Call a TypeScript `mutation` endpoint by `module.function` name."""

        return self._transport.send(
            "callmutation",
            {
                "endpoint": endpoint,
                "args": args or {},
            },
        )

    def callschemas(self, options: Optional[Dict[str, Any]] = None) -> None:
        """Apply or configure schema runtime options on the TypeScript side."""

        self._transport.send("callschemas", {"options": options or {}})

    def close(self) -> None:
        """Close the underlying worker process."""

        self._transport.close()

    def __enter__(self) -> "RelationalClient":
        return self

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        self.close()


# Backward-compatible alias requested for relational docs continuity.
ReactiveClient = RelationalClient

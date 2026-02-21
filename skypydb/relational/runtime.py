"""Runtime resolution helpers for the TypeScript worker process."""

from __future__ import annotations

import json
import os
import shlex
from pathlib import Path
from typing import Optional, Sequence, Union

WORKER_OVERRIDE_ENV = "SKYPYDB_TS_WORKER"


def _is_path_like(value: str) -> bool:
    lowered = value.lower()
    if lowered.endswith((".js", ".cjs", ".mjs", ".ts", ".mts", ".cts")):
        return True
    return Path(value).exists()


def _parse_command_override(raw_value: str) -> list[str]:
    value = raw_value.strip()
    if not value:
        raise ValueError("SKYPYDB_TS_WORKER cannot be empty.")

    if value.startswith("["):
        parsed = json.loads(value)
        if not isinstance(parsed, list) or not parsed or not all(
            isinstance(item, str) and item for item in parsed
        ):
            raise ValueError(
                "SKYPYDB_TS_WORKER JSON format must be a non-empty string array."
            )
        return parsed

    if _is_path_like(value):
        return ["node", value]

    tokens = shlex.split(value, posix=os.name != "nt")
    if not tokens:
        raise ValueError("SKYPYDB_TS_WORKER command is empty.")
    return tokens


def _resolve_local_worker() -> Optional[list[str]]:
    repo_root = Path(__file__).resolve().parents[2]
    local_worker = repo_root / "skypydb-js" / "dist" / "python_worker.cjs"
    if local_worker.exists():
        return ["node", str(local_worker)]
    return None


def resolve_worker_command(
    worker_path: Optional[Union[str, Path]] = None,
    worker_command: Optional[Sequence[str]] = None,
) -> list[str]:
    """Resolve the worker launch command using the configured precedence."""

    if worker_command is not None:
        command = [str(part) for part in worker_command if str(part)]
        if not command:
            raise ValueError("worker_command must contain at least one token.")
        return command

    if worker_path is not None:
        return ["node", str(Path(worker_path))]

    env_override = os.getenv(WORKER_OVERRIDE_ENV)
    if env_override is not None:
        return _parse_command_override(env_override)

    local_command = _resolve_local_worker()
    if local_command is not None:
        return local_command

    return ["node", "-e", "require('skypydb/python-worker')"]

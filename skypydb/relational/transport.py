"""Subprocess transport for calling the TypeScript relational worker."""

from __future__ import annotations

import json
import subprocess
import threading
from pathlib import Path
from typing import Any, Dict, Optional, Sequence

from skypydb.relational.types import RelationalWorkerError


class NodeWorkerTransport:
    """Persistent line-delimited JSON transport over a Node subprocess."""

    def __init__(self, command: Sequence[str], project_root: Path):
        self._command = [str(token) for token in command]
        self._project_root = Path(project_root).resolve()
        self._runtime_cwd = self._detect_runtime_cwd()
        self._lock = threading.Lock()
        self._next_id = 1
        self._closed = False
        self._process: Optional[subprocess.Popen[str]] = None

        self._start_process()
        self.send("init", {"projectRoot": str(self._project_root)})

    def _detect_runtime_cwd(self) -> Path:
        if len(self._command) >= 2:
            candidate = Path(self._command[1])
            if candidate.exists() and candidate.suffix in {
                ".js",
                ".cjs",
                ".mjs",
                ".ts",
                ".cts",
                ".mts",
            }:
                if candidate.parent.name == "dist":
                    return candidate.parent.parent.resolve()
                return candidate.parent.resolve()
        return self._project_root

    def _start_process(self) -> None:
        self._process = subprocess.Popen(
            self._command,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            bufsize=1,
            cwd=str(self._runtime_cwd),
        )

    def _next_request_id(self) -> str:
        request_id = str(self._next_id)
        self._next_id += 1
        return request_id

    @staticmethod
    def _as_worker_error(error_payload: Dict[str, Any]) -> RelationalWorkerError:
        return RelationalWorkerError(
            name=str(error_payload.get("name", "Error")),
            message=str(error_payload.get("message", "Worker request failed.")),
            stack=(
                str(error_payload["stack"])
                if error_payload.get("stack") is not None
                else None
            ),
            code=(
                int(error_payload["code"])
                if isinstance(error_payload.get("code"), int)
                else None
            ),
        )

    def _process_exit_details(self, process: subprocess.Popen[str]) -> str:
        stderr_text = ""
        if process.stderr is not None:
            try:
                stderr_text = process.stderr.read()
            except Exception:
                stderr_text = ""
        stderr_text = stderr_text.strip()
        if stderr_text:
            return (
                f"Worker exited with code {process.returncode}. "
                f"stderr: {stderr_text}"
            )
        return f"Worker exited with code {process.returncode}."

    def send(self, action: str, payload: Optional[Dict[str, Any]] = None) -> Any:
        """Send one worker request and return its `result` payload."""

        with self._lock:
            if self._closed:
                raise RuntimeError("Relational transport is already closed.")
            if self._process is None:
                raise RuntimeError("Relational transport is not initialized.")

            process = self._process
            if process.poll() is not None:
                raise RuntimeError(self._process_exit_details(process))

            request_id = self._next_request_id()
            message = {
                "id": request_id,
                "action": action,
                "payload": payload if payload is not None else {},
            }

            if process.stdin is None or process.stdout is None:
                raise RuntimeError("Worker process pipes are not available.")

            process.stdin.write(json.dumps(message) + "\n")
            process.stdin.flush()

            line = process.stdout.readline()
            if line == "":
                if process.poll() is not None:
                    raise RuntimeError(self._process_exit_details(process))
                raise RuntimeError("Worker returned an empty response.")

            try:
                response = json.loads(line)
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"Invalid worker response: {line.strip()}") from exc

            if str(response.get("id")) != request_id:
                raise RuntimeError(
                    f"Worker response id mismatch. Expected {request_id}, got {response.get('id')}."
                )

            if bool(response.get("ok")):
                return response.get("result")

            error_payload = response.get("error")
            if not isinstance(error_payload, dict):
                raise RuntimeError(f"Worker error response is invalid: {response!r}")
            raise self._as_worker_error(error_payload)

    def close(self) -> None:
        """Shutdown worker process and free transport resources."""

        if self._closed:
            return

        try:
            self.send("shutdown", {})
        except Exception:
            pass

        with self._lock:
            process = self._process
            self._process = None
            self._closed = True

        if process is None:
            return

        if process.stdin is not None:
            try:
                process.stdin.close()
            except Exception:
                pass
        if process.stdout is not None:
            try:
                process.stdout.close()
            except Exception:
                pass
        if process.stderr is not None:
            try:
                process.stderr.close()
            except Exception:
                pass

        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=3)

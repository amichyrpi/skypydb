from __future__ import annotations

import os
from pathlib import Path
import sys
from typing import Any

try:
    from skypydb import HttpClient
except ModuleNotFoundError:
    repo_root = Path(__file__).resolve().parents[5]
    if str(repo_root) not in sys.path:
        sys.path.insert(0, str(repo_root))
    from skypydb import HttpClient


def call_mutation(
    client: HttpClient,
    endpoint: str,
    args: dict[str, Any] | None = None,
) -> Any:
    return client.callmutation(endpoint, args or {})


def call_query(
    client: HttpClient,
    endpoint: str,
    args: dict[str, Any] | None = None,
) -> Any:
    return client.callquery(endpoint, args or {})


def main() -> None:
    api_url = os.getenv("SKYPYDB_API_URL", "http://localhost:8000")
    api_key = os.getenv("SKYPYDB_API_KEY", "local-dev-key")
    client = HttpClient(api_url=api_url, api_key=api_key)

    try:
        call_mutation(client, "schemas.applySchema")

        user_id = str(
            call_mutation(
                client,
                "users.createUser",
                {
                    "name": "Theo",
                    "email": "theo@example.com",
                },
            )
        )

        call_mutation(
            client,
            "tasks.createTask",
            {
                "title": "Write relational feature",
                "userId": user_id,
            },
        )
        call_mutation(
            client,
            "tasks.createTask",
            {
                "title": "Test query operators",
                "userId": user_id,
            },
        )

        open_before = int(
            call_query(
                client,
                "tasks.countOpenTasks",
                {
                    "userId": user_id,
                },
            )
        )
        print("Open tasks before complete:", open_before)

        task_rows = list(
            call_query(
                client,
                "tasks.listTasksByUser",
                {
                    "userId": user_id,
                },
            )
            or []
        )
        print("Tasks:", task_rows)

        if task_rows:
            call_mutation(
                client,
                "tasks.completeTask",
                {
                    "taskId": str(task_rows[0].get("_id")),
                },
            )

        open_after = int(
            call_query(
                client,
                "tasks.countOpenTasks",
                {
                    "userId": user_id,
                },
            )
        )
        print("Open tasks after complete:", open_after)

        user_rows = list(call_query(client, "users.listUsers") or [])
        print("Users:", user_rows)
    finally:
        client.close()


if __name__ == "__main__":
    main()

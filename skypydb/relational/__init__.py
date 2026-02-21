"""Python bridge for calling TypeScript relational endpoints.

Example:
    from skypydb.relational import RelationalClient, ReactiveClient

    with RelationalClient(project_root=".") as client:
        client.callschemas()
        created_id = client.callmutation("users.createUser", {"name": "Ada"})
        users = client.callquery("users.listUsers")

    # Compatibility alias:
    same_client = ReactiveClient(project_root=".")
"""

from skypydb.relational.async_client import AsyncRelationalClient
from skypydb.relational.client import ReactiveClient, RelationalClient
from skypydb.relational.types import RelationalWorkerError

__all__ = [
    "RelationalClient",
    "AsyncRelationalClient",
    "ReactiveClient",
    "RelationalWorkerError",
]

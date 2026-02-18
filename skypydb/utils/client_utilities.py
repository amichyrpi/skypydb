"""Utility mixin for `VectorClient` operations."""

import time


class ClientUtilitiesMixin:
    """Expose utility helpers on `VectorClient`."""

    def reset(self) -> bool:
        """Delete all collections from the backend and clear client cache."""

        reset_method = None
        if hasattr(self._db, "reset"):
            reset_method = getattr(self._db, "reset")
        elif hasattr(self._db, "clear"):
            reset_method = getattr(self._db, "clear")

        if callable(reset_method):
            reset_method()
        else:
            for collection_info in self._db.list_collections():
                self._db.delete_collection(collection_info["name"])

        self._collections.clear()
        return True

    def heartbeat(self) -> int:
        """Return a monotonic time marker to check client liveness."""

        return int(time.time() * 1e9)

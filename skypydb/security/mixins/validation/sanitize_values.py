"""Sanitization helpers used by input validation mixins."""

from typing import Any


class SanitizeValuesMixin:
    """Provide basic sanitization for user-supplied values."""

    @staticmethod
    def sanitize_string(value: str) -> str:
        """Normalize strings by removing null bytes and coercing non-strings."""

        if not isinstance(value, str):
            return str(value)
        return value.replace("\x00", "")

def sanitize_input(value: Any) -> Any:
    """Sanitize input values using the same behavior as `SanitizeValuesMixin`."""

    if isinstance(value, str):
        return SanitizeValuesMixin.sanitize_string(value)
    return value

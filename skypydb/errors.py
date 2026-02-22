"""Custom exceptions for Skypydb."""


class SkypydbError(Exception):
    """Base exception for all Skypydb errors."""

    def code(self) -> int:
        """Return a default HTTP-aligned error code."""

        return 500

    def message(self) -> str:
        return ", ".join(self.args)

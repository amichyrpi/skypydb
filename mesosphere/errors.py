"""Custom exceptions for Mesosphere."""


class MesosphereError(Exception):
    """Base exception for all Mesosphere errors."""

    def code(self) -> int:
        """Return a default HTTP-aligned error code."""

        return 500

    def message(self) -> str:
        return ", ".join(self.args)

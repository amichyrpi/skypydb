"""
Custom exceptions for Skypydb.
"""

from abc import abstractmethod
from overrides import overrides, EnforceOverrides


class SkypydbError(Exception, EnforceOverrides):
    """Base exception for all Skypydb errors."""

    def code(self) -> int:
        """Return an base error code."""
        return 500

    def message(self) -> str:
        return ", ".join(self.args)

    @classmethod
    @abstractmethod
    def name(cls) -> str:
        """Return the error name"""
        pass


class TableNotFoundError(SkypydbError):
    @overrides
    def code(self) -> int:
        return 404

    @classmethod
    @overrides
    def name(cls) -> str:
        return "Table not found."


class TableAlreadyExistsError(SkypydbError):
    @overrides
    def code(self) -> int:
        return 502

    @classmethod
    @overrides
    def name(cls) -> str:
        return "Table already exists."


class DatabaseError(SkypydbError):
    @overrides
    def code(self) -> int:
        return 513

    @classmethod
    @overrides
    def name(cls) -> str:
        return (
            "Database operation failed. This may indicate a connectivity issue, "
            "invalid query, or transaction problem. Check database logs and configuration."
        )


class InvalidSearchError(SkypydbError):
    @overrides
    def code(self) -> int:
        return 501

    @classmethod
    @overrides
    def name(cls) -> str:
        return (
            "One or more search parameters are invalid. "
            "Check parameter names, types, and value ranges for your search query."
        )


class SecurityError(SkypydbError):
    @overrides
    def code(self) -> int:
        return 302

    @classmethod
    @overrides
    def name(cls) -> str:
        return (
            "Security operation failed. Possible authentication or authorization issue; "
            "see logs for details."
        )


class ValidationError(SkypydbError):
    @overrides
    def code(self) -> int:
        return 507

    @classmethod
    @overrides
    def name(cls) -> str:
        return "Input validation failed."


class CollectionNotFoundError(SkypydbError):
    @overrides
    def code(self) -> int:
        return 404

    @classmethod
    @overrides
    def name(cls) -> str:
        return "Collection not found."


class CollectionAlreadyExistsError(SkypydbError):
    @overrides
    def code(self) -> int:
        return 402

    @classmethod
    @overrides
    def name(cls) -> str:
        return "Collection already exists."


class EmbeddingError(SkypydbError):
    @overrides
    def code(self) -> int:
        return 503

    @classmethod
    @overrides
    def name(cls) -> str:
        return "Embedding generation failed."


class VectorSearchError(SkypydbError):
    @overrides
    def code(self) -> int:
        return 509

    @classmethod
    @overrides
    def name(cls) -> str:
        return "Vector similarity search failed."

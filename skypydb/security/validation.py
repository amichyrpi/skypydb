"""Input validation and sanitization module for Skypydb."""

from skypydb.security.internal.validation.sanitize_values import SanitizeValuesMixin
from skypydb.security.internal.validation.sql_injection_check import SQLInjectionCheckMixin
from skypydb.security.internal.validation.validate_inputs import ValidateInputsMixin
from skypydb.security.constants import (
    COLUMN_NAME_PATTERN,
    MAX_COLUMN_NAME_LENGTH,
    MAX_STRING_LENGTH,
    MAX_TABLE_NAME_LENGTH,
    SQL_INJECTION_PATTERNS,
    TABLE_NAME_PATTERN,
)


class InputValidator(ValidateInputsMixin, SQLInjectionCheckMixin, SanitizeValuesMixin):
    """Validates and sanitizes user inputs to prevent SQL injection and malformed names."""

    TABLE_NAME_PATTERN = TABLE_NAME_PATTERN
    COLUMN_NAME_PATTERN = COLUMN_NAME_PATTERN

    MAX_TABLE_NAME_LENGTH = MAX_TABLE_NAME_LENGTH
    MAX_COLUMN_NAME_LENGTH = MAX_COLUMN_NAME_LENGTH
    MAX_STRING_LENGTH = MAX_STRING_LENGTH

    SQL_INJECTION_PATTERNS = SQL_INJECTION_PATTERNS

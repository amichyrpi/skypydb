"""SQL injection pattern checks used by input validation mixins."""

import re
from skypydb.security.constants import SQL_INJECTION_PATTERNS


class SQLInjectionCheckMixin:
    """Provide helpers for detecting suspicious SQL patterns in text input."""

    @classmethod
    def _contains_sql_injection(cls, value: str) -> bool:
        """Return whether a string contains a known SQL-injection-like pattern."""

        value_upper = value.upper()
        for pattern in SQL_INJECTION_PATTERNS:
            if re.search(pattern, value_upper, re.IGNORECASE):
                return True
        return False

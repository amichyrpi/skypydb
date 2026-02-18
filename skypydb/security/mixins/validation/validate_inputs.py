"""Validation helpers for names, values, filters, and config dictionaries."""

from typing import Any, Dict, Optional
from skypydb.errors import ValidationError
from skypydb.security.mixins.validation.sanitize_values import SanitizeValuesMixin
from skypydb.security.mixins.validation.sql_injection_check import SQLInjectionCheckMixin
from skypydb.security.constants import (
    COLUMN_NAME_PATTERN,
    MAX_COLUMN_NAME_LENGTH,
    MAX_STRING_LENGTH,
    MAX_TABLE_NAME_LENGTH,
    TABLE_NAME_PATTERN,
)


class ValidateInputsMixin(SQLInjectionCheckMixin, SanitizeValuesMixin):
    """Validate user-facing identifiers and value payloads."""

    @classmethod
    def validate_table_name(cls, table_name: str) -> str:
        """Validate table/collection names used to build SQL identifiers."""

        if not table_name:
            raise ValidationError("Table name cannot be empty")
        if not isinstance(table_name, str):
            raise ValidationError("Table name must be a string")
        if len(table_name) > MAX_TABLE_NAME_LENGTH:
            raise ValidationError(
                f"Table name too long (max {MAX_TABLE_NAME_LENGTH} characters)"
            )
        if not TABLE_NAME_PATTERN.match(table_name):
            raise ValidationError(
                "Table name must start with a letter or underscore and contain only "
                "alphanumeric characters, underscores, and hyphens"
            )
        if cls._contains_sql_injection(table_name):
            raise ValidationError("Table name contains potentially dangerous characters")
        return table_name

    @classmethod
    def validate_column_name(cls, column_name: str) -> str:
        """Validate SQL column names used by filtering and schema-like payloads."""

        if not column_name:
            raise ValidationError("Column name cannot be empty")
        if not isinstance(column_name, str):
            raise ValidationError("Column name must be a string")
        if len(column_name) > MAX_COLUMN_NAME_LENGTH:
            raise ValidationError(
                f"Column name too long (max {MAX_COLUMN_NAME_LENGTH} characters)"
            )
        if not COLUMN_NAME_PATTERN.match(column_name):
            raise ValidationError(
                "Column name must start with a letter or underscore and contain only "
                "alphanumeric characters and underscores"
            )
        if cls._contains_sql_injection(column_name):
            raise ValidationError("Column name contains potentially dangerous characters")
        return column_name

    @classmethod
    def validate_string_value(cls, value: str, max_length: Optional[int] = None) -> str:
        """Validate string length constraints for text payload fields."""

        if not isinstance(value, str):
            raise ValidationError("Value must be a string")

        max_len = max_length or MAX_STRING_LENGTH
        if len(value) > max_len:
            raise ValidationError(f"String value too long (max {max_len} characters)")
        return value

    @classmethod
    def validate_data_dict(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate a data dictionary and sanitize unsafe string values."""

        if not isinstance(data, dict):
            raise ValidationError("Data must be a dictionary")

        validated_data = {}
        for key, value in data.items():
            validated_key = cls.validate_column_name(key)
            if isinstance(value, str):
                validated_value = cls.sanitize_string(value)
            elif isinstance(value, (int, float, bool)):
                validated_value = value
            elif value is None:
                validated_value = None
            else:
                validated_value = cls.sanitize_string(str(value))

            validated_data[validated_key] = validated_value
        return validated_data

    @classmethod
    def validate_filter_dict(cls, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Validate filter dictionaries used by get/query/delete operations."""

        if not isinstance(filters, dict):
            raise ValidationError("Filters must be a dictionary")

        validated_filters = {}
        for key, value in filters.items():
            validated_key = cls.validate_column_name(key)
            if isinstance(value, list):
                validated_value = [
                    cls.sanitize_string(str(v))
                    if not isinstance(v, (int, float, bool, type(None)))
                    else v
                    for v in value
                ]
            elif isinstance(value, str):
                validated_value = cls.sanitize_string(value)
            elif isinstance(value, (int, float, bool)):
                validated_value = value
            elif value is None:
                validated_value = None
            else:
                validated_value = cls.sanitize_string(str(value))

            validated_filters[validated_key] = validated_value
        return validated_filters

    @classmethod
    def validate_config(cls, config: Dict[str, Any]) -> Dict[str, Any]:
        """Validate generic config dictionaries containing table/column type mappings."""

        if not isinstance(config, dict):
            raise ValidationError("Configuration must be a dictionary")

        validated_config = {}
        for table_name, table_config in config.items():
            validated_table_name = cls.validate_table_name(table_name)
            if not isinstance(table_config, dict):
                raise ValidationError(
                    f"Configuration for table '{table_name}' must be a dictionary"
                )
            validated_table_config = {}
            for column_name, column_type in table_config.items():
                validated_column_name = cls.validate_column_name(column_name)
                valid_types = [str, int, float, bool, "str", "int", "float", "bool", "auto"]
                if column_type not in valid_types:
                    raise ValidationError(
                        f"Invalid type for column '{column_name}': {column_type}. "
                        f"Valid types are: {valid_types}"
                    )
                validated_table_config[validated_column_name] = column_type

            validated_config[validated_table_name] = validated_table_config
        return validated_config

def validate_table_name(table_name: str) -> str:
    """Convenience wrapper for validating table/collection names."""

    return ValidateInputsMixin.validate_table_name(table_name)

def validate_column_name(column_name: str) -> str:
    """Convenience wrapper for validating column names."""

    return ValidateInputsMixin.validate_column_name(column_name)

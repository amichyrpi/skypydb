import { ValidationError } from "../../../errors";
import {
  COLUMN_NAME_PATTERN,
  MAX_COLUMN_NAME_LENGTH,
  MAX_STRING_LENGTH,
  MAX_TABLE_NAME_LENGTH,
  TABLE_NAME_PATTERN,
} from "../../../security/constants";
import { SanitizeValuesMixin } from "./sanitize_values";
import { SQLInjectionCheckMixin } from "./sql_injection_check";

export class ValidateInputsMixin extends SQLInjectionCheckMixin {
  static validate_table_name(table_name: string): string {
    if (!table_name) {
      throw new ValidationError("Table name cannot be empty");
    }
    if (typeof table_name !== "string") {
      throw new ValidationError("Table name must be a string");
    }
    if (table_name.length > MAX_TABLE_NAME_LENGTH) {
      throw new ValidationError(
        `Table name too long (max ${MAX_TABLE_NAME_LENGTH} characters)`,
      );
    }
    if (!TABLE_NAME_PATTERN.test(table_name)) {
      throw new ValidationError(
        "Table name must start with a letter or underscore and contain only alphanumeric characters, underscores, and hyphens",
      );
    }
    if (this._contains_sql_injection(table_name)) {
      throw new ValidationError(
        "Table name contains potentially dangerous characters",
      );
    }
    return table_name;
  }

  static validate_column_name(column_name: string): string {
    if (!column_name) {
      throw new ValidationError("Column name cannot be empty");
    }
    if (typeof column_name !== "string") {
      throw new ValidationError("Column name must be a string");
    }
    if (column_name.length > MAX_COLUMN_NAME_LENGTH) {
      throw new ValidationError(
        `Column name too long (max ${MAX_COLUMN_NAME_LENGTH} characters)`,
      );
    }
    if (!COLUMN_NAME_PATTERN.test(column_name)) {
      throw new ValidationError(
        "Column name must start with a letter or underscore and contain only alphanumeric characters and underscores",
      );
    }
    if (this._contains_sql_injection(column_name)) {
      throw new ValidationError(
        "Column name contains potentially dangerous characters",
      );
    }
    return column_name;
  }

  static validate_string_value(value: string, max_length?: number): string {
    if (typeof value !== "string") {
      throw new ValidationError("Value must be a string");
    }
    const max_len = max_length ?? MAX_STRING_LENGTH;
    if (value.length > max_len) {
      throw new ValidationError(
        `String value too long (max ${max_len} characters)`,
      );
    }
    return value;
  }

  static validate_data_dict(
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      throw new ValidationError("Data must be a dictionary");
    }

    const validated: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const valid_key = this.validate_column_name(key);
      if (typeof value === "string") {
        validated[valid_key] = SanitizeValuesMixin.sanitize_string(value);
      } else if (
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        validated[valid_key] = value;
      } else {
        validated[valid_key] = SanitizeValuesMixin.sanitize_string(
          String(value),
        );
      }
    }
    return validated;
  }

  static validate_filter_dict(
    filters: Record<string, unknown>,
  ): Record<string, unknown> {
    if (
      typeof filters !== "object" ||
      filters === null ||
      Array.isArray(filters)
    ) {
      throw new ValidationError("Filters must be a dictionary");
    }

    const validated: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(filters)) {
      const valid_key = this.validate_column_name(key);
      if (Array.isArray(value)) {
        validated[valid_key] = value.map((item) => {
          if (
            typeof item === "number" ||
            typeof item === "boolean" ||
            item === null
          ) {
            return item;
          }
          return SanitizeValuesMixin.sanitize_string(String(item));
        });
      } else if (typeof value === "string") {
        validated[valid_key] = SanitizeValuesMixin.sanitize_string(value);
      } else if (
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        validated[valid_key] = value;
      } else {
        validated[valid_key] = SanitizeValuesMixin.sanitize_string(
          String(value),
        );
      }
    }
    return validated;
  }

  static validate_config(
    config: Record<string, unknown>,
  ): Record<string, unknown> {
    if (
      typeof config !== "object" ||
      config === null ||
      Array.isArray(config)
    ) {
      throw new ValidationError("Configuration must be a dictionary");
    }

    const validated: Record<string, unknown> = {};
    for (const [table_name, table_config] of Object.entries(config)) {
      const valid_table_name = this.validate_table_name(table_name);
      if (
        typeof table_config !== "object" ||
        table_config === null ||
        Array.isArray(table_config)
      ) {
        throw new ValidationError(
          `Configuration for table '${table_name}' must be a dictionary`,
        );
      }
      const validated_table_config: Record<string, unknown> = {};
      for (const [column_name, column_type] of Object.entries(table_config)) {
        const valid_column_name = this.validate_column_name(column_name);
        const valid_types: Array<unknown> = [
          String,
          Number,
          Boolean,
          "str",
          "int",
          "float",
          "bool",
          "auto",
        ];
        if (!valid_types.includes(column_type)) {
          throw new ValidationError(
            `Invalid type for column '${column_name}': ${String(column_type)}. Valid types are: ${valid_types.join(", ")}`,
          );
        }
        validated_table_config[valid_column_name] = column_type;
      }
      validated[valid_table_name] = validated_table_config;
    }
    return validated;
  }
}

export function validate_table_name(table_name: string): string {
  return ValidateInputsMixin.validate_table_name(table_name);
}

export function validate_column_name(column_name: string): string {
  return ValidateInputsMixin.validate_column_name(column_name);
}

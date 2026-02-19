import { InputValidator } from "../security/validation";
import type {
  BooleanValueDefinition,
  IdValueDefinition,
  NumberValueDefinition,
  ObjectValueDefinition,
  OptionalValueDefinition,
  StringValueDefinition,
  ValueDefinition
} from "../relational/types";

function string_value(): StringValueDefinition {
  return { kind: "string" };
}

function number_value(): NumberValueDefinition {
  return { kind: "number" };
}

function boolean_value(): BooleanValueDefinition {
  return { kind: "boolean" };
}

function id_value(table_name: string): IdValueDefinition {
  return {
    kind: "id",
    table: InputValidator.validate_table_name(table_name)
  };
}

function object_value(shape: Record<string, ValueDefinition>): ObjectValueDefinition {
  if (typeof shape !== "object" || shape === null || Array.isArray(shape)) {
    throw new TypeError("value.object requires a shape object.");
  }
  return {
    kind: "object",
    shape
  };
}

function optional_value(inner: ValueDefinition): OptionalValueDefinition {
  return {
    kind: "optional",
    inner
  };
}

export const value = {
  string: string_value,
  number: number_value,
  boolean: boolean_value,
  id: id_value,
  object: object_value,
  optional: optional_value
};

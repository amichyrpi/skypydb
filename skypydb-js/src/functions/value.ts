import type { SchemaFieldDefinition } from "../types";

function field(type: SchemaFieldDefinition["type"]): SchemaFieldDefinition {
  return { type };
}

export const value = {
  string(): SchemaFieldDefinition {
    return field("string");
  },

  number(): SchemaFieldDefinition {
    return field("number");
  },

  boolean(): SchemaFieldDefinition {
    return field("boolean");
  },

  id(table: string): SchemaFieldDefinition {
    return {
      type: "id",
      table,
    };
  },

  object(shape: Record<string, SchemaFieldDefinition>): SchemaFieldDefinition {
    return {
      type: "object",
      shape,
    };
  },

  optional(inner: SchemaFieldDefinition): SchemaFieldDefinition {
    return {
      type: "optional",
      inner,
    };
  },
};
